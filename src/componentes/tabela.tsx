import Link from 'next/link'
import { type ReactNode } from 'react'
import { type DirecaoDeOrdenacao } from '@/dominio/ordenacao'

/**
 * Tabela no padrão de ERP: densa, com zebra, cabeçalho que ordena ao clique
 * e rolagem horizontal no celular. A ordenação vive no endereço, então o
 * estado sobrevive a atualização e compartilhamento.
 */

export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full min-w-max text-sm">{children}</table>
    </div>
  )
}

export function CabecalhoDaTabela({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-zinc-200 bg-zinc-50 text-left">{children}</tr>
    </thead>
  )
}

export function CabecalhoOrdenavel({
  campo,
  rotulo,
  ordenacao,
  parametros,
  alinhamento = 'esquerda',
}: {
  campo: string
  rotulo: string
  ordenacao: { campo: string; direcao: DirecaoDeOrdenacao }
  /** Demais parâmetros do endereço, preservados ao trocar a ordenação. */
  parametros?: Record<string, string>
  alinhamento?: 'esquerda' | 'direita'
}) {
  const ativo = ordenacao.campo === campo
  const proximaDirecao = ativo && ordenacao.direcao === 'asc' ? 'desc' : 'asc'
  const consulta = new URLSearchParams({ ...parametros, ordenar: campo, dir: proximaDirecao })

  return (
    <th scope="col" className="p-0">
      <Link
        href={`?${consulta.toString()}`}
        className={`hover:text-marca-700 flex items-center gap-1 px-3 py-2.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase select-none hover:bg-zinc-100 ${alinhamento === 'direita' ? 'justify-end' : ''} ${ativo ? 'text-marca-700' : ''}`}
      >
        {rotulo}
        <span aria-hidden className={ativo ? '' : 'invisible'}>
          {ativo && ordenacao.direcao === 'desc' ? '▼' : '▲'}
        </span>
      </Link>
    </th>
  )
}

export function CabecalhoFixo({
  rotulo,
  alinhamento = 'esquerda',
}: {
  rotulo: string
  alinhamento?: 'esquerda' | 'direita'
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase ${alinhamento === 'direita' ? 'text-right' : ''}`}
    >
      {rotulo}
    </th>
  )
}

export function LinhaDaTabela({ children }: { children: ReactNode }) {
  return (
    <tr className="hover:bg-marca-50/60 border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/60">
      {children}
    </tr>
  )
}

export function Celula({
  children,
  alinhamento = 'esquerda',
  destaque = false,
}: {
  children: ReactNode
  alinhamento?: 'esquerda' | 'direita'
  destaque?: boolean
}) {
  return (
    <td
      className={`px-3 py-2 whitespace-nowrap ${alinhamento === 'direita' ? 'text-right' : ''} ${destaque ? 'font-semibold text-zinc-900' : 'text-zinc-600'}`}
    >
      {children}
    </td>
  )
}
