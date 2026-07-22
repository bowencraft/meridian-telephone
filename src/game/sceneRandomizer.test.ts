import { describe, expect, it } from 'vitest'
import { CallEngine, defaultTelephoneStory } from './callEngine'
import { candidatePercentages, resolveNightScene, resolveSceneCandidatePreview } from './sceneRandomizer'

const REMOTE_PROP_IDS = [
  'weather-card',
  'meridian-ad',
  'scratched-plate',
  'newspaper',
  'phonebook',
  'coin-return',
  'meridian-matches',
  'operator-docket',
  'locker-key',
  'night-ticket',
].sort()

describe('night-shift scene randomization', () => {
  it('is deterministic for an entire night, independent of call activity', () => {
    const story = defaultTelephoneStory()
    const engine = new CallEngine(story, undefined, 8142)
    const openingSnapshot = resolveNightScene(story, engine.state)
    engine.dispatch({ type: 'dialNumber', value: '9460264' })
    engine.markHangup()
    expect(resolveNightScene(story, { ...engine.state, sessionSeed: 8142 })).toEqual(openingSnapshot)
  })

  it('contains only the ten remotely deployed content objects', () => {
    const story = defaultTelephoneStory()
    expect(story.extensions.telephone.scene.props.map((prop) => prop.id).sort()).toEqual(REMOTE_PROP_IDS)
    expect(story.extensions.telephone.scene.slots.map((slot) => slot.id).sort()).toEqual(REMOTE_PROP_IDS)
  })

  it('gives every remote object an independent unconditional 100% slot', () => {
    const story = defaultTelephoneStory()
    for (const slot of story.extensions.telephone.scene.slots) {
      expect(slot.spawnChance).toBe(1)
      expect(slot.requires).toBeUndefined()
      expect(slot.candidates).toEqual([{ propId: slot.id, weight: 1 }])
      expect(candidatePercentages(slot)).toEqual([{ propId: slot.id, conditionalChance: 1, absoluteChance: 1 }])
    }
  })

  it('renders all ten objects for every tested night seed', () => {
    const story = defaultTelephoneStory()
    for (let seed = 1; seed <= 100; seed += 1) {
      const itemIds = resolveNightScene(story, new CallEngine(story, undefined, seed).state).map((item) => item.prop.id).sort()
      expect(itemIds).toEqual(REMOTE_PROP_IDS)
    }
  })

  it('keeps one physical copy of each authored prop in the same night', () => {
    const story = defaultTelephoneStory()
    const propIds = resolveNightScene(story, new CallEngine(story, undefined, 9).state).map((item) => item.prop.id)
    expect(new Set(propIds).size).toBe(propIds.length)
  })

  it('links the remote visual clues to their stable phone entries', () => {
    const story = defaultTelephoneStory()
    const weather = story.extensions.telephone.scene.props.find((prop) => prop.id === 'weather-card')!
    const meridian = story.extensions.telephone.scene.props.find((prop) => prop.id === 'meridian-ad')!
    expect(weather.phoneRefs).toEqual(['weather-service'])
    expect(meridian.phoneRefs).toEqual(['meridian-public'])

    const engine = new CallEngine(story, undefined, 9)
    engine.discoverPhones(weather.phoneRefs)
    engine.discoverPhones(weather.phoneRefs)
    expect(engine.state.discoveredNumbers.filter((number) => number === '9460264')).toHaveLength(1)
  })

  it('applies authored jitter to the same forced preview used by the admin', () => {
    const story = defaultTelephoneStory()
    const slot = story.extensions.telephone.scene.slots.find((item) => item.id === 'weather-card')!
    const preview = resolveSceneCandidatePreview(story, slot, slot.candidates[0], 42)!
    expect(preview.appearance.rotation).not.toBe(0)
    expect(preview.appearance.scale).not.toBe(1)
  })

  it('lets a candidate preset replace the original material palette', () => {
    const story = defaultTelephoneStory()
    const slot = story.extensions.telephone.scene.slots.find((item) => item.id === 'weather-card')!
    const preview = resolveSceneCandidatePreview(story, slot, {
      propId: 'weather-card',
      weight: 1,
      appearanceOverrides: { presetId: 'carbon-ticket' },
    }, 42)!
    expect(preview.appearance).toMatchObject({
      presetId: 'carbon-ticket',
      paperTone: '#8196a0',
      inkColor: '#263943',
      accentColor: '#b4c5c7',
    })
  })

  it('selects only from the highest eligible candidate priority', () => {
    const story = defaultTelephoneStory()
    const slot = story.extensions.telephone.scene.slots.find((item) => item.id === 'weather-card')!
    slot.candidates = [
      { propId: 'weather-card', weight: 1, priority: 0 },
      { propId: 'meridian-ad', weight: 1, priority: 5 },
    ]
    for (let seed = 1; seed <= 20; seed += 1) {
      const item = resolveNightScene(story, new CallEngine(story, undefined, seed).state).find((candidate) => candidate.slotId === slot.id)
      expect(item?.prop.id).toBe('meridian-ad')
    }
  })
})
