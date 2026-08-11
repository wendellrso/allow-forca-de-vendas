import { describe, expect, it } from 'vitest'
import {
  centavosParaValorDoProvedor,
  descricaoDoBoleto,
  podeEmitirBoleto,
  valorDoProvedorParaCentavos,
} from '@/dominio/boleto'
import { COBRANCA_POR_TIPO_DE_FORMA, formaGeraCobranca, TIPOS_DE_FORMA } from '@/lib/tipos'

describe('conversão de valores com o provedor', () => {
  it('centavos viram reais exatos', () => {
    expect(centavosParaValorDoProvedor(12345)).toBe(123.45)
    expect(centavosParaValorDoProvedor(100)).toBe(1)
    expect(centavosParaValorDoProvedor(1)).toBe(0.01)
  })

  it('reais do provedor voltam a centavos sem resíduo de ponto flutuante', () => {
    expect(valorDoProvedorParaCentavos(123.45)).toBe(12345)
    expect(valorDoProvedorParaCentavos(0.1 + 0.2)).toBe(30)
    expect(valorDoProvedorParaCentavos(33.33)).toBe(3333)
  })

  it('ida e volta preserva o valor', () => {
    for (const centavos of [1, 99, 3334, 10000, 999999]) {
      expect(valorDoProvedorParaCentavos(centavosParaValorDoProvedor(centavos))).toBe(centavos)
    }
  })
})

describe('descricaoDoBoleto', () => {
  it('anexa o número da venda quando existe', () => {
    expect(descricaoDoBoleto('Parcela 1/3 — Maria', 12)).toBe('Parcela 1/3 — Maria · Venda #12')
    expect(descricaoDoBoleto('Venda a prazo — Maria', null)).toBe('Venda a prazo — Maria')
  })
})

describe('podeEmitirBoleto', () => {
  it('exige CPF/CNPJ do pagador', () => {
    expect(podeEmitirBoleto('86395912453')).toBe(true)
    expect(podeEmitirBoleto(null)).toBe(false)
    expect(podeEmitirBoleto('   ')).toBe(false)
  })
})

describe('formaGeraCobranca', () => {
  it('cobra apenas boleto, Pix e cartão de crédito', () => {
    expect(formaGeraCobranca('boleto')).toBe(true)
    expect(formaGeraCobranca('pix')).toBe(true)
    expect(formaGeraCobranca('cartao_credito')).toBe(true)
    expect(formaGeraCobranca('dinheiro')).toBe(false)
    expect(formaGeraCobranca('cartao_debito')).toBe(false)
    expect(formaGeraCobranca('outro')).toBe(false)
  })

  it('todo tipo que cobra tem meio de pagamento no provedor', () => {
    for (const tipo of TIPOS_DE_FORMA) {
      expect(COBRANCA_POR_TIPO_DE_FORMA[tipo] !== undefined).toBe(formaGeraCobranca(tipo))
    }
  })
})
