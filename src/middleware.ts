import { NextResponse, type NextRequest } from 'next/server'
import { criarClienteMiddleware } from '@/lib/supabase/middleware'

/**
 * O middleware mantém a sessão viva e decide apenas redirecionamento.
 * Autorização de verdade acontece no servidor, junto das políticas do banco.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = criarClienteMiddleware(request, response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rota = request.nextUrl.pathname
  const autenticado = user !== null

  if (rota.startsWith('/painel') && !autenticado) {
    return NextResponse.redirect(new URL('/entrar', request.nextUrl.origin))
  }
  if (rota === '/entrar' && autenticado) {
    return NextResponse.redirect(new URL('/painel', request.nextUrl.origin))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
