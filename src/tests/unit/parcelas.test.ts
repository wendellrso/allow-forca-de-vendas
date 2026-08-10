import { describe, expect, it } from 'vitest'
import { calcularValoresDasParcelas, montarParcelas, somarDias } from '@/dominio/parcelas'

describe('calcularValoresDasParcelas', () => {
  it('divide sem perder um centavo: a primeira parcela carrega o resto', () => {
    expect(calcularValoresDasParcelas(10000, 3)).toEqual([3334, 3333, 3333])
    expect(calcularValoresDasParcelas(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000)
  })

  it('parcela única devolve o total', () => {
    expect(calcularValoresDasParcelas(9990, 1)).toEqual([9990])
  })

  it('espelha a regra do banco em divisões exatas', () => {
    expect(calcularValoresDasParcelas(9000, 3)).toEqual([3000, 3000, 3000])
  })

  it('quantidade inválida devolve lista vazia', () => {
    expect(calcularValoresDasParcelas(1000, 0)).toEqual([])
    expect(calcularValoresDasParcelas(1000, 1.5)).toEqual([])
  })
})

describe('somarDias', () => {
  it('soma dias sem depender do fuso do aparelho', () => {
    expect(somarDias('2026-08-31', 1)).toBe('2026-09-01')
    expect(somarDias('2026-12-15', 30)).toBe('2027-01-14')
    expect(somarDias('2026-09-01', -1)).toBe('2026-08-31')
  })
})

describe('montarParcelas', () => {
  it('monta números, valores e vencimentos espaçados', () => {
    const parcelas = montarParcelas(10000, 3, '2026-09-15', 30)
    expect(parcelas).toEqual([
      { numero: 1, valorCentavos: 3334, vencimento: '2026-09-15' },
      { numero: 2, valorCentavos: 3333, vencimento: '2026-10-15' },
      { numero: 3, valorCentavos: 3333, vencimento: '2026-11-14' },
    ])
  })
})
