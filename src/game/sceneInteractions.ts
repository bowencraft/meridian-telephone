import { conditionsMatch } from './callEngine'
import type { ProgressData, RuntimeState, SceneHotspot, TelephoneStory } from './types'

export function visibleHotspots(story: TelephoneStory, state: RuntimeState, progress?: ProgressData) {
  return story.extensions.telephone.sceneHotspots.filter((hotspot) => conditionsMatch(hotspot.requires, state, progress))
}

export function hotspotById(story: TelephoneStory, id: string): SceneHotspot | undefined {
  return story.extensions.telephone.sceneHotspots.find((hotspot) => hotspot.id === id)
}

export function hotspotCopy(hotspot: SceneHotspot, hasInspected: boolean) {
  return hasInspected && hotspot.repeatBody ? hotspot.repeatBody : hotspot.body
}
