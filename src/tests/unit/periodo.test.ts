import { describe, expect, it } from 'vitest'
import { ehChaveDePeriodo, resolverPeriodo } from '@/dominio/periodo'

describe('resolverPeriodo', () => {
  it('hoje é um intervalo de um dia', () => {
    expect(resolverPeriodo('hoje', '2026-08-10')).toEqual({ de: '2026-08-10', ate: '2026-08-10' })
  })

  it('este mês vai do dia 1 até hoje', () => {
    expect(resolverPeriodo('este_mes', '2026-08-10')).toEqual({
      de: '2026-08-01',
      ate: '2026-08-10',
    })
  })

  it('mês anterior é o mês fechado, inclusive na virada do ano', () => {
    expect(resolverPeriodo('mes_anterior', '2026-08-10')).toEqual({
      de: '2026-07-01',
      ate: '2026-07-31',
    })
    expect(resolverPeriodo('mes_anterior', '2026-01-15')).toEqual({
      de: '2025-12-01',
      ate: '2025-12-31',
    })
  })

  it('personalizado usa as datas informadas e corrige inversões', () => {
    expect(
      resolverPeriodo('personalizado', '2026-08-10', { de: '2026-05-01', ate: '2026-05-20' }),
    ).toEqual({ de: '2026-05-01', ate: '2026-05-20' })
    expect(
      resolverPeriodo('personalizado', '2026-08-10', { de: '2026-05-20', ate: '2026-05-01' }),
    ).toEqual({ de: '2026-05-01', ate: '2026-05-20' })
  })

  it('personalizado sem datas válidas cai no mês atual', () => {
    expect(resolverPeriodo('personalizado', '2026-08-10', { de: 'xx', ate: undefined })).toEqual({
      de: '2026-08-01',
      ate: '2026-08-10',
    })
  })
})

describe('ehChaveDePeriodo', () => {
  it('reconhece apenas as chaves oficiais', () => {
    expect(ehChaveDePeriodo('este_mes')).toBe(true)
    expect(ehChaveDePeriodo('semana')).toBe(false)
  })
})
