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

export interface ContadoresDaNavegacao {
  pedidosAguardando: number
  contasVencidas: number
}

interface ItemDeNavegacao {
  rota: string
  rotulo: string
  icone: ComponentType<SVGProps<SVGSVGElement>>
  exato?: boolean
  contador?: keyof ContadoresDaNavegacao
}

const ITENS: ItemDeNavegacao[] = [
  { rota: '/painel', rotulo: 'Início', icone: IconeInicio, exato: true },
  { rota: '/painel/vendas', rotulo: 'Vendas', icone: IconeVendas, contador: 'pedidosAguardando' },
  { rota: '/painel/clientes', rotulo: 'Clientes', icone: IconeClientes },
  { rota: '/painel/produtos', rotulo: 'Produtos', icone: IconeProdutos },
  {
    rota: '/painel/financeiro',
    rotulo: 'Financeiro',
    icone: IconeFinanceiro,
    contador: 'contasVencidas',
  },
  { rota: '/painel/relatorios', rotulo: 'Relatórios', icone: IconeRelatorios },
  { rota: '/catalogo', rotulo: 'Catálogo', icone: IconeCatalogo },
]

const ITENS_DO_CELULAR = ITENS.slice(0, 5)

function itemAtivo(rota: string, exato: boolean | undefined, caminho: string): boolean {
  return exato === true ? caminho === rota : caminho.startsWith(rota)
}

function Contador({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) {
    return null
  }
  return (
    <span className="bg-dourado-500 text-marca-900 ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold">
      {quantidade > 99 ? '99+' : quantidade}
    </span>
  )
}

/** Barra lateral no padrão do Stok ERP: escura, fixa, com ícones e contadores. */
export function BarraLateral({
  email,
  contadores,
}: {
  email: string
  contadores: ContadoresDaNavegacao
}) {
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
              {item.contador !== undefined ? (
                <Contador quantidade={contadores[item.contador]} />
              ) : null}
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

/** Cabeçalho compacto do celular: marca e saída. As seções vivem embaixo. */
export function BarraSuperiorMovel() {
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
    </header>
  )
}

/** Navegação inferior do celular: as cinco seções do dia a dia, no polegar. */
export function BarraInferiorMovel({ contadores }: { contadores: ContadoresDaNavegacao }) {
  const caminho = usePathname()

  return (
    <nav
      aria-label="Seções do painel"
      className="bg-marca-900 fixed inset-x-0 bottom-0 z-10 border-t border-white/10 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid grid-cols-5">
        {ITENS_DO_CELULAR.map((item) => {
          const ativo = itemAtivo(item.rota, item.exato, caminho)
          const Icone = item.icone
          const quantidade = item.contador !== undefined ? contadores[item.contador] : 0
          return (
            <Link
              key={item.rota}
              href={item.rota}
              aria-current={ativo ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                ativo ? 'text-dourado-300' : 'text-marca-100/60'
              }`}
            >
              {quantidade > 0 ? (
                <span className="bg-dourado-500 text-marca-900 absolute top-1 right-[22%] grid h-4 min-w-4 place-items-center rounded-full px-0.5 text-[9px] font-bold">
                  {quantidade > 9 ? '9+' : quantidade}
                </span>
              ) : null}
              <Icone />
              {item.rotulo}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
