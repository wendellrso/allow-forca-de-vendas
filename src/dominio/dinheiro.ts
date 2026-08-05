/**
 * Todo valor monetário circula como inteiro em centavos. Números de ponto
 * flutuante nunca representam dinheiro neste produto.
 */

const formatador = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatarCentavos(centavos: number): string {
  return formatador.format(centavos / 100)
}

/**
 * Converte a digitação da usuária em centavos. Aceita o formato brasileiro
 * ("1.234,56", "12,5", "12") e recusa qualquer coisa ambígua ou negativa.
 */
export function converterParaCentavos(entrada: string): number | null {
  const texto = entrada.trim().replace(/^R\$\s*/, '')
  if (texto === '' || !/^[0-9.,\s]+$/.test(texto)) {
    return null
  }

  const semMilhar = texto.replace(/[.\s]/g, '')
  const partes = semMilhar.split(',')
  if (partes.length > 2) {
    return null
  }

  const inteiros = partes[0] ?? ''
  const decimais = partes[1] ?? ''
  if (!/^[0-9]+$/.test(inteiros) || (decimais !== '' && !/^[0-9]{1,2}$/.test(decimais))) {
    return null
  }

  const centavos = Number(inteiros) * 100 + Number(decimais.padEnd(2, '0') || '0')
  return Number.isSafeInteger(centavos) ? centavos : null
}
