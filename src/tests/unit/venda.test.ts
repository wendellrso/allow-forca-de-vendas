import { describe, expect, it } from 'vitest'
import {
  calcularSubtotalCentavos,
  calcularTotalCentavos,
  podeTransicionar,
  STATUS_VENDA,
  transicoesDisponiveis,
} from '@/dominio/venda'

describe('máquina de estados da venda', () => {
  it('permite as quatro transições legítimas', () => {
    expect(podeTransicionar('aguardando_confirmacao', 'confirmada')).toBe(true)
    expect(podeTransicionar('aguardando_confirmacao', 'cancelada')).toBe(true)
    expect(podeTransicionar('confirmada', 'entregue')).toBe(true)
    expect(podeTransicionar('confirmada', 'cancelada')).toBe(true)
  })

  it('estados finais não têm saída', () => {
    expect(transicoesDisponiveis('entregue')).toHaveLength(0)
    expect(transicoesDisponiveis('cancelada')).toHaveLength(0)
  })

  it('recusa atalhos e retrocessos', () => {
    expect(podeTransicionar('aguardando_confirmacao', 'entregue')).toBe(false)
    expect(podeTransicionar('confirmada', 'aguardando_confirmacao')).toBe(false)
    expect(podeTransicionar('entregue', 'cancelada')).toBe(false)
    expect(podeTransicionar('cancelada', 'confirmada')).toBe(false)
  })

  it('nenhum estado transita para si mesmo', () => {
    for (const status of STATUS_VENDA) {
      expect(podeTransicionar(status, status)).toBe(false)
    }
  })
})

describe('totais da venda', () => {
  it('subtotal é quantidade vezes preço', () => {
    expect(calcularSubtotalCentavos({ quantidade: 3, precoUnitarioCentavos: 4990 })).toBe(14970)
  })

  it('total soma todos os itens e é zero sem itens', () => {
    expect(
      calcularTotalCentavos([
        { quantidade: 2, precoUnitarioCentavos: 1000 },
        { quantidade: 1, precoUnitarioCentavos: 500 },
      ]),
    ).toBe(2500)
    expect(calcularTotalCentavos([])).toBe(0)
  })
})
