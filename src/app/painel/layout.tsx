import Link from 'next/link'
import { type ReactNode } from 'react'
import { exigirSessao } from '@/lib/sessao'
import { sair } from '@/lib/acoes-auth'

export const dynamic = 'force-dynamic'

const NAVEGACAO = [
  { rota: '/painel', rotulo: 'Início' },
  { rota: '/painel/vendas', rotulo: 'Vendas' },
  { rota: '/painel/clientes', rotulo: 'Clientes' },
  { rota: '/painel/produtos', rotulo: 'Produtos' },
  { rota: '/painel/financeiro', rotulo: 'Financeiro' },
  { rota: '/painel/relatorios', rotulo: 'Relatórios' },
  { rota: '/catalogo', rotulo: 'Catálogo' },
] as const

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  await exigirSessao()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/painel" className="flex items-baseline gap-2">
            <span className="font-marca text-marca-800 text-2xl font-medium">allow</span>
            <span className="text-dourado-600 text-[0.6rem] tracking-[0.3em] uppercase">
              Beauty Hair
            </span>
          </Link>
          <form action={sair}>
            <button
              type="submit"
              className="rounded px-2 py-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 focus:ring-2 focus:ring-zinc-200 focus:outline-none"
            >
              Sair
            </button>
          </form>
        </div>
        <nav
          aria-label="Seções do painel"
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2"
        >
          {NAVEGACAO.map((item) => (
            <Link
              key={item.rota}
              href={item.rota}
              className="hover:bg-marca-50 hover:text-marca-700 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-zinc-600"
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-16">{children}</main>
    </div>
  )
}
