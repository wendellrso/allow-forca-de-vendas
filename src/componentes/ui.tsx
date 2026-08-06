import { type ReactNode } from 'react'

/** Vocabulário visual mínimo do aplicativo, sem biblioteca de componentes. */

export const classeEntrada =
  'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-marca-600 focus:ring-2 focus:ring-marca-100 focus:outline-none disabled:bg-zinc-100'

export const classeRotulo = 'mb-1 block text-sm font-medium text-zinc-700'

export const classeBotaoPrimario =
  'inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-marca-600 to-marca-800 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-marca-800/20 hover:brightness-110 focus:ring-2 focus:ring-marca-100 focus:outline-none disabled:opacity-60 sm:w-auto'

export const classeBotaoSecundario =
  'inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-base font-medium text-zinc-700 hover:bg-zinc-100 focus:ring-2 focus:ring-zinc-200 focus:outline-none disabled:opacity-60 sm:w-auto'

export const classeBotaoPerigo =
  'inline-flex w-full items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-base font-medium text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-100 focus:outline-none disabled:opacity-60 sm:w-auto'

export const classeCartao = 'rounded-xl border border-zinc-200 bg-white p-4 shadow-sm'

export function TituloPagina({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string
  subtitulo?: string
  acao?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-marca text-3xl font-bold text-zinc-900">{titulo}</h1>
        {subtitulo !== undefined ? <p className="mt-1 text-sm text-zinc-500">{subtitulo}</p> : null}
      </div>
      {acao}
    </div>
  )
}

export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
      <p className="font-medium text-zinc-700">{titulo}</p>
      <p className="mt-1 text-sm text-zinc-500">{descricao}</p>
    </div>
  )
}

export function MensagemErro({ mensagem }: { mensagem?: string }) {
  if (mensagem === undefined || mensagem === '') {
    return null
  }
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {mensagem}
    </p>
  )
}

export function ErroDeCampo({ mensagem }: { mensagem?: string }) {
  if (mensagem === undefined) {
    return null
  }
  return <p className="mt-1 text-sm text-red-600">{mensagem}</p>
}

const TONS = {
  neutro: 'bg-zinc-100 text-zinc-700',
  atencao: 'bg-amber-100 text-amber-800',
  sucesso: 'bg-emerald-100 text-emerald-800',
  perigo: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-800',
} as const

export type TomDistintivo = keyof typeof TONS

export function Distintivo({ tom, children }: { tom: TomDistintivo; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONS[tom]}`}
    >
      {children}
    </span>
  )
}
