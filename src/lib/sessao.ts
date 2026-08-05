import { redirect } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface Sessao {
  usuarioId: string
  organizacaoId: string
}

/**
 * Garante sessão autenticada com vínculo a uma Organização. Sem vínculo não
 * há dados visíveis, então a resposta honesta é encerrar a sessão.
 */
export async function exigirSessao(): Promise<Sessao> {
  const supabase = await criarClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user === null) {
    redirect('/entrar')
  }

  const { data } = await supabase.from('members').select('organization_id').limit(1)
  const vinculo = (data ?? [])[0] as { organization_id: string } | undefined
  if (vinculo === undefined) {
    await supabase.auth.signOut()
    redirect('/entrar?erro=sem-vinculo')
  }

  return { usuarioId: user.id, organizacaoId: vinculo.organization_id }
}
