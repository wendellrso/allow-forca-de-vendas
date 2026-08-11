'use server'

import { revalidatePath } from 'next/cache'
import { esquemaFormaDePagamento, errosPorCampo } from '@/dominio/validacao'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoItemDeCadastro {
  erro?: string
  criadaId?: string
}

export async function criarFormaDePagamento(
  _anterior: EstadoItemDeCadastro,
  dados: FormData,
): Promise<EstadoItemDeCadastro> {
  const sessao = await exigirSessao()

  const resultado = esquemaFormaDePagamento.safeParse({ nome: dados.get('nome') })
  if (!resultado.success) {
    return { erro: errosPorCampo(resultado.error).nome ?? 'Nome inválido.' }
  }

  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({ organization_id: sessao.organizacaoId, name: resultado.data.nome })
    .select('id')
    .single()

  if (error !== null) {
    if (error.code === '23505') {
      return { erro: 'Já existe uma forma de pagamento com este nome.' }
    }
    return { erro: 'Não foi possível criar a forma de pagamento.' }
  }

  revalidatePath('/painel/cadastros')
  revalidatePath('/painel/vendas/nova')
  return { criadaId: (data as { id: string }).id }
}

export interface EstadoConfiguracaoDaForma {
  erro?: string
  sucesso?: boolean
}

const TIPOS_VALIDOS = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'outro']

/**
 * Configuração que sustenta a automação de pagamento: tipo da forma e
 * parâmetros de parcelamento usados pela Nova venda e pela confirmação.
 */
export async function salvarConfiguracaoDaForma(
  _anterior: EstadoConfiguracaoDaForma,
  dados: FormData,
): Promise<EstadoConfiguracaoDaForma> {
  await exigirSessao()

  const id = String(dados.get('id') ?? '')
  const tipo = String(dados.get('tipo') ?? '')
  const permiteParcelas = dados.get('permiteParcelas') === 'on'
  const maximoParcelas = Number(String(dados.get('maximoParcelas') ?? '1'))
  const diasPrimeiroVencimento = Number(String(dados.get('diasPrimeiroVencimento') ?? '30'))
  const intervaloDias = Number(String(dados.get('intervaloDias') ?? '30'))

  if (id === '' || !TIPOS_VALIDOS.includes(tipo)) {
    return { erro: 'Configuração inválida.' }
  }
  if (!Number.isInteger(maximoParcelas) || maximoParcelas < 1 || maximoParcelas > 24) {
    return { erro: 'O máximo de parcelas precisa estar entre 1 e 24.' }
  }
  if (
    !Number.isInteger(diasPrimeiroVencimento) ||
    diasPrimeiroVencimento < 0 ||
    diasPrimeiroVencimento > 90
  ) {
    return { erro: 'Os dias para o 1º vencimento precisam estar entre 0 e 90.' }
  }
  if (!Number.isInteger(intervaloDias) || intervaloDias < 7 || intervaloDias > 60) {
    return { erro: 'O intervalo entre parcelas precisa estar entre 7 e 60 dias.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase
    .from('payment_methods')
    .update({
      kind: tipo,
      allows_installments: permiteParcelas,
      max_installments: permiteParcelas ? maximoParcelas : 1,
      first_due_days: diasPrimeiroVencimento,
      installment_interval_days: intervaloDias,
    })
    .eq('id', id)

  if (error !== null) {
    return { erro: 'Não foi possível salvar a configuração.' }
  }

  revalidatePath('/painel/cadastros/formas')
  revalidatePath('/painel/vendas/nova')
  return { sucesso: true }
}

export async function arquivarFormaDePagamento(dados: FormData): Promise<void> {
  await definirArquivamentoDaForma(dados, new Date().toISOString())
}

/** Arquivar não pode ser sem volta: a forma volta às novas vendas. */
export async function restaurarFormaDePagamento(dados: FormData): Promise<void> {
  await definirArquivamentoDaForma(dados, null)
}

async function definirArquivamentoDaForma(
  dados: FormData,
  arquivadaEm: string | null,
): Promise<void> {
  await exigirSessao()
  const id = dados.get('id')
  if (typeof id !== 'string' || id === '') {
    return
  }
  const supabase = await criarClienteServidor()
  await supabase.from('payment_methods').update({ archived_at: arquivadaEm }).eq('id', id)
  revalidatePath('/painel/cadastros')
  revalidatePath('/painel/cadastros/formas')
  revalidatePath('/painel/vendas/nova')
}
