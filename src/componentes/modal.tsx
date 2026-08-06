'use client'

import { useEffect, type ReactNode } from 'react'

/** Janela sobreposta no padrão do Stok ERP: fundo escurecido, cartão central. */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!aberto) {
      return
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        aoFechar()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
    }
  }, [aberto, aoFechar])

  if (!aberto) {
    return null
  }

  return (
    <div
      className="bg-marca-900/60 fixed inset-0 z-50 overflow-y-auto p-4 backdrop-blur-sm"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) {
          aoFechar()
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="mx-auto mt-[6vh] w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-marca text-xl font-bold text-zinc-900">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
