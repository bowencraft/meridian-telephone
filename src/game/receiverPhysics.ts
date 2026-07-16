export interface ReceiverOffset {
  x: number
  y: number
  rotation: number
  nearCradle: boolean
  hasLeftCradle: boolean
}

export const RECEIVER_LEAVE_DISTANCE = 92
export const RECEIVER_SNAP_DISTANCE = 68

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
  hasLeftCradle: boolean,
): ReceiverOffset {
  const rawDistance = Math.hypot(rawX, rawY)
  const nextHasLeftCradle = hasLeftCradle || rawDistance > RECEIVER_LEAVE_DISTANCE
  const nearCradle = nextHasLeftCradle && rawDistance < RECEIVER_SNAP_DISTANCE

  if (nearCradle) {
    return { x: 0, y: 0, rotation: -1, nearCradle: true, hasLeftCradle: true }
  }

  const maximumLength = receiverCableLength(assemblyWidth)
  const ratio = rawDistance > maximumLength ? maximumLength / rawDistance : 1
  const x = rawX * ratio
  const y = rawY * ratio

  return {
    x,
    y,
    rotation: clamp(x * 0.022 - y * 0.009 - 1, -11, 9),
    nearCradle: false,
    hasLeftCradle: nextHasLeftCradle,
  }
}
