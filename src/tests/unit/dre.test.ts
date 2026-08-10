import { describe, expect, it } from 'vitest'
import { calcularDre } from '@/dominio/dre'

describe('calcularDre', () => {
  it('calcula receita, CPV, lucro bruto, despesas e resultado', () => {
    const dre = calcularDre(
      [{ totalCentavos: 10000 }, { totalCentavos: 5000 }],
      [
        { quantidade: 2, custoUnitarioCentavos: 2500, subtotalCentavos: 10000 },
        { quantidade: 1, custoUnitarioCentavos: 2000, subtotalCentavos: 5000 },
      ],
      [
        { categoria: 'Combustível', valorCentavos: 1000 },
        { categoria: 'Alimentação', valorCentavos: 500 },
      ],
    )

    expect(dre.receitaBrutaCentavos).toBe(15000)
    expect(dre.cpvCentavos).toBe(7000)
    expect(dre.coberturaDoCpvPercentual).toBe(100)
    expect(dre.lucroBrutoCentavos).toBe(8000)
    expect(dre.totalDespesasCentavos).toBe(1500)
    expect(dre.resultadoOperacionalCentavos).toBe(6500)
    expect(dre.margemBrutaPercentual).toBe(53)
    expect(dre.margemOperacionalPercentual).toBe(43)
    expect(dre.ticketMedioCentavos).toBe(7500)
  })

  it('declara a cobertura quando parte dos itens não tem custo', () => {
    const dre = calcularDre(
      [{ totalCentavos: 10000 }],
      [
        { quantidade: 1, custoUnitarioCentavos: 3000, subtotalCentavos: 6000 },
        { quantidade: 1, custoUnitarioCentavos: null, subtotalCentavos: 4000 },
      ],
      [],
    )

    expect(dre.cpvCentavos).toBe(3000)
    expect(dre.coberturaDoCpvPercentual).toBe(60)
  })

  it('período vazio não divide por zero', () => {
    const dre = calcularDre([], [], [])
    expect(dre.receitaBrutaCentavos).toBe(0)
    expect(dre.margemBrutaPercentual).toBeNull()
    expect(dre.margemOperacionalPercentual).toBeNull()
    expect(dre.ticketMedioCentavos).toBe(0)
    expect(dre.coberturaDoCpvPercentual).toBe(100)
  })

  it('agrupa despesas por categoria em ordem decrescente', () => {
    const dre = calcularDre(
      [],
      [],
      [
        { categoria: 'A', valorCentavos: 100 },
        { categoria: 'B', valorCentavos: 300 },
        { categoria: 'A', valorCentavos: 50 },
      ],
    )
    expect(dre.despesasPorCategoria).toEqual([
      { categoria: 'B', totalCentavos: 300 },
      { categoria: 'A', totalCentavos: 150 },
    ])
  })
})
