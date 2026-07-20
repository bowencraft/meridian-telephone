import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
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
  const returningRef = useRef(false)
  const timerRefs = useRef<number[]>([])
  const digitQueueRef = useRef<string[]>([])
  const settleDialRef = useRef<(digit: string, complete: boolean, commitOnReturn?: boolean) => void>(() => undefined)
  const suppressClickRef = useRef<string | null>(null)
  const disabledRef = useRef(Boolean(disabled))
  const [activeDigit, setActiveDigit] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [returning, setReturning] = useState(false)

  const settleDial = useCallback((digit: string, complete: boolean, commitOnReturn = true) => {
    returningRef.current = true
    setReturning(true)
    if (complete) {
      setRotation(requiredRotationForDigit(digit))
      onReturn?.(digit)
    } else {
      onError?.()
    }
    timerRefs.current.push(window.setTimeout(() => setRotation(0), 30))
    timerRefs.current.push(window.setTimeout(() => {
      returningRef.current = false
      setReturning(false)
      if (complete && commitOnReturn) onDigit(digit)
      const queued = digitQueueRef.current.shift()
      if (queued && !disabledRef.current) settleDialRef.current(queued, true, true)
    }, 560))
  }, [onDigit, onError, onReturn])

  useEffect(() => {
    settleDialRef.current = settleDial
    disabledRef.current = Boolean(disabled)
  }, [disabled, settleDial])

  const queueDigit = useCallback((digit: string) => {
    if (disabledRef.current) return
    if (returningRef.current || gestureRef.current) {
      if (digitQueueRef.current.length < 10) digitQueueRef.current.push(digit)
      return
    }
    settleDialRef.current(digit, true, true)
  }, [])

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
    if (disabled || activeDigit || returningRef.current || !dialRef.current) return
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
    // A press-and-release with no drag is an intentional accessible shortcut.
    // Physical dragging remains available, but a first-time player can also
    // click the printed hole once per digit without learning the gesture.
    const complete = moveCountRef.current === 0 || isDialComplete(digit, gesture.rotation)
    if (event.type === 'pointerup') suppressClickRef.current = digit
    setActiveDigit(null)
    settleDial(digit, complete)
  }

  useEffect(() => {
    function keyDial(event: KeyboardEvent) {
      const target = event.target
      const isTyping = target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
      if (isTyping || disabled || activeDigit || !/^\d$/.test(event.key)) return
      event.preventDefault()
      // Keyboard input is recorded immediately, while the first digit still
      // animates the physical wheel. This keeps normal typing responsive and
      // avoids making players wait four seconds before seeing seven digits.
      onDigit(event.key)
      if (!returningRef.current && !gestureRef.current) settleDialRef.current(event.key, true, false)
    }
    window.addEventListener('keydown', keyDial)
    return () => window.removeEventListener('keydown', keyDial)
  }, [activeDigit, disabled, onDigit])

  useEffect(() => {
    if (disabled) digitQueueRef.current = []
  }, [disabled])

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    timerRefs.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  return (
    <div
      ref={dialRef}
      className={`rotary-dial ${activeDigit ? 'is-dragging' : ''} ${returning ? 'is-returning' : ''} ${disabled ? 'is-disabled' : ''}`}
      tabIndex={disabled ? -1 : 0}
      role="group"
      aria-label="转盘拨号器。可单击数字孔、拖动数字孔至挡片，或直接使用数字键。"
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
              onClick={() => {
                if (suppressClickRef.current === digit) {
                  suppressClickRef.current = null
                  return
                }
                queueDigit(digit)
              }}
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
