'use server'

import { revalidatePath } from 'next/cache'
import { converterParaCentavos } from '@/dominio/dinheiro'
import { esquemaDespesa, errosPorCampo } from '@/dominio/validacao'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoRecebimento {
  erro?: string
}

export async function registrarRecebimento(
  _anterior: EstadoRecebimento,
  dados: FormData,
): Promise<EstadoRecebimento> {
  await exigirSessao()

  const contaId = String(dados.get('contaId') ?? '')
  const valorCentavos = converterParaCentavos(String(dados.get('valor') ?? ''))

  if (contaId === '') {
    return { erro: 'Conta inválida.' }
  }
  if (valorCentavos === null || valorCentavos === 0) {
    return { erro: 'Informe um valor válido, ex.: 150,00.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('registrar_recebimento', {
    p_conta: contaId,
    p_valor_centavos: valorCentavos,
  })

  if (error !== null) {
    if (error.message.includes('excede')) {
      return { erro: 'O valor excede o saldo em aberto.' }
    }
    return { erro: 'Não foi possível registrar o recebimento.' }
  }

  revalidatePath('/painel/financeiro')
  return {}
}

export interface EstadoDespesa {
  erros?: Record<string, string>
}

export async function salvarDespesa(
  _anterior: EstadoDespesa,
  dados: FormData,
): Promise<EstadoDespesa> {
  const sessao = await exigirSessao()

  const valorCentavos = converterParaCentavos(String(dados.get('valor') ?? ''))
  if (valorCentavos === null || valorCentavos === 0) {
    return { erros: { valor: 'Informe um valor válido, ex.: 85,50.' } }
  }

  const resultado = esquemaDespesa.safeParse({
    categoria: dados.get('categoria'),
    descricao: dados.get('descricao') ?? '',
    valorCentavos,
    data: dados.get('data'),
    cidade: dados.get('cidade') ?? '',
    uf: dados.get('uf') ?? '',
    situacao: dados.get('situacao'),
  })
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error) }
  }

  const despesa = resultado.data
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from('expenses').insert({
    organization_id: sessao.organizacaoId,
    category: despesa.categoria,
    description:
      despesa.descricao === '' || despesa.descricao === undefined ? null : despesa.descricao,
    amount_cents: despesa.valorCentavos,
    expense_date: despesa.data,
    city: despesa.cidade === '' || despesa.cidade === undefined ? null : despesa.cidade,
    state: despesa.uf ?? null,
    status: despesa.situacao,
  })

  if (error !== null) {
    return { erros: { geral: 'Não foi possível salvar a despesa.' } }
  }

  revalidatePath('/painel/financeiro')
  return {}
}

export async function marcarDespesaPaga(dados: FormData): Promise<void> {
  await exigirSessao()
  const id = dados.get('id')
  if (typeof id !== 'string' || id === '') {
    return
  }
  const supabase = await criarClienteServidor()
  await supabase.from('expenses').update({ status: 'pago' }).eq('id', id)
  revalidatePath('/painel/financeiro')
}

export async function excluirDespesa(dados: FormData): Promise<void> {
  await exigirSessao()
  const id = dados.get('id')
  if (typeof id !== 'string' || id === '') {
    return
  }
  const supabase = await criarClienteServidor()
  await supabase.from('expenses').delete().eq('id', id)
  revalidatePath('/painel/financeiro')
}
