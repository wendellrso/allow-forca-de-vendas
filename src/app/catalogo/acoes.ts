'use server'

import { esquemaPedidoCatalogo, errosPorCampo } from '@/dominio/validacao'
import { montarLinkWhatsApp, montarMensagemPedido } from '@/dominio/whatsapp'
import { whatsappDaVendedora } from '@/lib/env'
import { criarClienteAdministrativo } from '@/lib/supabase/admin'
import { type Produto } from '@/lib/tipos'

export interface EstadoPedido {
  erros?: Record<string, string>
  urlWhatsApp?: string
}

interface ItemRecebido {
  produtoId: string
  quantidade: number
}

/**
 * Fecha o pedido do catálogo: registra a venda como "aguardando confirmação"
 * e devolve o link do WhatsApp com o resumo. Roda com o cliente
 * administrativo porque o catálogo não tem sessão — toda validação acontece
 * aqui e nas funções do banco.
 */
export async function fecharPedido(
  _anterior: EstadoPedido,
  dados: FormData,
): Promise<EstadoPedido> {
  let itens: ItemRecebido[]
  try {
    const bruto: unknown = JSON.parse(String(dados.get('itens') ?? '[]'))
    itens = Array.isArray(bruto) ? (bruto as ItemRecebido[]) : []
  } catch {
    return { erros: { geral: 'Pedido inválido. Recarregue a página.' } }
  }

  const resultado = esquemaPedidoCatalogo.safeParse({
    nomeCliente: dados.get('nome'),
    telefone: dados.get('telefone'),
    cidade: dados.get('cidade'),
    uf: dados.get('uf'),
    observacao: dados.get('observacao') ?? '',
    itens,
  })
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error) }
  }
  const pedido = resultado.data

  const supabase = criarClienteAdministrativo()

  const { data: organizacoes } = await supabase
    .from('organizations')
    .select('id, whatsapp')
    .limit(2)
  const organizacao = (organizacoes ?? [])[0] as { id: string; whatsapp: string | null } | undefined
  if (organizacao === undefined || (organizacoes ?? []).length > 1) {
    return { erros: { geral: 'O catálogo está indisponível no momento.' } }
  }

  const idsProdutos = pedido.itens.map((item) => item.produtoId)
  const { data: linhasProdutos } = await supabase
    .from('products')
    .select('id, name, price_cents, active')
    .in('id', idsProdutos)
    .eq('organization_id', organizacao.id)
  const produtos = (linhasProdutos ?? []) as Pick<
    Produto,
    'id' | 'name' | 'price_cents' | 'active'
  >[]

  if (produtos.length !== idsProdutos.length || produtos.some((produto) => !produto.active)) {
    return { erros: { geral: 'Um dos produtos não está mais disponível. Atualize a página.' } }
  }

  const { error } = await supabase.rpc('criar_pedido_catalogo', {
    p_organization: organizacao.id,
    p_customer_name: pedido.nomeCliente,
    p_customer_phone: pedido.telefone,
    p_city: pedido.cidade,
    p_state: pedido.uf,
    p_items: pedido.itens.map((item) => ({
      produto_id: item.produtoId,
      quantidade: item.quantidade,
    })),
    p_note: pedido.observacao === '' || pedido.observacao === undefined ? null : pedido.observacao,
  })
  if (error !== null) {
    return { erros: { geral: 'Não foi possível registrar o pedido. Tente novamente.' } }
  }

  const itensDaMensagem = pedido.itens.map((item) => {
    const produto = produtos.find((linha) => linha.id === item.produtoId)
    return {
      nome: produto?.name ?? 'Produto',
      quantidade: item.quantidade,
      precoUnitarioCentavos: produto?.price_cents ?? 0,
    }
  })
  const totalCentavos = itensDaMensagem.reduce(
    (soma, item) => soma + item.quantidade * item.precoUnitarioCentavos,
    0,
  )

  const mensagem = montarMensagemPedido({
    nomeCliente: pedido.nomeCliente,
    cidade: pedido.cidade,
    uf: pedido.uf,
    itens: itensDaMensagem,
    totalCentavos,
    observacao: pedido.observacao,
  })
  const numeroDaVendedora = organizacao.whatsapp ?? whatsappDaVendedora()
  if (numeroDaVendedora === null) {
    return {
      erros: { geral: 'O catálogo está com o WhatsApp mal configurado. Avise a vendedora.' },
    }
  }
  const url = montarLinkWhatsApp(numeroDaVendedora, mensagem)
  if (url === null) {
    return {
      erros: { geral: 'O catálogo está com o WhatsApp mal configurado. Avise a vendedora.' },
    }
  }

  return { urlWhatsApp: url }
}
