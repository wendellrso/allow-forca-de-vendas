import { createClient } from '@supabase/supabase-js'
import { ambienteServidor } from '@/lib/env'

/**
 * Cliente administrativo, exclusivo do servidor. Ignora as políticas de
 * acesso e por isso só atende o catálogo público, onde não existe sessão.
 * Nenhum componente visual importa este módulo — há regra de lint para isso.
 */
export function criarClienteAdministrativo() {
  if (typeof window !== 'undefined') {
    throw new Error('O cliente administrativo nunca alcança o navegador.')
  }
  const env = ambienteServidor()

  return createClient(env.url, env.chaveServico, {
    db: { schema: 'app' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
