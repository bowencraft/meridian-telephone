import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
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
  const gestureRef = useRef<{
    digit: string
    pointerId: number
    startAngle: number
    center: { x: number; y: number }
    rotation: number
    lastTick: number
  } | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingRotationRef = useRef(0)
  const pendingTickRef = useRef(false)
  const moveCountRef = useRef(0)
  const renderFrameCountRef = useRef(0)
  const [activeDigit, setActiveDigit] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [returning, setReturning] = useState(false)

  function flushDialFrame() {
    frameRef.current = null
    renderFrameCountRef.current += 1
    if (dialRef.current) {
      dialRef.current.dataset.moveEvents = String(moveCountRef.current)
      dialRef.current.dataset.renderFrames = String(renderFrameCountRef.current)
    }
    setRotation(pendingRotationRef.current)
    if (pendingTickRef.current) {
      pendingTickRef.current = false
      onTick?.()
    }
  }

  function begin(event: PointerEvent<HTMLButtonElement>, digit: string) {
    if (disabled || activeDigit || returning || !dialRef.current) return
    event.preventDefault()
    const rect = dialRef.current.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const startAngle = angleFromCenter(center, { x: event.clientX, y: event.clientY })
    gestureRef.current = { digit, pointerId: event.pointerId, startAngle, center, rotation: 0, lastTick: 0 }
    moveCountRef.current = 0
    renderFrameCountRef.current = 0
    dialRef.current.dataset.moveEvents = '0'
    dialRef.current.dataset.renderFrames = '0'
    setActiveDigit(digit)
    setRotation(0)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    event.preventDefault()
    moveCountRef.current += 1
    const current = angleFromCenter(gesture.center, { x: event.clientX, y: event.clientY })
    const next = clampDialRotation(gesture.digit, clockwiseDelta(gesture.startAngle, current))
    gesture.rotation = next
    pendingRotationRef.current = next
    if (next - gesture.lastTick > 12) {
      gesture.lastTick = Math.floor(next / 12) * 12
      pendingTickRef.current = true
    }
    if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(flushDialFrame)
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    event.preventDefault()
    const digit = gesture.digit
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* capture may already be released */ }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    pendingTickRef.current = false
    gestureRef.current = null
    if (dialRef.current) {
      dialRef.current.dataset.moveEvents = String(moveCountRef.current)
      dialRef.current.dataset.renderFrames = String(renderFrameCountRef.current)
    }
    const complete = isDialComplete(digit, gesture.rotation)
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

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
  }, [])

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
      <div className="dial-wheel" style={{ transform: `translateZ(0) rotate(${rotation}deg)`, '--dial-rotation': `${rotation}deg` } as CSSProperties}>
        {ROTARY_DIGITS.map((digit) => {
          const angle = digitHoleAngle(digit)
          const radians = angle * Math.PI / 180
          return (
            <button
              key={digit}
              type="button"
              className="dial-hole"
              data-digit={digit}
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
