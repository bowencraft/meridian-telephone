import { describe, expect, it } from 'vitest'
import { CallEngine, defaultTelephoneStory } from './callEngine'
import { candidatePercentages, resolveNightScene, resolveSceneCandidatePreview } from './sceneRandomizer'

describe('night-shift scene randomization', () => {
  it('is deterministic for an entire night, independent of call activity', () => {
    const story = defaultTelephoneStory()
    const engine = new CallEngine(story, undefined, 8142)
    const openingSnapshot = resolveNightScene(story, engine.state)

    engine.dispatch({ type: 'dialNumber', value: '9460264' })
    engine.dispatch({ type: 'choice', value: 'weather_who' })
    engine.markHangup()

    expect(resolveNightScene(story, { ...engine.state, sessionSeed: 8142 })).toEqual(openingSnapshot)
  })

  it('produces different snapshots across new night seeds', () => {
    const story = defaultTelephoneStory()
    const signatures = new Set(
      Array.from({ length: 24 }, (_, seed) => resolveNightScene(story, new CallEngine(story, undefined, seed + 1).state)
        .map((item) => `${item.slotId}:${item.prop.id}:${item.appearance.rotation?.toFixed(2)}`)
        .join('|')),
    )
    expect(signatures.size).toBeGreaterThan(8)
  })

  it('supports absence at every authored point and exposes weighted absolute chances', () => {
    const story = defaultTelephoneStory()
    const slots = story.extensions.telephone.scene.slots
    expect(slots.every((slot) => slot.spawnChance > 0 && slot.spawnChance < 1)).toBe(true)

    const slot = slots.find((item) => item.id === 'weather-card')!
    const percentages = candidatePercentages(slot)
    expect(percentages.reduce((sum, item) => sum + item.absoluteChance, 0)).toBeCloseTo(slot.spawnChance)
    expect(percentages[0].absoluteChance).toBeGreaterThan(percentages.at(-1)!.absoluteChance)
  })

  it('lets several visual variants reveal one stable phone entry', () => {
    const story = defaultTelephoneStory()
    const weatherProps = story.extensions.telephone.scene.props.filter((prop) => prop.phoneRefs?.includes('weather-service'))
    expect(weatherProps.length).toBeGreaterThanOrEqual(3)

    const engine = new CallEngine(story, undefined, 9)
    engine.discoverPhones(weatherProps[0].phoneRefs)
    engine.discoverPhones(weatherProps[1].phoneRefs)
    expect(engine.state.discoveredNumbers.filter((number) => number === '9460264')).toHaveLength(1)
  })

  it('applies position jitter to the same forced preview used by the admin', () => {
    const story = defaultTelephoneStory()
    const slot = story.extensions.telephone.scene.slots.find((item) => item.id === 'weather-card')!
    const preview = resolveSceneCandidatePreview(story, slot, slot.candidates[0], 42)!

    expect(preview.bounds.x).not.toBe(slot.bounds.x)
    expect(preview.bounds.y).not.toBe(slot.bounds.y)
    expect(preview.mobileBounds?.x).not.toBe(slot.mobileBounds?.x)
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
    slot.spawnChance = 1
    slot.candidates = slot.candidates.slice(0, 2).map((candidate, index) => ({
      ...candidate,
      priority: index === 1 ? 5 : 0,
    }))
    const expected = slot.candidates[1].propId

    for (let seed = 1; seed <= 20; seed += 1) {
      const item = resolveNightScene(story, new CallEngine(story, undefined, seed).state).find((candidate) => candidate.slotId === slot.id)
      expect(item?.prop.id).toBe(expected)
    }
  })
})
