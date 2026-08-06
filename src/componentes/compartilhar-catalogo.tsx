'use client'

import { useState } from 'react'
import { classeBotaoSecundario } from '@/componentes/ui'

/** O link do catálogo é o que a vendedora manda aos clientes todos os dias. */
export function CompartilharCatalogo({ url }: { url: string }) {
  const [copiado, definirCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      definirCopiado(true)
      setTimeout(() => definirCopiado(false), 2000)
    } catch {
      // Sem permissão de área de transferência: o campo abaixo permite
      // selecionar e copiar manualmente.
    }
  }

  const mensagem = `Olá! Veja o catálogo Allow Beauty Hair e faça seu pedido: ${url}`
  const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`

  return (
    <div className="space-y-2">
      <input
        readOnly
        value={url}
        aria-label="Link do catálogo"
        onFocus={(evento) => evento.target.select()}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void copiar()} className={classeBotaoSecundario}>
          {copiado ? 'Copiado!' : 'Copiar link'}
        </button>
        <a href={linkWhatsApp} target="_blank" rel="noreferrer" className={classeBotaoSecundario}>
          Enviar pelo WhatsApp
        </a>
      </div>
    </div>
  )
}
