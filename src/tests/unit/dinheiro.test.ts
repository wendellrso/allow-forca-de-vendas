import { describe, expect, it } from 'vitest'
import { converterParaCentavos, formatarCentavos } from '@/dominio/dinheiro'

describe('formatarCentavos', () => {
  it('formata em real brasileiro', () => {
    expect(formatarCentavos(123456).replace(/ /g, ' ')).toBe('R$ 1.234,56')
  })

  it('formata zero e valores negativos', () => {
    expect(formatarCentavos(0)).toContain('0,00')
    expect(formatarCentavos(-500)).toContain('5,00')
  })
})

describe('converterParaCentavos', () => {
  it('aceita o formato brasileiro completo', () => {
    expect(converterParaCentavos('1.234,56')).toBe(123456)
  })

  it('aceita valor sem centavos e com um decimal', () => {
    expect(converterParaCentavos('12')).toBe(1200)
    expect(converterParaCentavos('12,5')).toBe(1250)
  })

  it('aceita o prefixo R$ e espaços', () => {
    expect(converterParaCentavos('R$ 49,90')).toBe(4990)
    expect(converterParaCentavos('  100,00  ')).toBe(10000)
  })

  it('recusa entradas ambíguas ou inválidas', () => {
    expect(converterParaCentavos('')).toBeNull()
    expect(converterParaCentavos('abc')).toBeNull()
    expect(converterParaCentavos('12,345')).toBeNull()
    expect(converterParaCentavos('1,2,3')).toBeNull()
    expect(converterParaCentavos('-5')).toBeNull()
  })
})
