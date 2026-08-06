'use server'

import { revalidatePath } from 'next/cache'
import { esquemaOrganizacao, errosPorCampo } from '@/dominio/validacao'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoConfiguracoes {
  erros?: Record<string, string>
  sucesso?: boolean
}

export async function salvarConfiguracoes(
  _anterior: EstadoConfiguracoes,
  dados: FormData,
): Promise<EstadoConfiguracoes> {
  const sessao = await exigirSessao()

  const resultado = esquemaOrganizacao.safeParse({
    nome: dados.get('nome'),
    whatsapp: dados.get('whatsapp') ?? '',
  })
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error) }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase
    .from('organizations')
    .update({
      name: resultado.data.nome,
      whatsapp: resultado.data.whatsapp ?? null,
    })
    .eq('id', sessao.organizacaoId)

  if (error !== null) {
    return { erros: { geral: 'Não foi possível salvar as configurações.' } }
  }

  revalidatePath('/painel/configuracoes')
  revalidatePath('/catalogo')
  return { sucesso: true }
}
