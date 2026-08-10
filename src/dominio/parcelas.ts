/**
 * Parcelamento em centavos, espelhando a regra do banco: divisão inteira e a
 * primeira parcela carrega o resto — a soma sempre fecha no total exato.
 */

export interface Parcela {
  numero: number
  valorCentavos: number
  vencimento: string
}

export function calcularValoresDasParcelas(totalCentavos: number, quantidade: number): number[] {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return []
  }
  const base = Math.floor(totalCentavos / quantidade)
  const primeira = totalCentavos - base * (quantidade - 1)
  return Array.from({ length: quantidade }, (_, indice) => (indice === 0 ? primeira : base))
}

/** Soma dias a uma data ISO (YYYY-MM-DD) sem depender do fuso do aparelho. */
export function somarDias(dataIso: string, dias: number): string {
  const data = new Date(`${dataIso}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

export function montarParcelas(
  totalCentavos: number,
  quantidade: number,
  primeiroVencimento: string,
  intervaloDias: number,
): Parcela[] {
  return calcularValoresDasParcelas(totalCentavos, quantidade).map((valorCentavos, indice) => ({
    numero: indice + 1,
    valorCentavos,
    vencimento: somarDias(primeiroVencimento, indice * intervaloDias),
  }))
}
