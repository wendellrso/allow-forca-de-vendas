export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

export type Uf = (typeof UFS)[number]

/** Estados atendidos pela vendedora hoje. Aparecem primeiro nas seleções. */
export const UFS_ATUACAO: readonly Uf[] = ['AL', 'PE', 'PB']

export function ehUf(valor: string): valor is Uf {
  return (UFS as readonly string[]).includes(valor)
}

/** Ordena as UFs de atuação primeiro, mantendo as demais em ordem alfabética. */
export function ufsParaSelecao(): readonly Uf[] {
  const demais = UFS.filter((uf) => !UFS_ATUACAO.includes(uf))
  return [...UFS_ATUACAO, ...demais]
}
