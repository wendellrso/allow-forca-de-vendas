import { createServerClient } from '@supabase/ssr'
import { type NextRequest, type NextResponse } from 'next/server'
import { ambientePublico } from '@/lib/env'

/** Cliente usado exclusivamente pelo middleware para renovar a sessão. */
export function criarClienteMiddleware(request: NextRequest, response: NextResponse) {
  const env = ambientePublico()

  return createServerClient(env.url, env.chaveAnonima, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        }
      },
    },
  })
}
