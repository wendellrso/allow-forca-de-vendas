import { Suspense, type ReactNode } from 'react'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { ToastDeNavegacao } from '@/componentes/toast'
import { BarraInferiorMovel, BarraLateral, BarraSuperiorMovel } from './navegacao'

export const dynamic = 'force-dynamic'

function hojeIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Maceio' })
}

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  await exigirSessao()
  const supabase = await criarClienteServidor()

  const [
    {
      data: { user },
    },
    aguardando,
    vencidas,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aguardando_confirmacao'),
    supabase
      .from('receivables')
      .select('id', { count: 'exact', head: true })
      .in('status', ['aberto', 'parcial'])
      .lt('due_date', hojeIso()),
  ])

  const email = user?.email ?? ''
  const contadores = {
    pedidosAguardando: aguardando.count ?? 0,
    contasVencidas: vencidas.count ?? 0,
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <BarraLateral email={email} contadores={contadores} />
      <div className="min-w-0">
        <BarraSuperiorMovel />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:px-8 lg:pb-16">{children}</main>
        <BarraInferiorMovel contadores={contadores} />
      </div>
      <Suspense fallback={null}>
        <ToastDeNavegacao />
      </Suspense>
    </div>
  )
}
