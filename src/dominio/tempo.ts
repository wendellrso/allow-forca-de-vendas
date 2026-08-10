/** A data de hoje (YYYY-MM-DD) no fuso da operação — único lugar que decide. */
export function hojeIso(agora: Date = new Date()): string {
  return agora.toLocaleDateString('en-CA', { timeZone: 'America/Maceio' })
}

/** Data curta brasileira a partir de um timestamp ISO. */
export function dataCurta(instante: string): string {
  return new Date(instante).toLocaleDateString('pt-BR', { timeZone: 'America/Maceio' })
}

/** Data curta brasileira a partir de uma data ISO pura (YYYY-MM-DD). */
export function dataCurtaDeIso(dataIso: string): string {
  return new Date(`${dataIso}T12:00:00`).toLocaleDateString('pt-BR')
}

/** Tempo relativo curto, do jeito que se fala: "há 5 min", "ontem". */
export function tempoRelativo(instante: string, agora: Date = new Date()): string {
  const diferencaMs = agora.getTime() - new Date(instante).getTime()
  const minutos = Math.floor(diferencaMs / 60_000)

  if (minutos < 1) {
    return 'agora'
  }
  if (minutos < 60) {
    return `há ${minutos} min`
  }
  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    return `há ${horas} h`
  }
  if (horas < 48) {
    return 'ontem'
  }
  return new Date(instante).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Maceio',
  })
}
