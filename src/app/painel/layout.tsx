import { type ReactNode } from 'react'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { BarraLateral, BarraSuperiorMovel } from './navegacao'

export const dynamic = 'force-dynamic'

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  await exigirSessao()
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? ''

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <BarraLateral email={email} />
      <div className="min-w-0">
        <BarraSuperiorMovel />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-16 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
