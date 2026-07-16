import { describe, expect, it } from 'vitest'
import {
  RECEIVER_SNAP_DISTANCE,
  receiverCableLength,
  solveReceiverOffset,
} from './receiverPhysics'

describe('receiver physics', () => {
  it('keeps a freshly lifted receiver free of the cradle snap zone', () => {
    expect(solveReceiverOffset(0, 0, 500, false)).toMatchObject({
      x: 0,
      y: 0,
      nearCradle: false,
      hasLeftCradle: false,
    })
  })

  it('arms the cradle after the receiver travels away, then snaps at home', () => {
    const away = solveReceiverOffset(140, 30, 500, false)
    expect(away.hasLeftCradle).toBe(true)

    const home = solveReceiverOffset(RECEIVER_SNAP_DISTANCE - 1, 0, 500, away.hasLeftCradle)
    expect(home).toMatchObject({ x: 0, y: 0, nearCradle: true, hasLeftCradle: true })
  })

  it('limits movement to the simulated cable length', () => {
    const limit = receiverCableLength(500)
    const pose = solveReceiverOffset(900, 600, 500, true)
    expect(Math.hypot(pose.x, pose.y)).toBeCloseTo(limit, 5)
    expect(pose.rotation).toBeLessThanOrEqual(9)
  })
})
