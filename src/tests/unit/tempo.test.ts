import { describe, expect, it } from 'vitest'
import { tempoRelativo } from '@/dominio/tempo'

describe('tempoRelativo', () => {
  const agora = new Date('2026-08-06T15:00:00-03:00')

  it('agora, minutos e horas', () => {
    expect(tempoRelativo('2026-08-06T14:59:40-03:00', agora)).toBe('agora')
    expect(tempoRelativo('2026-08-06T14:35:00-03:00', agora)).toBe('há 25 min')
    expect(tempoRelativo('2026-08-06T09:00:00-03:00', agora)).toBe('há 6 h')
  })

  it('ontem e datas antigas', () => {
    expect(tempoRelativo('2026-08-05T16:00:00-03:00', agora)).toBe('ontem')
    expect(tempoRelativo('2026-08-01T10:00:00-03:00', agora)).toBe('01/08')
  })
})
