'use client'

import { useState } from 'react'
import { formatarCentavos } from '@/dominio/dinheiro'
import { type PontoDiario } from '@/dominio/serie'

/**
 * Gráficos em SVG puro, com a cor de dado da marca validada para leitura
 * (#9c3660 — o degrau do vinho que passa nas verificações de contraste).
 */

const COR_DE_DADO = '#9c3660'

export function Sparkline({ pontos }: { pontos: number[] }) {
  if (pontos.length < 2) {
    return null
  }
  const largura = 120
  const altura = 32
  const maximo = Math.max(...pontos, 1)
  const passo = largura / (pontos.length - 1)
  const coordenadas = pontos.map((valor, indice) => {
    const x = indice * passo
    const y = altura - 3 - (valor / maximo) * (altura - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Tendência dos últimos dias"
    >
      <polygon
        points={`0,${altura} ${coordenadas.join(' ')} ${largura},${altura}`}
        fill={COR_DE_DADO}
        opacity="0.12"
      />
      <polyline
        points={coordenadas.join(' ')}
        fill="none"
        stroke={COR_DE_DADO}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

function rotuloDoDia(dia: string): string {
  const data = new Date(`${dia}T12:00:00Z`)
  return DIAS_DA_SEMANA[data.getUTCDay()] ?? ''
}

export function GraficoDeBarrasDiario({ pontos }: { pontos: PontoDiario[] }) {
  const [ativo, definirAtivo] = useState<number | null>(null)
  if (pontos.length === 0) {
    return null
  }
  const maximo = Math.max(...pontos.map((ponto) => ponto.totalCentavos), 1)
  const pontoAtivo = ativo !== null ? pontos[ativo] : undefined

  return (
    <div>
      <div className="relative h-6">
        {pontoAtivo !== undefined ? (
          <p className="absolute inset-x-0 text-center text-xs font-semibold text-zinc-700">
            {new Date(`${pontoAtivo.dia}T12:00:00Z`).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              timeZone: 'UTC',
            })}{' '}
            · {formatarCentavos(pontoAtivo.totalCentavos)}
          </p>
        ) : (
          <p className="absolute inset-x-0 text-center text-xs text-zinc-400">
            Passe o dedo ou o mouse para ver cada dia
          </p>
        )}
      </div>
      <div
        className="flex h-32 items-end gap-[2px] border-b border-zinc-200"
        onMouseLeave={() => definirAtivo(null)}
        role="img"
        aria-label={`Vendas por dia nos últimos ${pontos.length} dias`}
      >
        {pontos.map((ponto, indice) => {
          const alturaPercentual = Math.max((ponto.totalCentavos / maximo) * 100, 1.5)
          return (
            <button
              key={ponto.dia}
              type="button"
              tabIndex={-1}
              onMouseEnter={() => definirAtivo(indice)}
              onFocus={() => definirAtivo(indice)}
              onTouchStart={() => definirAtivo(indice)}
              className="group flex h-full flex-1 items-end"
              aria-label={`${ponto.dia}: ${formatarCentavos(ponto.totalCentavos)}`}
            >
              <span
                className="w-full rounded-t-[4px] transition-opacity"
                style={{
                  height: `${alturaPercentual}%`,
                  backgroundColor: COR_DE_DADO,
                  opacity: ativo === null || ativo === indice ? 1 : 0.35,
                }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {pontos.map((ponto, indice) => (
          <span
            key={ponto.dia}
            className={`flex-1 text-center text-[9px] ${indice === ativo ? 'font-bold text-zinc-700' : 'text-zinc-400'}`}
          >
            {pontos.length <= 16 || indice % 2 === 0 ? rotuloDoDia(ponto.dia) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
