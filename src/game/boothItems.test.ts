import { describe, expect, it } from 'vitest'
import { canDialWithCredit, coinCountForNight, createNightCoins, returnedCoin } from './boothItems'

describe('booth shelf inventory', () => {
  it('places one to three coins on every new night', () => {
    for (let seed = 1; seed <= 80; seed += 1) {
      expect(coinCountForNight(seed)).toBeGreaterThanOrEqual(1)
      expect(coinCountForNight(seed)).toBeLessThanOrEqual(3)
    }
  })

  it('is stable for a session seed', () => {
    expect(createNightCoins(1968)).toEqual(createNightCoins(1968))
    expect(createNightCoins(1968)).toHaveLength(coinCountForNight(1968))
  })

  it('returns a spent credit to a visible shelf position', () => {
    expect(returnedCoin('returned-1', 2)).toMatchObject({ id: 'returned-1', denomination: 'THREE PENCE' })
  })

  it('only permits outgoing digits with credit and an off-hook phase', () => {
    expect(canDialWithCredit('offHook', 1)).toBe(true)
    expect(canDialWithCredit('dialing', 1)).toBe(true)
    expect(canDialWithCredit('ringing', 1)).toBe(false)
    expect(canDialWithCredit('offHook', 0)).toBe(false)
  })
})
