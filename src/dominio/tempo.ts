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
