import { describe, expect, it } from 'vitest'
import {
  appendDigit,
  clockwiseDelta,
  formatPhoneNumber,
  isDialComplete,
  normalizePhoneNumber,
  requiredRotationForDigit,
  shouldConnect,
} from './dialModel'

describe('rotary dial model', () => {
  it('requires progressively longer rotation through zero', () => {
    expect(requiredRotationForDigit('1')).toBeLessThan(requiredRotationForDigit('5'))
    expect(requiredRotationForDigit('5')).toBeLessThan(requiredRotationForDigit('0'))
  })

  it('handles clockwise angle wrap', () => {
    expect(clockwiseDelta(350, 20)).toBe(30)
    expect(clockwiseDelta(20, 350)).toBe(330)
  })

  it('only accepts a nearly complete pull', () => {
    const required = requiredRotationForDigit('7')
    expect(isDialComplete('7', required * 0.5)).toBe(false)
    expect(isDialComplete('7', required * 0.9)).toBe(true)
  })

  it('formats and caps dialled numbers', () => {
    expect(normalizePhoneNumber('871 4019')).toBe('8714019')
    expect(formatPhoneNumber('8714019')).toBe('871 4019')
    expect(appendDigit('1234567', '8')).toBe('1234567')
  })

  it('connects emergency and seven-digit numbers', () => {
    expect(shouldConnect('99')).toBe(false)
    expect(shouldConnect('999')).toBe(true)
    expect(shouldConnect('8714000')).toBe(true)
  })
})
