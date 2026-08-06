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

export async function arquivarFormaDePagamento(dados: FormData): Promise<void> {
  await exigirSessao()
  const id = dados.get('id')
  if (typeof id !== 'string' || id === '') {
    return
  }
  const supabase = await criarClienteServidor()
  await supabase
    .from('payment_methods')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/painel/cadastros')
  revalidatePath('/painel/vendas/nova')
}
