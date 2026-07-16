import { describe, expect, it } from 'vitest'
import {
  RECEIVER_SNAP_DISTANCE,
  receiverCableLength,
  solveReceiverOffset,
} from './receiverPhysics'

describe('receiver physics', () => {
  it('keeps a freshly lifted receiver free of the cradle snap zone', () => {
    expect(solveReceiverOffset(0, 0, 500, 690, false)).toMatchObject({
      x: 0,
      y: 0,
      nearCradle: false,
      hasLeftCradle: false,
    })
  })

  it('arms the cradle after the receiver travels away, then snaps at home', () => {
    const away = solveReceiverOffset(140, 30, 500, 690, false)
    expect(away.hasLeftCradle).toBe(true)

    const home = solveReceiverOffset(RECEIVER_SNAP_DISTANCE - 1, 0, 500, 690, away.hasLeftCradle)
    expect(home).toMatchObject({ x: 0, y: 0, nearCradle: true, hasLeftCradle: true })
  })

  it('keeps the receiver inside a restrained upper interaction zone', () => {
    const pose = solveReceiverOffset(900, 900, 500, 690, true)
    expect(pose.x).toBe(120)
    expect(pose.y).toBeCloseTo(65.55, 5)
    expect(pose.rotation).toBeLessThanOrEqual(7)
  })

  it('keeps the legacy cable length helper available for cord tuning', () => {
    expect(receiverCableLength(500)).toBe(430)
  })
})
