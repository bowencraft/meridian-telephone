import { useEffect, useRef } from 'react'
import { createRope, stepRope, type RopeCollision, type RopePoint, type RopeVector } from '../game/ropePhysics'
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

function traceCable(context: CanvasRenderingContext2D, points: RopePoint[]) {
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const next = points[index + 1]
    context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2)
  }
  const end = points[points.length - 1]
  context.lineTo(end.x, end.y)
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
    let lastInteraction = performance.now()
    let collision: RopeCollision | null = null

    const resize = () => {
      const rect = assembly.getBoundingClientRect()
      width = assembly.offsetWidth
      height = assembly.offsetHeight
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(rect.width * pixelRatio))
      canvas.height = Math.max(1, Math.round(rect.height * pixelRatio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      const start = phoneAnchor(width, height)
      const end = handsetAnchor(width, height, poseRef.current)
      const cableLength = Math.max(Math.hypot(end.x - start.x, end.y - start.y) * 1.07, height * 0.64)
      points = createRope(start, end, 22, height * 0.16)
      points.forEach((point, index) => {
        const t = index / (points.length - 1)
        const outwardBow = Math.sin(Math.PI * t) * width * 0.205
        point.x -= outwardBow
        point.previousX = point.x
      })
      segmentLength = cableLength / (points.length - 1)
      lastInteraction = performance.now()
      if (!animationFrame) animationFrame = window.requestAnimationFrame(draw)
    }

    const pointer = (event: globalThis.PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const x = (event.clientX - rect.left) * scaleX
      const y = (event.clientY - rect.top) * scaleY
      const inside = x > -30 && x < width + 30 && y > -30 && y < height + 30
      const nearestPoint = points.reduce((nearest, point) => Math.min(nearest, Math.hypot(point.x - x, point.y - y)), Number.POSITIVE_INFINITY)
      const touchingCable = inside && nearestPoint < (liftedRef.current ? 46 : 38)
      collision = touchingCable ? { x, y, radius: liftedRef.current ? 31 : 25, strength: 0.82 } : null
      canvas.dataset.collision = touchingCable ? 'active' : 'idle'
      lastInteraction = performance.now()
      if (!animationFrame) animationFrame = window.requestAnimationFrame(draw)
    }

    const draw = (timestamp: number) => {
      const start = phoneAnchor(width, height)
      const end = handsetAnchor(width, height, poseRef.current)
      for (let index = 1; index < points.length - 1; index += 1) {
        const t = index / (points.length - 1)
        const lateralWeight = Math.sin(Math.PI * t) * 0.055
        points[index].x -= lateralWeight
        points[index].previousX -= lateralWeight
      }
      stepRope(points, {
        start,
        end,
        segmentLength,
        gravity: liftedRef.current ? 0.42 : 0.5,
        damping: 0.984,
        iterations: 8,
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

      traceCable(context, points)
      context.strokeStyle = 'rgba(0, 0, 0, .76)'
      context.lineWidth = 11
      context.shadowColor = 'rgba(0, 0, 0, .72)'
      context.shadowBlur = 7
      context.shadowOffsetX = 3
      context.shadowOffsetY = 5
      context.stroke()

      context.shadowColor = 'transparent'
      traceCable(context, points)
      const rubber = context.createLinearGradient(0, 0, width, height)
      rubber.addColorStop(0, '#4a4a42')
      rubber.addColorStop(0.34, '#181916')
      rubber.addColorStop(0.72, '#34352e')
      rubber.addColorStop(1, '#090a08')
      context.strokeStyle = rubber
      context.lineWidth = 8.2
      context.stroke()

      traceCable(context, points)
      context.strokeStyle = 'rgba(218, 213, 187, .44)'
      context.lineWidth = 1.45
      context.setLineDash([2.2, 5.4])
      context.lineDashOffset = -timestamp * 0.004
      context.stroke()
      context.restore()

      if (timestamp - lastInteraction < 460) animationFrame = window.requestAnimationFrame(draw)
      else {
        collision = null
        canvas.dataset.collision = 'idle'
        animationFrame = 0
      }
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(assembly)
    window.addEventListener('pointermove', pointer, { passive: true })
    if (!animationFrame) animationFrame = window.requestAnimationFrame(draw)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', pointer)
      window.cancelAnimationFrame(animationFrame)
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
