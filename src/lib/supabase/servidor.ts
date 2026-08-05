import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ambientePublico } from '@/lib/env'

/**
 * Cliente do servidor vinculado à sessão de quem fez a requisição. As
 * consultas ficam sujeitas às políticas de acesso do banco, mantendo o
 * isolamento por Organização mesmo diante de um erro na aplicação.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies()
  const env = ambientePublico()

  return createServerClient(env.url, env.chaveAnonima, {
    db: { schema: 'app' },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components não escrevem cookies; a renovação da sessão
          // acontece no middleware, então ignorar aqui é seguro.
        }
      },
    },
  })
}
