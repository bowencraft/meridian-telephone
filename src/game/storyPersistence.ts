import { LEGACY_STORY_OVERRIDE_KEY, STORY_OVERRIDE_KEY } from './callEngine'
import { migrateTelephoneStory } from './storyMigration'
import type { TelephoneStory } from './types'

export async function fetchStoryDefinitionFromLocalApi(): Promise<TelephoneStory | null> {
  try {
    const response = await fetch('/api/story-definition', { headers: { Accept: 'application/json' } })
    return response.ok ? migrateTelephoneStory(await response.json()) : null
  } catch {
    return null
  }
}

export async function saveStoryDefinitionToLocalApi(story: TelephoneStory): Promise<boolean> {
  try {
    const response = await fetch('/api/story-definition', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(story),
    })
    return response.ok
  } catch {
    return false
  }
}

export function saveStoryDefinitionFallback(story: TelephoneStory, storage: Storage = window.localStorage) {
  storage.setItem(STORY_OVERRIDE_KEY, JSON.stringify(story))
}

export function clearStoryOverride(storage: Storage = window.localStorage) {
  storage.removeItem(STORY_OVERRIDE_KEY)
  storage.removeItem(LEGACY_STORY_OVERRIDE_KEY)
}
