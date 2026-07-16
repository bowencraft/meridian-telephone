const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const

export interface Point { x: number; y: number }

export function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

export function angleFromCenter(center: Point, point: Point) {
  return normalizeDegrees(Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI)
}

export function clockwiseDelta(startAngle: number, currentAngle: number) {
  return normalizeDegrees(currentAngle - startAngle)
}

export function digitIndex(digit: string) {
  return DIGITS.indexOf(digit as typeof DIGITS[number])
}

export function requiredRotationForDigit(digit: string) {
  const index = digitIndex(digit)
  if (index < 0) throw new Error(`Unsupported rotary digit: ${digit}`)
  return 62 + index * 23.5
}

export function clampDialRotation(digit: string, rotation: number) {
  return Math.max(0, Math.min(requiredRotationForDigit(digit), rotation))
}

export function isDialComplete(digit: string, rotation: number) {
  const required = requiredRotationForDigit(digit)
  return rotation >= required * 0.88
}

export function digitHoleAngle(digit: string) {
  const index = digitIndex(digit)
  if (index < 0) throw new Error(`Unsupported rotary digit: ${digit}`)
  // The finger stop sits at roughly 22°. Each higher digit begins farther
  // counter-clockwise, so its clockwise pull (and pulse train) is longer.
  return -40 - index * 23.5
}

export function appendDigit(current: string, digit: string, maximumLength = 7) {
  if (digitIndex(digit) < 0 || current.length >= maximumLength) return current
  return `${current}${digit}`
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '')
}

export function formatPhoneNumber(value: string) {
  const digits = normalizePhoneNumber(value)
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)}`
}

export function shouldConnect(number: string, emergencyNumbers: string[] = ['999']) {
  const digits = normalizePhoneNumber(number)
  return emergencyNumbers.includes(digits) || digits.length >= 7
}

export const ROTARY_DIGITS = DIGITS
