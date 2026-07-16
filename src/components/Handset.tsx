import { useRef, useState, type PointerEvent } from 'react'

interface HandsetProps {
  docked: boolean
  ringing: boolean
  disabled?: boolean
  onLift: () => void
  onHangup: () => void
}

export function Handset({ docked, ringing, disabled, onLift, onHangup }: HandsetProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number; moved: boolean; wasDocked: boolean } | null>(null)

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (disabled) return
    event.preventDefault()
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y, moved: false, wasDocked: docked }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (docked) onLift()
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    let x = drag.originX + event.clientX - drag.x
    let y = drag.originY + event.clientY - drag.y
    const length = Math.hypot(x, y)
    const maxLength = 205
    if (length > maxLength) { x = x / length * maxLength; y = y / length * maxLength }
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag.moved = true
    setOffset({ x, y })
  }

  function up(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag) return
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* capture may already be released */ }
    dragRef.current = null
    if (Math.hypot(offset.x, offset.y) < 48) {
      setOffset({ x: 0, y: 0 })
      if (!drag.wasDocked && !docked) onHangup()
    }
  }

  function keyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (docked) onLift()
    else { setOffset({ x: 0, y: 0 }); onHangup() }
  }

  const position = docked ? { x: 0, y: 0 } : offset.x === 0 && offset.y === 0 ? { x: -74, y: 62 } : offset

  return (
    <button
      type="button"
      className={`handset ${docked ? 'is-docked' : 'is-lifted'} ${ringing ? 'is-ringing' : ''}`}
      style={{ '--handset-x': `${position.x}px`, '--handset-y': `${position.y}px` } as React.CSSProperties}
      aria-label={docked ? '提起听筒' : '将听筒拖回挂钩或按回车挂断'}
      disabled={disabled}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={keyboard}
    >
      <span className="handset-earpiece"><i /><i /><i /></span>
      <span className="handset-grip"><em>GPO 706</em></span>
      <span className="handset-mouthpiece"><i /><i /><i /></span>
    </button>
  )
}
