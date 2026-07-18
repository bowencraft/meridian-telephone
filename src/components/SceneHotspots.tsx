import type { ResolvedSceneItem } from '../game/types'
import { SceneProp } from './SceneProp'

interface SceneHotspotsProps {
  hotspots: ResolvedSceneItem[]
  inspected: string[]
  disabled: boolean
  onInspect: (hotspot: ResolvedSceneItem) => void
}

export function SceneHotspots({ hotspots, inspected, disabled, onInspect }: SceneHotspotsProps) {
  return (
    <div className={`scene-hotspots ${disabled ? 'is-disabled' : ''}`}>
      {hotspots.map((hotspot) => <SceneProp key={hotspot.instanceId} item={hotspot} inspected={inspected.includes(hotspot.instanceId)} disabled={disabled} onClick={() => onInspect(hotspot)} />)}
    </div>
  )
}
