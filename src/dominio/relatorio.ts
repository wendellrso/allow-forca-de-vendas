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

export interface DespesaParaRelatorio {
  /** Nome da categoria — livre, definido pela Organização. */
  categoria: string
  valorCentavos: number
}

export interface TotalPorCategoria {
  categoria: string
  totalCentavos: number
}

export interface ResultadoDoPeriodo {
  totalVendidoCentavos: number
  totalDespesasCentavos: number
  resultadoCentavos: number
  despesasPorCategoria: TotalPorCategoria[]
}

/** O número que a planilha nunca entregava: vendas menos custo de vender. */
export function calcularResultadoDoPeriodo(
  vendas: readonly VendaParaRelatorio[],
  despesas: readonly DespesaParaRelatorio[],
): ResultadoDoPeriodo {
  const totalVendido = vendas.reduce((total, venda) => total + venda.totalCentavos, 0)

  const porCategoria = new Map<string, number>()
  let totalDespesas = 0
  for (const despesa of despesas) {
    porCategoria.set(
      despesa.categoria,
      (porCategoria.get(despesa.categoria) ?? 0) + despesa.valorCentavos,
    )
    totalDespesas += despesa.valorCentavos
  }

  const despesasPorCategoria = [...porCategoria.entries()]
    .map(([categoria, totalCentavos]) => ({ categoria, totalCentavos }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)

  return {
    totalVendidoCentavos: totalVendido,
    totalDespesasCentavos: totalDespesas,
    resultadoCentavos: totalVendido - totalDespesas,
    despesasPorCategoria,
  }
}
