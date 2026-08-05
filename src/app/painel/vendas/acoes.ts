'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoAcaoVenda {
  erro?: string
}

interface ItemManual {
  produto_id: string
  quantidade: number
}

function lerItens(dados: FormData): ItemManual[] | null {
  const bruto = dados.get('itens')
  if (typeof bruto !== 'string') {
    return null
  }
  try {
    const lista: unknown = JSON.parse(bruto)
    if (!Array.isArray(lista) || lista.length === 0 || lista.length > 50) {
      return null
    }
    const itens: ItemManual[] = []
    for (const entrada of lista) {
      const item = entrada as { produtoId?: unknown; quantidade?: unknown }
      if (
        typeof item.produtoId !== 'string' ||
        typeof item.quantidade !== 'number' ||
        !Number.isInteger(item.quantidade) ||
        item.quantidade < 1 ||
        item.quantidade > 999
      ) {
        return null
      }
      itens.push({ produto_id: item.produtoId, quantidade: item.quantidade })
    }
    return itens
  } catch {
    return null
  }
}

export async function criarVendaManual(
  _anterior: EstadoAcaoVenda,
  dados: FormData,
): Promise<EstadoAcaoVenda> {
  const sessao = await exigirSessao()

  const clienteId = String(dados.get('clienteId') ?? '')
  const condicao = String(dados.get('condicao') ?? '')
  const vencimento = String(dados.get('vencimento') ?? '')
  const observacao = String(dados.get('observacao') ?? '').trim()
  const itens = lerItens(dados)

  if (clienteId === '') {
    return { erro: 'Escolha o cliente da venda.' }
  }
  if (itens === null) {
    return { erro: 'Adicione pelo menos um produto com quantidade válida.' }
  }
  if (!['a_vista', 'a_prazo'].includes(condicao)) {
    return { erro: 'Escolha a condição de pagamento.' }
  }
  if (condicao === 'a_prazo' && vencimento === '') {
    return { erro: 'Venda a prazo precisa da data de vencimento.' }
  }

  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('criar_venda_manual', {
    p_organization: sessao.organizacaoId,
    p_customer: clienteId,
    p_items: itens,
    p_condicao: condicao,
    p_vencimento: condicao === 'a_prazo' ? vencimento : null,
    p_note: observacao === '' ? null : observacao,
  })

  if (error !== null) {
    return { erro: mensagemDoBanco(error.message) }
  }

  revalidatePath('/painel/vendas')
  redirect(`/painel/vendas/${String(data)}`)
}

export async function confirmarVenda(
  _anterior: EstadoAcaoVenda,
  dados: FormData,
): Promise<EstadoAcaoVenda> {
  await exigirSessao()

  const vendaId = String(dados.get('vendaId') ?? '')
  const condicao = String(dados.get('condicao') ?? '')
  const vencimento = String(dados.get('vencimento') ?? '')

  if (vendaId === '' || !['a_vista', 'a_prazo'].includes(condicao)) {
    return { erro: 'Escolha a condição de pagamento.' }
  }
  if (condicao === 'a_prazo' && vencimento === '') {
    return { erro: 'Venda a prazo precisa da data de vencimento.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('confirmar_venda', {
    p_venda: vendaId,
    p_condicao: condicao,
    p_vencimento: condicao === 'a_prazo' ? vencimento : null,
  })

  if (error !== null) {
    return { erro: mensagemDoBanco(error.message) }
  }

  revalidatePath(`/painel/vendas/${vendaId}`)
  revalidatePath('/painel/vendas')
  return {}
}

export async function entregarVenda(
  _anterior: EstadoAcaoVenda,
  dados: FormData,
): Promise<EstadoAcaoVenda> {
  await exigirSessao()
  const vendaId = String(dados.get('vendaId') ?? '')
  if (vendaId === '') {
    return { erro: 'Venda inválida.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('entregar_venda', { p_venda: vendaId })
  if (error !== null) {
    return { erro: mensagemDoBanco(error.message) }
  }

  revalidatePath(`/painel/vendas/${vendaId}`)
  revalidatePath('/painel/vendas')
  return {}
}

export async function cancelarVenda(
  _anterior: EstadoAcaoVenda,
  dados: FormData,
): Promise<EstadoAcaoVenda> {
  await exigirSessao()
  const vendaId = String(dados.get('vendaId') ?? '')
  const motivo = String(dados.get('motivo') ?? '').trim()
  if (vendaId === '') {
    return { erro: 'Venda inválida.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('cancelar_venda', {
    p_venda: vendaId,
    p_motivo: motivo === '' ? null : motivo,
  })
  if (error !== null) {
    return { erro: mensagemDoBanco(error.message) }
  }

  revalidatePath(`/painel/vendas/${vendaId}`)
  revalidatePath('/painel/vendas')
  return {}
}

/**
 * As funções do banco falham com mensagens escritas para gente. Erros
 * inesperados viram uma frase genérica, sem vazar detalhe técnico.
 */
function mensagemDoBanco(mensagem: string): string {
  const conhecidas = [
    'Estoque insuficiente',
    'Há recebimento registrado',
    'A venda não tem itens',
    'Só uma venda aguardando confirmação',
    'Cliente não encontrado',
    'Produto indisponível',
    'Transição de venda inválida',
    'Venda não encontrada',
    'Venda a prazo exige data de vencimento',
  ]
  for (const prefixo of conhecidas) {
    if (mensagem.includes(prefixo)) {
      return mensagem
    }
  }
  return 'Não foi possível concluir. Tente novamente.'
}
