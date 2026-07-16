import { useRef, useState, type PointerEvent } from 'react'
import {
  ROTARY_DIGITS,
  angleFromCenter,
  clampDialRotation,
  clockwiseDelta,
  digitHoleAngle,
  isDialComplete,
  requiredRotationForDigit,
} from '../game/dialModel'

interface RotaryDialProps {
  disabled?: boolean
  onDigit: (digit: string) => void
  onTick?: () => void
  onReturn?: (digit: string) => void
  onError?: () => void
}

export function RotaryDial({ disabled, onDigit, onTick, onReturn, onError }: RotaryDialProps) {
  const dialRef = useRef<HTMLDivElement>(null)
  const [activeDigit, setActiveDigit] = useState<string | null>(null)
  const [startAngle, setStartAngle] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [returning, setReturning] = useState(false)
  const lastTickRef = useRef(0)

  function begin(event: PointerEvent<HTMLButtonElement>, digit: string) {
    if (disabled || activeDigit || returning || !dialRef.current) return
    event.preventDefault()
    const rect = dialRef.current.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    setActiveDigit(digit)
    setStartAngle(angleFromCenter(center, { x: event.clientX, y: event.clientY }))
    setRotation(0)
    lastTickRef.current = 0
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!activeDigit || !dialRef.current) return
    const rect = dialRef.current.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const current = angleFromCenter(center, { x: event.clientX, y: event.clientY })
    const next = clampDialRotation(activeDigit, clockwiseDelta(startAngle, current))
    setRotation(next)
    if (next - lastTickRef.current > 12) {
      lastTickRef.current = next
      onTick?.()
    }
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    if (!activeDigit) return
    const digit = activeDigit
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* capture may already be released */ }
    const complete = isDialComplete(digit, rotation)
    setActiveDigit(null)
    setReturning(true)
    if (complete) {
      setRotation(requiredRotationForDigit(digit))
      onReturn?.(digit)
    } else {
      onError?.()
    }
    window.setTimeout(() => setRotation(0), 30)
    window.setTimeout(() => {
      setReturning(false)
      if (complete) onDigit(digit)
    }, 560)
  }

  function keyDial(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled || returning || activeDigit || !/^\d$/.test(event.key)) return
    event.preventDefault()
    const digit = event.key
    setReturning(true)
    setRotation(requiredRotationForDigit(digit))
    onReturn?.(digit)
    window.setTimeout(() => setRotation(0), 50)
    window.setTimeout(() => { setReturning(false); onDigit(digit) }, 560)
  }

  return (
    <div
      ref={dialRef}
      className={`rotary-dial ${activeDigit ? 'is-dragging' : ''} ${returning ? 'is-returning' : ''} ${disabled ? 'is-disabled' : ''}`}
      onKeyDown={keyDial}
      tabIndex={disabled ? -1 : 0}
      role="group"
      aria-label="转盘拨号器。可拖动数字孔至挡片，也可使用数字键。"
    >
      <div className="dial-underplate">
        {ROTARY_DIGITS.map((digit) => {
          const angle = digitHoleAngle(digit)
          const radians = angle * Math.PI / 180
          return (
            <span
              key={`plate-${digit}`}
              className="dial-printed-digit"
              style={{ left: `${50 + Math.cos(radians) * 38}%`, top: `${50 + Math.sin(radians) * 38}%` }}
            >{digit}</span>
          )
        })}
      </div>
      <div className="dial-finger-stop"><i /></div>
      <div className="dial-wheel" style={{ transform: `rotate(${rotation}deg)` }}>
        {ROTARY_DIGITS.map((digit) => {
          const angle = digitHoleAngle(digit)
          const radians = angle * Math.PI / 180
          return (
            <button
              key={digit}
              type="button"
              className="dial-hole"
              style={{ left: `${50 + Math.cos(radians) * 37.5}%`, top: `${50 + Math.sin(radians) * 37.5}%` }}
              aria-label={`拨 ${digit}`}
              disabled={disabled}
              onPointerDown={(event) => begin(event, digit)}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
            ><span>{digit}</span></button>
          )
        })}
        <div className="dial-center">
          <span>GPO</span>
          <small>PUBLIC<br />TELEPHONE</small>
        </div>
      </div>
    </div>
  )
}
