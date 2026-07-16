import type { SceneHotspot } from '../game/types'

interface SceneHotspotsProps {
  hotspots: SceneHotspot[]
  inspected: string[]
  disabled: boolean
  onInspect: (hotspot: SceneHotspot) => void
}

export function SceneHotspots({ hotspots, inspected, disabled, onInspect }: SceneHotspotsProps) {
  return (
    <div className={`scene-hotspots ${disabled ? 'is-disabled' : ''}`}>
      {hotspots.map((hotspot) => (
        <button
          type="button"
          key={hotspot.id}
          className={`scene-hotspot hotspot-${hotspot.id} ${inspected.includes(hotspot.id) ? 'is-inspected' : ''}`}
          style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, width: `${hotspot.width}%`, height: `${hotspot.height}%` }}
          aria-label={hotspot.ariaLabel}
          disabled={disabled}
          onClick={() => onInspect(hotspot)}
        ><span>{inspected.includes(hotspot.id) ? '已查看' : hotspot.label}</span></button>
      ))}
    </div>
  )
}
