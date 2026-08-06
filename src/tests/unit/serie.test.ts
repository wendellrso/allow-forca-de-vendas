import { describe, expect, it } from 'vitest'
import { diasDoIntervalo, serieDiaria, variacaoPercentual } from '@/dominio/serie'

describe('diasDoIntervalo', () => {
  it('inclui as duas pontas e atravessa o mês', () => {
    expect(diasDoIntervalo('2026-07-30', '2026-08-02')).toEqual([
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ])
  })

  it('um único dia devolve um único ponto', () => {
    expect(diasDoIntervalo('2026-08-05', '2026-08-05')).toEqual(['2026-08-05'])
  })
})

describe('serieDiaria', () => {
  it('soma por dia e preenche buracos com zero', () => {
    const serie = serieDiaria(
      [
        { dia: '2026-08-01', valorCentavos: 1000 },
        { dia: '2026-08-01', valorCentavos: 500 },
        { dia: '2026-08-03', valorCentavos: 200 },
      ],
      '2026-08-01',
      '2026-08-03',
    )
    expect(serie).toEqual([
      { dia: '2026-08-01', totalCentavos: 1500 },
      { dia: '2026-08-02', totalCentavos: 0 },
      { dia: '2026-08-03', totalCentavos: 200 },
    ])
  })

  it('registros fora do intervalo são ignorados', () => {
    const serie = serieDiaria(
      [{ dia: '2026-07-01', valorCentavos: 999 }],
      '2026-08-01',
      '2026-08-02',
    )
    expect(serie.every((ponto) => ponto.totalCentavos === 0)).toBe(true)
  })
})

describe('variacaoPercentual', () => {
  it('calcula subida e queda em percentual inteiro', () => {
    expect(variacaoPercentual(1200, 1000)).toBe(20)
    expect(variacaoPercentual(800, 1000)).toBe(-20)
  })

  it('sem base de comparação devolve nulo', () => {
    expect(variacaoPercentual(500, 0)).toBeNull()
  })
})
