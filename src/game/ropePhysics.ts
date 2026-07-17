export interface RopeVector { x: number; y: number }

export interface RopePoint extends RopeVector {
  previousX: number
  previousY: number
}

export interface RopeCollision extends RopeVector {
  radius: number
  strength?: number
}

export interface RopeStepOptions {
  start: RopeVector
  end: RopeVector
  segmentLength: number
  gravity?: number
  damping?: number
  iterations?: number
  collision?: RopeCollision | null
}

export const ROPE_ACTIVE_WINDOW_MS = 950
export const ROPE_IDLE_FRAME_MS = 120

export function ropeRenderMode(elapsedSinceInteraction: number, hidden = false): 'active' | 'idle' | 'paused' {
  if (hidden) return 'paused'
  return elapsedSinceInteraction < ROPE_ACTIVE_WINDOW_MS ? 'active' : 'idle'
}

export function createRope(start: RopeVector, end: RopeVector, count = 21, sag = 110): RopePoint[] {
  const pointCount = Math.max(3, count)
  return Array.from({ length: pointCount }, (_, index) => {
    const t = index / (pointCount - 1)
    const x = start.x + (end.x - start.x) * t
    const y = index === 0 ? start.y : index === pointCount - 1 ? end.y : start.y + (end.y - start.y) * t + Math.sin(Math.PI * t) * sag
    return { x, y, previousX: x, previousY: y }
  })
}

export function ropeLength(points: RopePoint[]) {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  }
  return length
}

function pin(point: RopePoint, anchor: RopeVector) {
  point.x = anchor.x
  point.y = anchor.y
  point.previousX = anchor.x
  point.previousY = anchor.y
}

export function collideRope(points: RopePoint[], collision: RopeCollision) {
  const strength = collision.strength ?? 0.92
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const dx = point.x - collision.x
    const dy = point.y - collision.y
    const distance = Math.hypot(dx, dy)
    if (distance >= collision.radius) continue
    const safeDistance = distance || 0.001
    const push = (collision.radius - safeDistance) * strength
    point.x += dx / safeDistance * push
    point.y += dy / safeDistance * push
  }
}

export function constrainRope(points: RopePoint[], options: RopeStepOptions) {
  const iterations = options.iterations ?? 7
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    pin(points[0], options.start)
    pin(points[points.length - 1], options.end)
    for (let index = 0; index < points.length - 1; index += 1) {
      const first = points[index]
      const second = points[index + 1]
      const dx = second.x - first.x
      const dy = second.y - first.y
      const distance = Math.hypot(dx, dy) || 0.001
      const correction = (distance - options.segmentLength) / distance
      const firstPinned = index === 0
      const secondPinned = index + 1 === points.length - 1

      if (!firstPinned && !secondPinned) {
        first.x += dx * correction * 0.5
        first.y += dy * correction * 0.5
        second.x -= dx * correction * 0.5
        second.y -= dy * correction * 0.5
      } else if (firstPinned && !secondPinned) {
        second.x -= dx * correction
        second.y -= dy * correction
      } else if (!firstPinned && secondPinned) {
        first.x += dx * correction
        first.y += dy * correction
      }
    }
  }
  pin(points[0], options.start)
  pin(points[points.length - 1], options.end)
}

export function stepRope(points: RopePoint[], options: RopeStepOptions) {
  const gravity = options.gravity ?? 0.46
  const damping = options.damping ?? 0.982
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const velocityX = (point.x - point.previousX) * damping
    const velocityY = (point.y - point.previousY) * damping
    point.previousX = point.x
    point.previousY = point.y
    point.x += velocityX
    point.y += velocityY + gravity
  }
  if (options.collision) collideRope(points, options.collision)
  constrainRope(points, options)
}
