import { describe, expect, it } from 'vitest'
import { ROPE_ACTIVE_WINDOW_MS, collideRope, createRope, ropeLength, ropeRenderMode, stepRope } from './ropePhysics'

describe('lightweight rope physics', () => {
  it('creates a sagging rope with pinned endpoints', () => {
    const rope = createRope({ x: 0, y: 0 }, { x: 100, y: 0 }, 11, 40)
    expect(rope).toHaveLength(11)
    expect(rope[0]).toMatchObject({ x: 0, y: 0 })
    expect(rope[10]).toMatchObject({ x: 100, y: 0 })
    expect(rope[5].y).toBeCloseTo(40)
    expect(ropeLength(rope)).toBeGreaterThan(100)
  })

  it('keeps both cable ends attached while gravity advances the interior', () => {
    const rope = createRope({ x: 10, y: 20 }, { x: 90, y: 30 }, 9, 20)
    const middleBefore = rope[4].y
    stepRope(rope, { start: { x: 10, y: 20 }, end: { x: 110, y: 40 }, segmentLength: 18 })
    expect(rope[0]).toMatchObject({ x: 10, y: 20 })
    expect(rope[8]).toMatchObject({ x: 110, y: 40 })
    expect(rope[4].y).not.toBeCloseTo(middleBefore, 5)
  })

  it('pushes interior points outside the pointer collision radius', () => {
    const rope = createRope({ x: 0, y: 0 }, { x: 100, y: 0 }, 11, 0)
    rope[5].y = 1
    collideRope(rope, { x: 50, y: 0, radius: 20, strength: 1 })
    expect(Math.hypot(rope[5].x - 50, rope[5].y)).toBeCloseTo(20, 4)
  })

  it('drops to an idle render cadence without pausing a visible rope', () => {
    expect(ropeRenderMode(ROPE_ACTIVE_WINDOW_MS - 1)).toBe('active')
    expect(ropeRenderMode(ROPE_ACTIVE_WINDOW_MS)).toBe('idle')
    expect(ropeRenderMode(4_000)).toBe('idle')
    expect(ropeRenderMode(4_000, true)).toBe('paused')
  })
})
