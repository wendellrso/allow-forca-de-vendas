'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { converterParaCentavos } from '@/dominio/dinheiro'
import { esquemaProduto, errosPorCampo } from '@/dominio/validacao'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { enviarImagemDeProduto, removerImagemDeProduto } from '@/servidor/imagens'

export interface EstadoFormularioProduto {
  erros?: Record<string, string>
}

export async function salvarProduto(
  _anterior: EstadoFormularioProduto,
  dados: FormData,
): Promise<EstadoFormularioProduto> {
  const sessao = await exigirSessao()

  const precoCentavos = converterParaCentavos(String(dados.get('preco') ?? ''))
  if (precoCentavos === null) {
    return { erros: { preco: 'Informe um preço válido, ex.: 49,90.' } }
  }

  const estoqueMinimoTexto = String(dados.get('estoqueMinimo') ?? '').trim()
  const estoqueMinimo = estoqueMinimoTexto === '' ? undefined : Number(estoqueMinimoTexto)

  const resultado = esquemaProduto.safeParse({
    nome: dados.get('nome'),
    descricao: dados.get('descricao') ?? '',
    precoCentavos,
    unidade: dados.get('unidade') ?? 'un',
    ncm: dados.get('ncm') ?? '',
    estoqueMinimo,
    ativo: dados.get('ativo') === 'on',
  })
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error) }
  }

  // Foto: o navegador envia um JPEG já redimensionado como data URL.
  const imagemDataUrl = String(dados.get('imagemDataUrl') ?? '')
  const imagemAtual = String(dados.get('imagemAtual') ?? '')
  const removerImagem = dados.get('removerImagem') === 'on'

  let novaImagem: string | null | undefined
  if (removerImagem) {
    novaImagem = null
  }
  if (imagemDataUrl !== '') {
    const enviada = await enviarImagemDeProduto(imagemDataUrl)
    if (enviada === null) {
      return { erros: { imagem: 'Não foi possível enviar a foto. Tente outra imagem.' } }
    }
    novaImagem = enviada
  }

  const produto = resultado.data
  const linha = {
    name: produto.nome,
    description:
      produto.descricao === '' || produto.descricao === undefined ? null : produto.descricao,
    price_cents: produto.precoCentavos,
    unit: produto.unidade,
    ncm: produto.ncm === '' || produto.ncm === undefined ? null : produto.ncm,
    min_stock: produto.estoqueMinimo ?? null,
    active: produto.ativo,
    ...(novaImagem !== undefined ? { image_url: novaImagem } : {}),
  }

  const supabase = await criarClienteServidor()
  const id = dados.get('id')

  const { error } =
    typeof id === 'string' && id !== ''
      ? await supabase.from('products').update(linha).eq('id', id)
      : await supabase.from('products').insert({ ...linha, organization_id: sessao.organizacaoId })

  if (error !== null) {
    return { erros: { geral: 'Não foi possível salvar. Tente novamente.' } }
  }

  // A foto substituída ou removida sai do Storage; falha aqui não desfaz o
  // salvamento — objeto órfão é lixo, não defeito.
  if (novaImagem !== undefined && imagemAtual !== '' && imagemAtual !== novaImagem) {
    await removerImagemDeProduto(imagemAtual)
  }

  revalidatePath('/painel/produtos')
  revalidatePath('/catalogo')
  redirect('/painel/produtos')
}

export interface EstadoMovimento {
  erro?: string
  sucesso?: string
}

export async function movimentarEstoque(
  _anterior: EstadoMovimento,
  dados: FormData,
): Promise<EstadoMovimento> {
  const sessao = await exigirSessao()

  const produtoId = String(dados.get('produtoId') ?? '')
  const tipo = String(dados.get('tipo') ?? '')
  const quantidade = Number(String(dados.get('quantidade') ?? ''))
  const motivo = String(dados.get('motivo') ?? '').trim()

  if (produtoId === '' || !['entrada', 'ajuste'].includes(tipo)) {
    return { erro: 'Movimento inválido.' }
  }
  if (!Number.isInteger(quantidade) || quantidade === 0 || Math.abs(quantidade) > 100_000) {
    return { erro: 'Informe uma quantidade inteira diferente de zero.' }
  }
  if (tipo === 'entrada' && quantidade < 0) {
    return { erro: 'Entrada precisa de quantidade positiva. Para corrigir, use o ajuste.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.from('stock_movements').insert({
    organization_id: sessao.organizacaoId,
    product_id: produtoId,
    delta: quantidade,
    kind: tipo,
    reason: motivo === '' ? null : motivo,
    created_by: sessao.usuarioId,
  })

  if (error !== null) {
    if (error.message.includes('stock_quantity')) {
      return { erro: 'O ajuste deixaria o estoque negativo.' }
    }
    return { erro: 'Não foi possível registrar o movimento.' }
  }

  revalidatePath(`/painel/produtos/${produtoId}`)
  return { sucesso: 'Movimento registrado.' }
}
