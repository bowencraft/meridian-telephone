import { useMemo } from 'react'
import type { HandsetPose } from './Handset'

interface PhoneCordProps {
  lifted: boolean
  pose: HandsetPose
}

interface Point { x: number; y: number }

function quadratic(start: Point, control: Point, end: Point, t: number) {
  const inverse = 1 - t
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  }
}

function quadraticTangent(start: Point, control: Point, end: Point, t: number) {
  return {
    x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
  }
}

function buildCoilPath(start: Point, end: Point, lifted: boolean) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const control = {
    x: start.x + (end.x - start.x) * 0.42 - (lifted ? 8 : 4),
    y: Math.max(start.y, end.y) + Math.max(7, 20 - distance * 0.08),
  }
  const loops = lifted ? Math.max(10, 24 - distance * 0.12) : 27
  const radius = lifted ? Math.max(0.55, 2.35 - distance * 0.018) : 2.45
  const points: string[] = []

  for (let index = 0; index <= 210; index += 1) {
    const t = index / 210
    const center = quadratic(start, control, end, t)
    const tangent = quadraticTangent(start, control, end, t)
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1
    const normal = { x: -tangent.y / tangentLength, y: tangent.x / tangentLength }
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.5)
    const wave = Math.sin(t * loops * Math.PI * 2) * radius * envelope
    const x = center.x + normal.x * wave
    const y = center.y + normal.y * wave
    points.push(`${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(' ')
}

export function PhoneCord({ lifted, pose }: PhoneCordProps) {
  const cordPath = useMemo(() => buildCoilPath(
    { x: 18, y: 78 },
    { x: 12.5 + pose.xPercent, y: 29 + pose.yPercent },
    lifted,
  ), [lifted, pose.xPercent, pose.yPercent])

  return (
    <>
      <span className="cord-grommet" aria-hidden="true" />
      <svg className={`phone-cord ${lifted ? 'is-stretched' : ''} ${pose.nearCradle ? 'is-snapping' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="cord-shadow" d={cordPath} vectorEffect="non-scaling-stroke" />
        <path className="cord-body" d={cordPath} vectorEffect="non-scaling-stroke" />
        <path className="cord-highlight" d={cordPath} vectorEffect="non-scaling-stroke" />
      </svg>
    </>
  )
}
