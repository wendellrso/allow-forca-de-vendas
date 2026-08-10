'use client'

import { useRouter } from 'next/navigation'
import { type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'

/**
 * Linha de tabela que É o link: clicar em qualquer ponto abre o detalhe.
 * Cliques em controles internos (links, botões, campos) não navegam.
 */
export function LinhaClicavel({ href, children }: { href: string; children: ReactNode }) {
  const roteador = useRouter()

  function alvoInterativo(alvo: EventTarget | null): boolean {
    return alvo instanceof Element && alvo.closest('a, button, input, select, label, form') !== null
  }

  function aoClicar(evento: MouseEvent<HTMLTableRowElement>) {
    if (alvoInterativo(evento.target)) {
      return
    }
    roteador.push(href)
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTableRowElement>) {
    if (evento.key === 'Enter' && !alvoInterativo(evento.target)) {
      roteador.push(href)
    }
  }

  return (
    <tr
      onClick={aoClicar}
      onKeyDown={aoTeclar}
      tabIndex={0}
      className="hover:bg-marca-50/60 focus-visible:bg-marca-50/60 cursor-pointer border-b border-zinc-100 outline-none last:border-0 odd:bg-white even:bg-zinc-50/60"
    >
      {children}
    </tr>
  )
}

/** Cartão que É o link, para listas no celular. */
export function CartaoClicavel({
  href,
  children,
  rotulo,
}: {
  href: string
  children: ReactNode
  rotulo: string
}) {
  const roteador = useRouter()

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={rotulo}
      onClick={(evento) => {
        const alvo = evento.target
        if (alvo instanceof Element && alvo.closest('a, button, input, select, form') !== null) {
          return
        }
        roteador.push(href)
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') {
          roteador.push(href)
        }
      }}
      className="hover:border-marca-200 focus-visible:border-marca-400 cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all outline-none hover:shadow-md"
    >
      {children}
    </div>
  )
}
