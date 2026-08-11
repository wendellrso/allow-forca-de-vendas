'use client'

import { useState } from 'react'
import { type PayloadDeBoleto } from '@/lib/tipos'
import { classeBotaoSecundario } from '@/componentes/ui'

/**
 * O que o cliente precisa para pagar: QR code do Pix na tela, copia-e-cola,
 * link da fatura e o atalho do WhatsApp. Vive na venda recém-confirmada e na
 * conta a receber — é o mesmo bloco, porque é a mesma necessidade.
 */
export function BlocoDaCobranca({
  payload,
  telefoneDoCliente,
}: {
  payload: PayloadDeBoleto
  telefoneDoCliente: string | null
}) {
  const [copiado, definirCopiado] = useState<'linha' | 'pix' | null>(null)

  async function copiar(texto: string, qual: 'linha' | 'pix') {
    try {
      await navigator.clipboard.writeText(texto)
      definirCopiado(qual)
      setTimeout(() => definirCopiado(null), 2000)
    } catch {
      // Sem permissão de área de transferência: os links continuam disponíveis.
    }
  }

  const urlDaCobranca = payload.url_pdf ?? payload.url_fatura ?? null
  const mensagem =
    urlDaCobranca !== null
      ? `Olá! Segue o link para pagamento da sua compra: ${urlDaCobranca}`
      : null

  return (
    <>
      {payload.pix_qr_base64 !== null && payload.pix_qr_base64 !== undefined ? (
        <figure className="mt-3 flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem do provedor em base64, sem otimizador no Worker */}
          <img
            src={`data:image/png;base64,${payload.pix_qr_base64}`}
            alt="QR code do Pix desta cobrança"
            className="h-44 w-44"
          />
          <figcaption className="mt-2 text-center text-xs text-zinc-500">
            O cliente aponta a câmera do banco para pagar na hora.
          </figcaption>
        </figure>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {urlDaCobranca !== null ? (
          <a
            href={urlDaCobranca}
            target="_blank"
            rel="noreferrer"
            className={`${classeBotaoSecundario} w-auto`}
          >
            Abrir cobrança
          </a>
        ) : null}
        {payload.linha_digitavel !== null && payload.linha_digitavel !== undefined ? (
          <button
            type="button"
            onClick={() => void copiar(payload.linha_digitavel as string, 'linha')}
            className={`${classeBotaoSecundario} w-auto`}
          >
            {copiado === 'linha' ? 'Copiada!' : 'Copiar linha digitável'}
          </button>
        ) : null}
        {payload.pix_copia_e_cola !== null && payload.pix_copia_e_cola !== undefined ? (
          <button
            type="button"
            onClick={() => void copiar(payload.pix_copia_e_cola as string, 'pix')}
            className={`${classeBotaoSecundario} w-auto`}
          >
            {copiado === 'pix' ? 'Código copiado!' : 'Copiar código Pix'}
          </button>
        ) : null}
        {mensagem !== null ? (
          <a
            href={
              telefoneDoCliente !== null
                ? `https://wa.me/55${telefoneDoCliente}?text=${encodeURIComponent(mensagem)}`
                : `https://wa.me/?text=${encodeURIComponent(mensagem)}`
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 sm:w-auto"
          >
            💬 Enviar no WhatsApp
          </a>
        ) : null}
      </div>
    </>
  )
}
