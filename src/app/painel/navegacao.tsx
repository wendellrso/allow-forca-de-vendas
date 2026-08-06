'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ComponentType, type SVGProps } from 'react'
import { sair } from '@/lib/acoes-auth'
import { MarcaAllow } from '@/componentes/marca'
import {
  IconeCatalogo,
  IconeClientes,
  IconeFinanceiro,
  IconeInicio,
  IconeProdutos,
  IconeRelatorios,
  IconeSair,
  IconeVendas,
} from '@/componentes/icones'

interface ItemDeNavegacao {
  rota: string
  rotulo: string
  icone: ComponentType<SVGProps<SVGSVGElement>>
  exato?: boolean
}

const ITENS: ItemDeNavegacao[] = [
  { rota: '/painel', rotulo: 'Início', icone: IconeInicio, exato: true },
  { rota: '/painel/vendas', rotulo: 'Vendas', icone: IconeVendas },
  { rota: '/painel/clientes', rotulo: 'Clientes', icone: IconeClientes },
  { rota: '/painel/produtos', rotulo: 'Produtos', icone: IconeProdutos },
  { rota: '/painel/financeiro', rotulo: 'Financeiro', icone: IconeFinanceiro },
  { rota: '/painel/relatorios', rotulo: 'Relatórios', icone: IconeRelatorios },
  { rota: '/catalogo', rotulo: 'Catálogo', icone: IconeCatalogo },
]

function itemAtivo(rota: string, exato: boolean | undefined, caminho: string): boolean {
  return exato === true ? caminho === rota : caminho.startsWith(rota)
}

/** Barra lateral no padrão do Stok ERP: escura, fixa, com ícones. */
export function BarraLateral({ email }: { email: string }) {
  const caminho = usePathname()

  return (
    <aside className="bg-marca-900 sticky top-0 hidden h-dvh flex-col px-4 py-6 text-white lg:flex">
      <div className="border-b border-white/10 px-2 pb-6">
        <MarcaAllow tom="dourado" tamanho="sm" />
      </div>
      <nav aria-label="Seções do painel" className="mt-5 grid gap-1">
        {ITENS.map((item) => {
          const ativo = itemAtivo(item.rota, item.exato, caminho)
          const Icone = item.icone
          return (
            <Link
              key={item.rota}
              href={item.rota}
              aria-current={ativo ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                ativo
                  ? 'bg-dourado-500/20 text-dourado-300 font-semibold'
                  : 'text-marca-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icone />
              {item.rotulo}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 px-2 pt-4">
        <p className="text-marca-100/60 truncate text-xs">{email}</p>
        <form action={sair} className="mt-2">
          <button
            type="submit"
            className="text-marca-100/70 flex items-center gap-2 rounded-lg text-sm hover:text-white"
          >
            <IconeSair />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}

/** Navegação compacta do celular: marca no topo e seções em rolagem. */
export function BarraSuperiorMovel() {
  const caminho = usePathname()

  return (
    <header className="bg-marca-900 sticky top-0 z-10 text-white lg:hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <Link href="/painel" className="flex items-baseline gap-2">
          <span className="font-marca texto-dourado text-xl font-medium">allow</span>
          <span className="text-dourado-400 text-[0.55rem] tracking-[0.3em] uppercase">
            Beauty Hair
          </span>
        </Link>
        <form action={sair}>
          <button
            type="submit"
            className="text-marca-100/80 p-1 text-sm hover:text-white"
            aria-label="Sair"
          >
            <IconeSair />
          </button>
        </form>
      </div>
      <nav aria-label="Seções do painel" className="flex gap-1 overflow-x-auto px-3 pb-2">
        {ITENS.map((item) => {
          const ativo = itemAtivo(item.rota, item.exato, caminho)
          return (
            <Link
              key={item.rota}
              href={item.rota}
              aria-current={ativo ? 'page' : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                ativo ? 'bg-dourado-500/20 text-dourado-300' : 'text-marca-100/70'
              }`}
            >
              {item.rotulo}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
