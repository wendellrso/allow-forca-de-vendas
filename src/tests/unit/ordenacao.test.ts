import { describe, expect, it } from 'vitest'
import { compararValores, lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'

describe('compararValores', () => {
  it('compara números como números', () => {
    expect(compararValores(2, 10)).toBeLessThan(0)
  })

  it('compara textos no alfabeto brasileiro, sem caixa', () => {
    expect(compararValores('Água', 'zebra')).toBeLessThan(0)
    expect(compararValores('caruaru', 'CARUARU')).toBe(0)
  })

  it('vazios vão para o fim', () => {
    expect(compararValores(null, 'a')).toBeGreaterThan(0)
    expect(compararValores('a', undefined)).toBeLessThan(0)
    expect(compararValores(null, null)).toBe(0)
  })
})

describe('ordenarLinhas', () => {
  const linhas = [
    { nome: 'Caruaru', total: 300 },
    { nome: 'Arapiraca', total: 900 },
    { nome: 'Bonito', total: 100 },
  ]

  it('ordena por texto nas duas direções', () => {
    expect(ordenarLinhas(linhas, 'nome', 'asc').map((linha) => linha.nome)).toEqual([
      'Arapiraca',
      'Bonito',
      'Caruaru',
    ])
    expect(ordenarLinhas(linhas, 'nome', 'desc')[0]?.nome).toBe('Caruaru')
  })

  it('ordena por número e não altera a lista original', () => {
    const ordenadas = ordenarLinhas(linhas, 'total', 'desc')
    expect(ordenadas.map((linha) => linha.total)).toEqual([900, 300, 100])
    expect(linhas[0]?.nome).toBe('Caruaru')
  })

  it('vazios ficam por último em qualquer direção', () => {
    const comVazio = [{ valor: null }, { valor: 5 }, { valor: 1 }]
    expect(ordenarLinhas(comVazio, 'valor', 'asc').at(-1)?.valor).toBeNull()
    expect(ordenarLinhas(comVazio, 'valor', 'desc').at(-1)?.valor).toBeNull()
  })
})

describe('lerOrdenacao', () => {
  const campos = ['name', 'total'] as const

  it('aceita campo válido e direção declarada', () => {
    expect(lerOrdenacao({ ordenar: 'total', dir: 'desc' }, campos, 'name')).toEqual({
      campo: 'total',
      direcao: 'desc',
    })
  })

  it('campo desconhecido cai no padrão, direção estranha vira asc', () => {
    expect(lerOrdenacao({ ordenar: 'senha', dir: 'x' }, campos, 'name')).toEqual({
      campo: 'name',
      direcao: 'asc',
    })
  })
})
