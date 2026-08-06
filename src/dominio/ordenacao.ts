export type DirecaoDeOrdenacao = 'asc' | 'desc'

const comparadorDeTexto = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/**
 * Comparação estável para as tabelas: números como números, textos no
 * alfabeto brasileiro e vazios sempre por último, em qualquer direção.
 */
export function compararValores(a: unknown, b: unknown): number {
  const aVazio = a === null || a === undefined || a === ''
  const bVazio = b === null || b === undefined || b === ''
  if (aVazio && bVazio) {
    return 0
  }
  if (aVazio) {
    return 1
  }
  if (bVazio) {
    return -1
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b)
  }
  return comparadorDeTexto.compare(String(a), String(b))
}

export function ordenarLinhas<T>(
  linhas: readonly T[],
  chave: keyof T,
  direcao: DirecaoDeOrdenacao,
): T[] {
  const sinal = direcao === 'desc' ? -1 : 1
  return [...linhas].sort((a, b) => {
    const resultado = compararValores(a[chave], b[chave])
    // Vazios ficam por último independentemente da direção.
    if (a[chave] === null || a[chave] === undefined || a[chave] === '') {
      return resultado
    }
    if (b[chave] === null || b[chave] === undefined || b[chave] === '') {
      return resultado
    }
    return sinal * resultado
  })
}

/** Interpreta os parâmetros de ordenação vindos do endereço, com segurança. */
export function lerOrdenacao<Campo extends string>(
  parametros: { ordenar?: string; dir?: string },
  camposValidos: readonly Campo[],
  padrao: Campo,
): { campo: Campo; direcao: DirecaoDeOrdenacao } {
  const campo = (camposValidos as readonly string[]).includes(parametros.ordenar ?? '')
    ? (parametros.ordenar as Campo)
    : padrao
  const direcao: DirecaoDeOrdenacao = parametros.dir === 'desc' ? 'desc' : 'asc'
  return { campo, direcao }
}
