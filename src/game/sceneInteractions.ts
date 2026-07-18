import type { ResolvedSceneItem } from './types'

export function sceneItemBySlot(items: ResolvedSceneItem[], slotId: string) {
  return items.find((item) => item.slotId === slotId)
}

export function sceneItemCopy(item: ResolvedSceneItem, hasInspected: boolean) {
  return hasInspected && item.repeatCopy ? item.repeatCopy : item.firstCopy
}
