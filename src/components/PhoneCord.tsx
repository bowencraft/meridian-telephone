import { useEffect, useRef } from 'react'
import {
  ROPE_IDLE_FRAME_MS,
  createRope,
  ropeRenderMode,
  stepRope,
  type RopeCollision,
  type RopePoint,
  type RopeVector,
} from '../game/ropePhysics'
import type { HandsetPose } from './Handset'

interface PhoneCordProps {
  lifted: boolean
  pose: HandsetPose
}

function handsetAnchor(width: number, height: number, pose: HandsetPose): RopeVector {
  return {
    x: width * 0.155 + pose.x,
    y: height * 0.265 + pose.y,
  }
}

function phoneAnchor(width: number, height: number): RopeVector {
  return { x: width * 0.183, y: height * 0.768 }
}

function cablePath(points: RopePoint[]) {
  const path = new Path2D()
  path.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const next = points[index + 1]
    path.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2)
  }
  const end = points[points.length - 1]
  path.lineTo(end.x, end.y)
  return path
}

export function PhoneCord({ lifted, pose }: PhoneCordProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const poseRef = useRef(pose)
  const liftedRef = useRef(lifted)

  useEffect(() => { poseRef.current = pose }, [pose])
  useEffect(() => { liftedRef.current = lifted }, [lifted])

  useEffect(() => {
    const canvas = canvasRef.current
    const assembly = canvas?.closest<HTMLElement>('.phone-assembly')
    const context = canvas?.getContext('2d')
    if (!canvas || !assembly || !context) return

    let width = 0
    let height = 0
    let points: RopePoint[] = []
    let segmentLength = 0
    let animationFrame = 0
    let idleTimer: number | null = null
    let lastInteraction = performance.now()
    let collision: RopeCollision | null = null
    let pointerPosition: { clientX: number; clientY: number } | null = null
    let canvasRect = canvas.getBoundingClientRect()
    let rubberGradient: CanvasGradient | null = null
    let frameCount = 0
    const compactMode = window.matchMedia('(max-width: 760px)').matches

    const cancelScheduledDraw = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      if (idleTimer !== null) window.clearTimeout(idleTimer)
      animationFrame = 0
      idleTimer = null
    }

    const scheduleDraw = (idle = false) => {
      if (document.hidden || animationFrame || idleTimer !== null) return
      if (idle) {
        idleTimer = window.setTimeout(() => {
          idleTimer = null
          animationFrame = window.requestAnimationFrame(draw)
        }, ROPE_IDLE_FRAME_MS)
      } else {
        animationFrame = window.requestAnimationFrame(draw)
      }
    }

    const resize = () => {
      const rect = assembly.getBoundingClientRect()
      width = assembly.offsetWidth
      height = assembly.offsetHeight
      canvasRect = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(compactMode ? 1.25 : 2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(rect.width * pixelRatio))
      canvas.height = Math.max(1, Math.round(rect.height * pixelRatio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      rubberGradient = context.createLinearGradient(0, 0, width, height)
      rubberGradient.addColorStop(0, '#4a4a42')
      rubberGradient.addColorStop(0.34, '#181916')
      rubberGradient.addColorStop(0.72, '#34352e')
      rubberGradient.addColorStop(1, '#090a08')
      const start = phoneAnchor(width, height)
      const end = handsetAnchor(width, height, poseRef.current)
      const cableLength = Math.max(Math.hypot(end.x - start.x, end.y - start.y) * 1.07, height * 0.64)
      points = createRope(start, end, compactMode ? 16 : 22, height * 0.16)
      points.forEach((point, index) => {
        const t = index / (points.length - 1)
        const outwardBow = Math.sin(Math.PI * t) * width * 0.205
        point.x -= outwardBow
        point.previousX = point.x
      })
      segmentLength = cableLength / (points.length - 1)
      lastInteraction = performance.now()
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer)
        idleTimer = null
      }
      scheduleDraw()
    }

    const pointer = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointerPosition = { clientX: event.clientX, clientY: event.clientY }
      const nearCanvas = event.clientX >= canvasRect.left - 60
        && event.clientX <= canvasRect.right + 60
        && event.clientY >= canvasRect.top - 60
        && event.clientY <= canvasRect.bottom + 60
      if (!liftedRef.current && !nearCanvas) {
        collision = null
        canvas.dataset.collision = 'idle'
        return
      }
      lastInteraction = performance.now()
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer)
        idleTimer = null
      }
      scheduleDraw()
    }

    const draw = (timestamp: number) => {
      animationFrame = 0
      if (document.hidden || !points.length) {
        canvas.dataset.renderMode = 'paused'
        return
      }

      if (pointerPosition) {
        const scaleX = width / canvasRect.width
        const scaleY = height / canvasRect.height
        const x = (pointerPosition.clientX - canvasRect.left) * scaleX
        const y = (pointerPosition.clientY - canvasRect.top) * scaleY
        const inside = x > -30 && x < width + 30 && y > -30 && y < height + 30
        const nearestPoint = points.reduce((nearest, point) => Math.min(nearest, Math.hypot(point.x - x, point.y - y)), Number.POSITIVE_INFINITY)
        const touchingCable = inside && nearestPoint < (liftedRef.current ? 46 : 38)
        collision = touchingCable ? { x, y, radius: liftedRef.current ? 31 : 25, strength: 0.82 } : null
        canvas.dataset.collision = touchingCable ? 'active' : 'idle'
      }

      const idleMode = ropeRenderMode(timestamp - lastInteraction) === 'idle'
      const start = phoneAnchor(width, height)
      const end = handsetAnchor(width, height, poseRef.current)
      for (let index = 1; index < points.length - 1; index += 1) {
        const t = index / (points.length - 1)
        const lateralWeight = Math.sin(Math.PI * t)
        if (idleMode) {
          points[index].x += lateralWeight * Math.sin(timestamp * 0.00115 + t * 1.7) * 0.018
        } else {
          points[index].x -= lateralWeight * 0.055
          points[index].previousX -= lateralWeight * 0.055
        }
      }
      stepRope(points, {
        start,
        end,
        segmentLength,
        gravity: liftedRef.current ? 0.42 : 0.5,
        damping: 0.984,
        iterations: compactMode ? 5 : 8,
        collision,
      })
      for (let index = 1; index < points.length - 1; index += 1) {
        if (points[index].x < 7) {
          points[index].x = 7
          points[index].previousX = Math.min(points[index].previousX, 7)
        }
      }

      context.clearRect(0, 0, width, height)
      context.save()
      context.lineCap = 'round'
      context.lineJoin = 'round'
      const path = cablePath(points)

      context.strokeStyle = 'rgba(0, 0, 0, .76)'
      context.lineWidth = 11
      context.shadowColor = 'rgba(0, 0, 0, .72)'
      context.shadowBlur = 7
      context.shadowOffsetX = 3
      context.shadowOffsetY = 5
      context.stroke(path)

      context.shadowColor = 'transparent'
      context.strokeStyle = rubberGradient ?? '#181916'
      context.lineWidth = 8.2
      context.stroke(path)

      context.strokeStyle = collision ? 'rgba(232, 226, 197, .56)' : 'rgba(218, 213, 187, .44)'
      context.lineWidth = collision ? 1.7 : 1.45
      context.setLineDash([2.2, 5.4])
      context.lineDashOffset = -timestamp * 0.004
      context.stroke(path)
      context.restore()

      frameCount += 1
      const motionSample = points[Math.floor(points.length / 2)]
      canvas.dataset.renderMode = idleMode ? 'idle' : 'active'
      canvas.dataset.frameCount = String(frameCount)
      canvas.dataset.lastRender = String(Math.round(timestamp))
      canvas.dataset.motionSample = `${motionSample.x.toFixed(3)},${motionSample.y.toFixed(3)}`
      scheduleDraw(idleMode)
    }

    const visibility = () => {
      cancelScheduledDraw()
      if (document.hidden) {
        canvas.dataset.renderMode = 'paused'
        return
      }
      lastInteraction = performance.now()
      canvasRect = canvas.getBoundingClientRect()
      scheduleDraw()
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(assembly)
    window.addEventListener('pointermove', pointer, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    scheduleDraw()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', pointer)
      document.removeEventListener('visibilitychange', visibility)
      cancelScheduledDraw()
    }
  }, [lifted])

  return (
    <>
      <span className="cord-grommet cord-grommet-phone" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className={`phone-cord-canvas ${lifted ? 'is-stretched' : ''} ${pose.nearCradle ? 'is-snapping' : ''}`}
        data-cord-start="phone"
        data-cord-end="handset"
        aria-hidden="true"
      />
    </>
  )
}
