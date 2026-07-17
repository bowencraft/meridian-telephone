import { describe, expect, it } from 'vitest'
import { elapsedSeconds, formatDuration, timeoutStage } from './callTimer'

describe('call timer', () => {
  it('formats monotonic call duration', () => {
    expect(elapsedSeconds(1000, 65999)).toBe(64)
    expect(formatDuration(64)).toBe('01:04')
  })

  it('reports warning before expiration', () => {
    expect(timeoutStage(2000, 7000, 10000)).toBe('active')
    expect(timeoutStage(7000, 7000, 10000)).toBe('warning')
    expect(timeoutStage(10000, 7000, 10000)).toBe('expired')
  })
})
