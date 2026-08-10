import {
  agruparDespesasPorCategoria,
  type DespesaParaRelatorio,
  type TotalPorCategoria,
} from './relatorio'

/**
 * DRE Gerencial: responde "quanto eu realmente ganhei?" a partir de registros
 * reais. O CPV usa o custo CONGELADO no item da venda; quando parte dos itens
 * não tem custo conhecido, a cobertura declara isso em vez de esconder.
 */

export interface ItemParaDre {
  quantidade: number
  custoUnitarioCentavos: number | null
  subtotalCentavos: number
}

export interface DreGerencial {
  quantidadeVendas: number
  receitaBrutaCentavos: number
  cpvCentavos: number
  /** Percentual da receita cujos itens têm custo conhecido (0 a 100). */
  coberturaDoCpvPercentual: number
  lucroBrutoCentavos: number
  despesasPorCategoria: TotalPorCategoria[]
  totalDespesasCentavos: number
  resultadoOperacionalCentavos: number
  margemBrutaPercentual: number | null
  margemOperacionalPercentual: number | null
  ticketMedioCentavos: number
}

export function calcularDre(
  vendas: readonly { totalCentavos: number }[],
  itens: readonly ItemParaDre[],
  despesas: readonly DespesaParaRelatorio[],
): DreGerencial {
  const receitaBruta = vendas.reduce((total, venda) => total + venda.totalCentavos, 0)

  let cpv = 0
  let subtotalComCusto = 0
  let subtotalDosItens = 0
  for (const item of itens) {
    subtotalDosItens += item.subtotalCentavos
    if (item.custoUnitarioCentavos !== null) {
      cpv += item.quantidade * item.custoUnitarioCentavos
      subtotalComCusto += item.subtotalCentavos
    }
  }
  const cobertura =
    subtotalDosItens === 0 ? 100 : Math.round((subtotalComCusto / subtotalDosItens) * 100)

  const lucroBruto = receitaBruta - cpv
  const despesasPorCategoria = agruparDespesasPorCategoria(despesas)
  const totalDespesas = despesasPorCategoria.reduce(
    (total, linha) => total + linha.totalCentavos,
    0,
  )
  const resultadoOperacional = lucroBruto - totalDespesas

  return {
    quantidadeVendas: vendas.length,
    receitaBrutaCentavos: receitaBruta,
    cpvCentavos: cpv,
    coberturaDoCpvPercentual: cobertura,
    lucroBrutoCentavos: lucroBruto,
    despesasPorCategoria,
    totalDespesasCentavos: totalDespesas,
    resultadoOperacionalCentavos: resultadoOperacional,
    margemBrutaPercentual:
      receitaBruta === 0 ? null : Math.round((lucroBruto / receitaBruta) * 100),
    margemOperacionalPercentual:
      receitaBruta === 0 ? null : Math.round((resultadoOperacional / receitaBruta) * 100),
    ticketMedioCentavos: vendas.length === 0 ? 0 : Math.round(receitaBruta / vendas.length),
  }
}
