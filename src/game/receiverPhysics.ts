export interface ReceiverOffset {
  x: number
  y: number
  rotation: number
  nearCradle: boolean
  hasLeftCradle: boolean
}

export const RECEIVER_LEAVE_DISTANCE = 92
export const RECEIVER_SNAP_DISTANCE = 68
export const RECEIVER_FOLLOW_X = 0.34
export const RECEIVER_FOLLOW_Y = 0.26

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function receiverCableLength(assemblyWidth: number) {
  return Math.min(430, Math.max(275, assemblyWidth * 0.86))
}

export function solveReceiverOffset(
  rawX: number,
  rawY: number,
  assemblyWidth: number,
  assemblyHeight: number,
  hasLeftCradle: boolean,
): ReceiverOffset {
  const rawDistance = Math.hypot(rawX, rawY)
  const nextHasLeftCradle = hasLeftCradle || rawDistance > RECEIVER_LEAVE_DISTANCE
  const nearCradle = nextHasLeftCradle && rawDistance < RECEIVER_SNAP_DISTANCE

  if (nearCradle) {
    return { x: 0, y: 0, rotation: -1, nearCradle: true, hasLeftCradle: true }
  }

  const x = clamp(rawX * RECEIVER_FOLLOW_X, -assemblyWidth * 0.24, assemblyWidth * 0.24)
  const y = clamp(rawY * RECEIVER_FOLLOW_Y, -assemblyHeight * 0.1, assemblyHeight * 0.095)

  return {
    x,
    y,
    rotation: clamp(x * 0.018 - y * 0.006 - 1, -8, 7),
    nearCradle: false,
    hasLeftCradle: nextHasLeftCradle,
  }
}
