import { describe, expect, it } from 'vitest'
import {
  agruparVendasPorCidade,
  agruparVendasPorUf,
  calcularResultadoDoPeriodo,
} from '@/dominio/relatorio'

const vendas = [
  { cidade: 'Arapiraca', uf: 'AL', totalCentavos: 10000 },
  { cidade: 'Arapiraca', uf: 'AL', totalCentavos: 20000 },
  { cidade: 'Caruaru', uf: 'PE', totalCentavos: 50000 },
  { cidade: 'Campina Grande', uf: 'PB', totalCentavos: 15000 },
]

describe('agruparVendasPorCidade', () => {
  it('agrupa, soma e calcula o ticket médio', () => {
    const linhas = agruparVendasPorCidade(vendas)
    const arapiraca = linhas.find((linha) => linha.cidade === 'Arapiraca')
    expect(arapiraca).toMatchObject({
      uf: 'AL',
      quantidadeVendas: 2,
      totalCentavos: 30000,
      ticketMedioCentavos: 15000,
    })
  })

  it('ordena do maior total para o menor', () => {
    const linhas = agruparVendasPorCidade(vendas)
    expect(linhas[0]?.cidade).toBe('Caruaru')
  })

  it('não mistura cidades homônimas de estados diferentes', () => {
    const linhas = agruparVendasPorCidade([
      { cidade: 'Bonito', uf: 'PE', totalCentavos: 1000 },
      { cidade: 'Bonito', uf: 'PB', totalCentavos: 2000 },
    ])
    expect(linhas).toHaveLength(2)
  })

  it('agrupa a mesma cidade grafada com caixa diferente', () => {
    const linhas = agruparVendasPorCidade([
      { cidade: 'Caruaru', uf: 'PE', totalCentavos: 1000 },
      { cidade: 'CARUARU', uf: 'PE', totalCentavos: 2000 },
    ])
    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.totalCentavos).toBe(3000)
  })
})

describe('agruparVendasPorUf', () => {
  it('agrupa os três estados de atuação', () => {
    const linhas = agruparVendasPorUf(vendas)
    expect(linhas.map((linha) => linha.uf)).toEqual(['PE', 'AL', 'PB'])
    expect(linhas.find((linha) => linha.uf === 'AL')?.totalCentavos).toBe(30000)
  })

  it('lista vazia produz relatório vazio', () => {
    expect(agruparVendasPorUf([])).toHaveLength(0)
  })
})

describe('calcularResultadoDoPeriodo', () => {
  it('resultado é vendas menos despesas, com quebra por categoria', () => {
    const resultado = calcularResultadoDoPeriodo(vendas, [
      { categoria: 'hospedagem', valorCentavos: 20000 },
      { categoria: 'combustivel', valorCentavos: 15000 },
      { categoria: 'combustivel', valorCentavos: 5000 },
    ])
    expect(resultado.totalVendidoCentavos).toBe(95000)
    expect(resultado.totalDespesasCentavos).toBe(40000)
    expect(resultado.resultadoCentavos).toBe(55000)
    expect(resultado.despesasPorCategoria.combustivel).toBe(20000)
    expect(resultado.despesasPorCategoria.alimentacao).toBe(0)
  })

  it('período sem vendas pode dar resultado negativo', () => {
    const resultado = calcularResultadoDoPeriodo([], [{ categoria: 'outros', valorCentavos: 100 }])
    expect(resultado.resultadoCentavos).toBe(-100)
  })
})
