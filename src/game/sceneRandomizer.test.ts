import { describe, expect, it } from 'vitest'
import { CallEngine, defaultTelephoneStory } from './callEngine'
import { candidatePercentages, resolveNightScene } from './sceneRandomizer'

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
})
