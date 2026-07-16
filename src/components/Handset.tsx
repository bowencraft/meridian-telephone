import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { solveReceiverOffset } from '../game/receiverPhysics'

export interface HandsetPose {
  x: number
  y: number
  xPercent: number
  yPercent: number
  rotation: number
  nearCradle: boolean
  carrying: boolean
}

interface HandsetProps {
  docked: boolean
  ringing: boolean
  disabled?: boolean
  onLift: () => void
  onHangup: () => void
  onPoseChange?: (pose: HandsetPose) => void
}

interface CarryGeometry {
  homeX: number
  homeY: number
  grabX: number
  grabY: number
  assemblyWidth: number
  assemblyHeight: number
  scale: number
}

const HOME_POSE: HandsetPose = {
  x: 0,
  y: 0,
  xPercent: 0,
  yPercent: 0,
  rotation: -1,
  nearCradle: false,
  carrying: false,
}

export function Handset({ docked, ringing, disabled, onLift, onHangup, onPoseChange }: HandsetProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const geometryRef = useRef<CarryGeometry | null>(null)
  const leftCradleRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const pendingPoseRef = useRef<HandsetPose | null>(null)
  const [carrying, setCarrying] = useState(false)
  const [pose, setPose] = useState(HOME_POSE)

  const effectiveCarrying = carrying && !docked
  const effectivePose = docked ? HOME_POSE : pose

  const publish = useCallback((next: HandsetPose) => {
    pendingPoseRef.current = next
    if (frameRef.current !== null) return
    frameRef.current = window.requestAnimationFrame(() => {
      const pending = pendingPoseRef.current
      frameRef.current = null
      if (!pending) return
      setPose(pending)
      onPoseChange?.(pending)
    })
  }, [onPoseChange])

  function captureGeometry(event: PointerEvent<HTMLButtonElement>) {
    if (!docked && geometryRef.current) return
    const element = buttonRef.current
    const assembly = element?.closest<HTMLElement>('.phone-assembly')
    if (!element || !assembly) return
    const handsetRect = element.getBoundingClientRect()
    const assemblyRect = assembly.getBoundingClientRect()
    const scale = assembly.offsetWidth ? assemblyRect.width / assembly.offsetWidth : 1
    const centerX = handsetRect.left + handsetRect.width / 2
    const centerY = handsetRect.top + handsetRect.height / 2
    geometryRef.current = {
      homeX: centerX,
      homeY: centerY,
      grabX: event.clientX - centerX,
      grabY: event.clientY - centerY,
      assemblyWidth: assembly.offsetWidth,
      assemblyHeight: assembly.offsetHeight,
      scale: scale || 1,
    }
  }

  const replaceReceiver = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    pendingPoseRef.current = null
    setCarrying(false)
    leftCradleRef.current = false
    geometryRef.current = null
    setPose(HOME_POSE)
    onPoseChange?.(HOME_POSE)
    onHangup()
  }, [onHangup, onPoseChange])

  function toggleReceiver() {
    if (disabled) return
    if (docked) {
      leftCradleRef.current = false
      const lifted = { ...HOME_POSE, carrying: true }
      setCarrying(true)
      setPose(lifted)
      onPoseChange?.(lifted)
      onLift()
      return
    }
    replaceReceiver()
  }

  useEffect(() => {
    if (!effectiveCarrying || disabled) return

    const move = (event: globalThis.PointerEvent) => {
      const geometry = geometryRef.current
      if (!geometry) return
      const rawX = (event.clientX - geometry.grabX - geometry.homeX) / geometry.scale
      const rawY = (event.clientY - geometry.grabY - geometry.homeY) / geometry.scale
      const solved = solveReceiverOffset(rawX, rawY, geometry.assemblyWidth, leftCradleRef.current)
      leftCradleRef.current = solved.hasLeftCradle

      if (solved.nearCradle) {
        publish({ ...HOME_POSE, nearCradle: true, carrying: true })
        return
      }

      publish({
        x: solved.x,
        y: solved.y,
        xPercent: solved.x / geometry.assemblyWidth * 100,
        yPercent: solved.y / geometry.assemblyHeight * 100,
        rotation: solved.rotation,
        nearCradle: false,
        carrying: true,
      })
    }

    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [disabled, effectiveCarrying, publish])

  useEffect(() => {
    if (!effectiveCarrying || disabled) return
    let placementGesture: { pointerId: number; x: number; y: number; moved: boolean } | null = null

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('a, button, input, textarea, select, [role="button"], .rotary-dial'))

    const placeOnClick = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) return
      if (isInteractiveTarget(event.target)) return
      if (event.pointerType !== 'mouse') {
        placementGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        return
      }
      replaceReceiver()
    }

    const trackPlacementGesture = (event: globalThis.PointerEvent) => {
      if (!placementGesture || placementGesture.pointerId !== event.pointerId) return
      if (Math.hypot(event.clientX - placementGesture.x, event.clientY - placementGesture.y) > 12) placementGesture.moved = true
    }

    const finishPlacementGesture = (event: globalThis.PointerEvent) => {
      if (!placementGesture || placementGesture.pointerId !== event.pointerId) return
      const shouldReplace = !placementGesture.moved
      placementGesture = null
      if (shouldReplace) replaceReceiver()
    }

    window.addEventListener('pointerdown', placeOnClick)
    window.addEventListener('pointermove', trackPlacementGesture, { passive: true })
    window.addEventListener('pointerup', finishPlacementGesture)
    window.addEventListener('pointercancel', finishPlacementGesture)
    return () => {
      window.removeEventListener('pointerdown', placeOnClick)
      window.removeEventListener('pointermove', trackPlacementGesture)
      window.removeEventListener('pointerup', finishPlacementGesture)
      window.removeEventListener('pointercancel', finishPlacementGesture)
    }
  }, [disabled, effectiveCarrying, replaceReceiver])

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
  }, [])

  function keyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleReceiver()
  }

  const style = {
    '--handset-x': `${effectivePose.x}px`,
    '--handset-y': `${effectivePose.y}px`,
    '--handset-rotation': `${effectivePose.rotation}deg`,
  } as CSSProperties

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`handset ${docked ? 'is-docked' : 'is-lifted'} ${effectiveCarrying ? 'is-carrying' : ''} ${effectivePose.nearCradle ? 'is-near-cradle' : ''} ${ringing ? 'is-ringing' : ''}`}
      style={style}
      aria-label={docked ? '点击拿起听筒' : '再次点击放下听筒；靠近挂钩会吸附'}
      aria-pressed={!docked}
      disabled={disabled}
      onPointerDown={captureGeometry}
      onClick={toggleReceiver}
      onKeyDown={keyboard}
    >
      <span className="handset-earpiece"><i /><i /><i /><i /><i /></span>
      <span className="handset-grip"><em>GPO 706</em><small>{docked ? 'LIFT RECEIVER' : 'CLICK TO REPLACE'}</small></span>
      <span className="handset-mouthpiece"><i /><i /><i /><i /><i /></span>
      <span className="handset-cord-joint" aria-hidden="true" />
    </button>
  )
}
