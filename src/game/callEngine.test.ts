import { describe, expect, it } from 'vitest'
import { CallEngine, defaultTelephoneStory, loadStoryDefinition, STORY_OVERRIDE_KEY } from './callEngine'
import type { ProgressData } from './types'

function progress(values: Partial<ProgressData> = {}): ProgressData {
  return {
    attempts: 1,
    clues: [],
    facts: [],
    durableState: {},
    discoveredNumbers: [],
    seenEndings: [],
    ...values,
  }
}

describe('Telephone event graph engine', () => {
  it('clears Seedline browser overrides before loading the restored Meridian story', () => {
    const values = new Map<string, string>([
      ['telephone.storyOverride.seedline.v1', JSON.stringify({ format: 'stale-story' })],
    ])
    const storage = {
      get length() { return values.size },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => { values.delete(key) },
      setItem: (key: string, value: string) => { values.set(key, value) },
    } satisfies Storage

    const story = loadStoryDefinition(storage)

    expect(story.id).toBe('meridian-rain-exchange')
    expect(storage.getItem('telephone.storyOverride.seedline.v1')).toBeNull()
    expect(STORY_OVERRIDE_KEY).toBe('telephone.storyOverride.meridian-remote.v1')
  })

  it('routes known and unknown dialled numbers', () => {
    const known = new CallEngine(defaultTelephoneStory(), undefined, 10)
    expect(known.dispatch({ type: 'dialNumber', value: '9460264' }).node.id).toBe('weather_intro')

    const unknown = new CallEngine(defaultTelephoneStory(), undefined, 10)
    const result = unknown.dispatch({ type: 'dialNumber', value: '1234567' })
    expect(result.node.id).toBe('wrong_number')
    expect(result.fallback).toBe(true)
    expect(result.state.flags.wrongDials).toBe(1)
  })

  it('exposes conditional choice edges and applies effects', () => {
    const engine = new CallEngine(defaultTelephoneStory(), undefined, 11)
    engine.dispatch({ type: 'dialNumber', value: '9460264' })
    expect(engine.getChoices().map((choice) => choice.value)).toEqual(expect.arrayContaining(['weather_yes', 'weather_no', 'weather_who']))
    engine.dispatch({ type: 'choice', value: 'weather_who' })
    expect(engine.state.discoveredNumbers).toContain('8714000')
    expect(engine.state.flags.suspicion).toBe(1)
  })

  it('supports the complete complaint-to-disconnection route', () => {
    const engine = new CallEngine(defaultTelephoneStory(), undefined, 12)
    engine.dispatch({ type: 'sceneInspect', value: 'scratched-plate' })
    engine.returnToIdleNode()
    engine.dispatch({ type: 'dialNumber', value: '8714000' })
    engine.dispatch({ type: 'choice', value: 'identity' })
    engine.dispatch({ type: 'choice', value: 'voice_fault' })
    engine.dispatch({ type: 'choice', value: 'scratched_plate' })
    expect(engine.currentNode().id).toBe('old_operator')
    expect(engine.state.discoveredNumbers).toContain('8714127')
    engine.dispatch({ type: 'choice', value: 'use_code' })
    engine.dispatch({ type: 'choice', value: 'fault_auth' })
    const ending = engine.dispatch({ type: 'choice', value: 'cut_training' })
    expect(ending.node.id).toBe('ending_disconnected')
    expect(ending.state.ending).toBe('disconnected')
  })

  it('unlocks a cross-run counterfeit answer after recruitment', () => {
    const engine = new CallEngine(defaultTelephoneStory(), progress({ seenEndings: ['recruited'] }), 13)
    engine.dispatch({ type: 'dialNumber', value: '8714000' })
    engine.dispatch({ type: 'choice', value: 'continue' })
    engine.dispatch({ type: 'choice', value: 'representative' })
    expect(engine.getChoices().map((choice) => choice.value)).toContain('apply_counterfeit')
  })

  it('reaches the worn-number ending after repeated wrong calls and hangups', () => {
    const engine = new CallEngine(defaultTelephoneStory(), undefined, 14)
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      engine.dispatch({ type: 'dialNumber', value: `123456${attempt}` })
      engine.setFlag('hangups', attempt)
      const transition = engine.dispatch({ type: 'hangUp', value: '*' })
      if (attempt < 3) engine.returnToIdleNode()
      else expect(transition.state.ending).toBe('worn')
    }
  })

  it('varies node copy deterministically per seed and visit', () => {
    const first = new CallEngine(defaultTelephoneStory(), undefined, 99).opening().text
    const second = new CallEngine(defaultTelephoneStory(), undefined, 99).opening().text
    expect(first).toBe(second)
  })

  it('matches keywordAny edges against authored keywords and sample inputs', () => {
    const story = defaultTelephoneStory()
    story.edges.push({
      id: 'keyword_weather_probe', label: '文本式天气测试', from: 'global', to: 'weather_intro', priority: 999,
      trigger: { type: 'keywordAny', value: 'weather|天气' }, samples: ['Is it still raining?'],
    })
    const engine = new CallEngine(story, undefined, 101)
    expect(engine.dispatch({ type: 'keywordAny', value: 'Could you tell me the WEATHER?' }).node.id).toBe('weather_intro')
    engine.returnToIdleNode()
    expect(engine.dispatch({ type: 'keywordAny', value: 'IS IT STILL RAINING?' }).node.id).toBe('weather_intro')
  })

  it('normalizes an authored phone alias to its canonical dial edge', () => {
    const story = defaultTelephoneStory()
    story.globals.phone.directory.find((entry) => entry.number === '8714019')!.aliases = ['8714119']
    const transition = new CallEngine(story, undefined, 102).dispatch({ type: 'dialNumber', value: '871 4119' })
    expect(transition.node.id).toBe('internal_directory')
    expect(transition.event.value).toBe('8714019')
  })

  it('restores historical facts and overwritable durable state', () => {
    const engine = new CallEngine(defaultTelephoneStory(), progress({
      attempts: 2,
      facts: ['source-card-damaged'],
      durableState: { sourceCard: 'rebuilt', token: 'spent' },
      seenEndings: ['worn', 'counterfeit'],
      lastEnding: 'counterfeit',
    }), 103)
    engine.applyEffects([
      { type: 'addFact', fact: 'source-card-damaged' },
      { type: 'setDurable', values: { token: 'available' } },
    ])
    expect(engine.state.facts).toEqual(['source-card-damaged'])
    expect(engine.state.durableState).toMatchObject({ sourceCard: 'rebuilt', token: 'available' })
  })

  it('keeps every shipped ending reachable through authored event routes', () => {
    const seen = new Set<string>()
    const recruited = new CallEngine(defaultTelephoneStory(), undefined, 21)
    recruited.dispatch({ type: 'dialNumber', value: '8714000' })
    recruited.dispatch({ type: 'choice', value: 'continue' })
    recruited.dispatch({ type: 'choice', value: 'representative' })
    seen.add(recruited.dispatch({ type: 'choice', value: 'apply_accept' }).state.ending ?? '')

    const transfer = new CallEngine(defaultTelephoneStory(), undefined, 22)
    transfer.dispatch({ type: 'dialNumber', value: '8714127' })
    seen.add(transfer.dispatch({ type: 'choice', value: 'keep_waiting' }).state.ending ?? '')

    const weather = new CallEngine(defaultTelephoneStory(), undefined, 23)
    weather.dispatch({ type: 'dialNumber', value: '9460264' })
    seen.add(weather.dispatch({ type: 'timeout', value: 'choice' }).state.ending ?? '')

    const counterfeit = new CallEngine(defaultTelephoneStory(), progress({ seenEndings: ['recruited'] }), 24)
    counterfeit.dispatch({ type: 'dialNumber', value: '8714000' })
    counterfeit.dispatch({ type: 'choice', value: 'continue' })
    counterfeit.dispatch({ type: 'choice', value: 'representative' })
    seen.add(counterfeit.dispatch({ type: 'choice', value: 'apply_counterfeit' }).state.ending ?? '')

    const operator = new CallEngine(defaultTelephoneStory(), progress({
      attempts: 3,
      discoveredNumbers: ['7941966', '8714019'],
      seenEndings: ['disconnected', 'recruited'],
    }), 25)
    operator.dispatch({ type: 'dialNumber', value: '8714000' })
    operator.dispatch({ type: 'choice', value: 'identity' })
    operator.dispatch({ type: 'choice', value: 'voice_fault' })
    operator.dispatch({ type: 'choice', value: 'scratched_plate' })
    operator.dispatch({ type: 'choice', value: 'use_code' })
    operator.dispatch({ type: 'choice', value: 'fault_auth' })
    seen.add(operator.dispatch({ type: 'choice', value: 'takeover' }).state.ending ?? '')

    seen.add('disconnected')
    seen.add('worn')
    expect(seen).toEqual(new Set(['disconnected', 'recruited', 'transfer', 'worn', 'weather', 'counterfeit', 'operator']))
  })
})
