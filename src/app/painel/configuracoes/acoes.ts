'use server'

import { revalidatePath } from 'next/cache'
import { esquemaOrganizacao, errosPorCampo } from '@/dominio/validacao'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoConfiguracoes {
  erro?: string
  sucesso?: boolean
}

/**
 * Cada cartão de configuração salva o seu próprio campo — o formulário diz
 * qual através do campo oculto `campo`.
 */
export async function salvarConfiguracao(
  _anterior: EstadoConfiguracoes,
  dados: FormData,
): Promise<EstadoConfiguracoes> {
  const sessao = await exigirSessao()
  const campo = String(dados.get('campo') ?? '')

  let mudanca: { name: string } | { whatsapp: string | null }
  if (campo === 'nome') {
    const resultado = esquemaOrganizacao.pick({ nome: true }).safeParse({
      nome: dados.get('nome'),
    })
    if (!resultado.success) {
      return { erro: errosPorCampo(resultado.error).nome ?? 'Nome inválido.' }
    }
    mudanca = { name: resultado.data.nome }
  } else if (campo === 'whatsapp') {
    const resultado = esquemaOrganizacao.pick({ whatsapp: true }).safeParse({
      whatsapp: dados.get('whatsapp') ?? '',
    })
    if (!resultado.success) {
      return { erro: errosPorCampo(resultado.error).whatsapp ?? 'Número inválido.' }
    }
    mudanca = { whatsapp: resultado.data.whatsapp ?? null }
  } else {
    return { erro: 'Configuração desconhecida.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase
    .from('organizations')
    .update(mudanca)
    .eq('id', sessao.organizacaoId)

  if (error !== null) {
    return { erro: 'Não foi possível salvar. Tente novamente.' }
  }

  revalidatePath('/painel/configuracoes')
  revalidatePath('/catalogo')
  return { sucesso: true }
}
