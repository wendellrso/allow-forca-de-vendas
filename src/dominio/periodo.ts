import { somarDias } from './parcelas'

/**
 * Períodos do financeiro e do resultado. Tudo em datas ISO (YYYY-MM-DD) no
 * fuso da operação (America/Maceio), com início e fim inclusivos.
 */

export const CHAVES_DE_PERIODO = ['hoje', 'este_mes', 'mes_anterior', 'personalizado'] as const

export type ChaveDePeriodo = (typeof CHAVES_DE_PERIODO)[number]

export const ROTULO_PERIODO: Record<ChaveDePeriodo, string> = {
  hoje: 'Hoje',
  este_mes: 'Este mês',
  mes_anterior: 'Mês anterior',
  personalizado: 'Personalizado',
}

export interface Periodo {
  de: string
  ate: string
}

export function ehChaveDePeriodo(valor: string): valor is ChaveDePeriodo {
  return (CHAVES_DE_PERIODO as readonly string[]).includes(valor)
}

const PADRAO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * Resolve a chave escolhida para um intervalo concreto. Recebe o "hoje" como
 * argumento para o cálculo ser determinístico e testável.
 */
export function resolverPeriodo(
  chave: ChaveDePeriodo,
  hojeIso: string,
  personalizado?: { de?: string; ate?: string },
): Periodo {
  const [ano, mes] = [Number(hojeIso.slice(0, 4)), Number(hojeIso.slice(5, 7))]

  if (chave === 'hoje') {
    return { de: hojeIso, ate: hojeIso }
  }
  if (chave === 'este_mes') {
    return { de: `${hojeIso.slice(0, 7)}-01`, ate: hojeIso }
  }
  if (chave === 'mes_anterior') {
    const anoAnterior = mes === 1 ? ano - 1 : ano
    const mesAnterior = mes === 1 ? 12 : mes - 1
    const inicio = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`
    const fim = somarDias(`${hojeIso.slice(0, 7)}-01`, -1)
    return { de: inicio, ate: fim }
  }

  const de =
    personalizado?.de !== undefined && PADRAO_DATA_ISO.test(personalizado.de)
      ? personalizado.de
      : `${hojeIso.slice(0, 7)}-01`
  const ate =
    personalizado?.ate !== undefined && PADRAO_DATA_ISO.test(personalizado.ate)
      ? personalizado.ate
      : hojeIso
  return de <= ate ? { de, ate } : { de: ate, ate: de }
}
