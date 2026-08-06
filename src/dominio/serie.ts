export interface PontoDiario {
  /** Dia no formato aaaa-mm-dd. */
  dia: string
  totalCentavos: number
}

/** Dias corridos entre início e fim, inclusive, em aaaa-mm-dd. */
export function diasDoIntervalo(inicio: string, fim: string): string[] {
  const dias: string[] = []
  const cursor = new Date(`${inicio}T12:00:00Z`)
  const limite = new Date(`${fim}T12:00:00Z`)
  while (cursor <= limite) {
    dias.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dias
}

/**
 * Série diária contínua: soma os registros por dia e preenche com zero os
 * dias sem venda — um gráfico com buracos mente sobre o ritmo.
 */
export function serieDiaria(
  registros: readonly { dia: string; valorCentavos: number }[],
  inicio: string,
  fim: string,
): PontoDiario[] {
  const somaPorDia = new Map<string, number>()
  for (const registro of registros) {
    somaPorDia.set(registro.dia, (somaPorDia.get(registro.dia) ?? 0) + registro.valorCentavos)
  }
  return diasDoIntervalo(inicio, fim).map((dia) => ({
    dia,
    totalCentavos: somaPorDia.get(dia) ?? 0,
  }))
}

/**
 * Variação percentual inteira entre períodos. Nulo quando não há base de
 * comparação — mostrar "+∞%" não ajuda ninguém.
 */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) {
    return null
  }
  return Math.round(((atual - anterior) / anterior) * 100)
}
