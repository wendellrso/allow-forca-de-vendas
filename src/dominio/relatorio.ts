export interface VendaParaRelatorio {
  cidade: string
  uf: string
  totalCentavos: number
}

export interface LinhaPorCidade {
  cidade: string
  uf: string
  quantidadeVendas: number
  totalCentavos: number
  ticketMedioCentavos: number
}

export interface LinhaPorUf {
  uf: string
  quantidadeVendas: number
  totalCentavos: number
  ticketMedioCentavos: number
}

function ticketMedio(totalCentavos: number, quantidade: number): number {
  return quantidade === 0 ? 0 : Math.round(totalCentavos / quantidade)
}

export function agruparVendasPorCidade(vendas: readonly VendaParaRelatorio[]): LinhaPorCidade[] {
  const grupos = new Map<string, LinhaPorCidade>()

  for (const venda of vendas) {
    const chave = `${venda.uf}|${venda.cidade.toLocaleLowerCase('pt-BR')}`
    const grupo = grupos.get(chave)
    if (grupo === undefined) {
      grupos.set(chave, {
        cidade: venda.cidade,
        uf: venda.uf,
        quantidadeVendas: 1,
        totalCentavos: venda.totalCentavos,
        ticketMedioCentavos: venda.totalCentavos,
      })
    } else {
      grupo.quantidadeVendas += 1
      grupo.totalCentavos += venda.totalCentavos
    }
  }

  const linhas = [...grupos.values()].map((linha) => ({
    ...linha,
    ticketMedioCentavos: ticketMedio(linha.totalCentavos, linha.quantidadeVendas),
  }))

  return linhas.sort((a, b) => b.totalCentavos - a.totalCentavos)
}

export function agruparVendasPorUf(vendas: readonly VendaParaRelatorio[]): LinhaPorUf[] {
  const grupos = new Map<string, LinhaPorUf>()

  for (const venda of vendas) {
    const grupo = grupos.get(venda.uf)
    if (grupo === undefined) {
      grupos.set(venda.uf, {
        uf: venda.uf,
        quantidadeVendas: 1,
        totalCentavos: venda.totalCentavos,
        ticketMedioCentavos: venda.totalCentavos,
      })
    } else {
      grupo.quantidadeVendas += 1
      grupo.totalCentavos += venda.totalCentavos
    }
  }

  const linhas = [...grupos.values()].map((linha) => ({
    ...linha,
    ticketMedioCentavos: ticketMedio(linha.totalCentavos, linha.quantidadeVendas),
  }))

  return linhas.sort((a, b) => b.totalCentavos - a.totalCentavos)
}

export const CATEGORIAS_DESPESA = ['hospedagem', 'alimentacao', 'combustivel', 'outros'] as const

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number]

export const ROTULO_CATEGORIA: Record<CategoriaDespesa, string> = {
  hospedagem: 'Hospedagem',
  alimentacao: 'Alimentação',
  combustivel: 'Combustível',
  outros: 'Outros',
}

export interface DespesaParaRelatorio {
  categoria: CategoriaDespesa
  valorCentavos: number
}

export interface ResultadoDoPeriodo {
  totalVendidoCentavos: number
  totalDespesasCentavos: number
  resultadoCentavos: number
  despesasPorCategoria: Record<CategoriaDespesa, number>
}

/** O número que a planilha nunca entregava: vendas menos custo de vender. */
export function calcularResultadoDoPeriodo(
  vendas: readonly VendaParaRelatorio[],
  despesas: readonly DespesaParaRelatorio[],
): ResultadoDoPeriodo {
  const totalVendido = vendas.reduce((total, venda) => total + venda.totalCentavos, 0)

  const porCategoria: Record<CategoriaDespesa, number> = {
    hospedagem: 0,
    alimentacao: 0,
    combustivel: 0,
    outros: 0,
  }
  let totalDespesas = 0
  for (const despesa of despesas) {
    porCategoria[despesa.categoria] += despesa.valorCentavos
    totalDespesas += despesa.valorCentavos
  }

  return {
    totalVendidoCentavos: totalVendido,
    totalDespesasCentavos: totalDespesas,
    resultadoCentavos: totalVendido - totalDespesas,
    despesasPorCategoria: porCategoria,
  }
}
