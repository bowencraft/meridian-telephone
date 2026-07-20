import { describe, expect, it } from 'vitest'
import { CallEngine, defaultTelephoneStory, loadStoryDefinition, STORY_OVERRIDE_KEY } from './callEngine'
import type { EndingType, ProgressData } from './types'

function idle(engine: CallEngine) {
  engine.returnToIdleNode()
}

function choose(engine: CallEngine, value: string, expectedNode?: string) {
  const transition = engine.dispatch({ type: 'choice', value })
  expect(transition.fallback, `choice ${value} should route from ${transition.previousNode.id}`).toBe(false)
  if (expectedNode) expect(transition.node.id).toBe(expectedNode)
  return transition
}

function dial(engine: CallEngine, value: string, expectedNode?: string) {
  const transition = engine.dispatch({ type: 'dialNumber', value })
  expect(transition.fallback, `dial ${value} should route`).toBe(false)
  if (expectedNode) expect(transition.node.id).toBe(expectedNode)
  return transition
}

/** Drives the six-chapter evidence route to the chapter-six decision menu. */
function reachReleaseMenu(engine: CallEngine, withPeterToken = false) {
  expect(engine.dispatch({ type: 'incomingAnswer', value: 'maeve_transfer' }).node.id).toBe('ch1_maeve_alert')
  choose(engine, 'maeve_triage', 'ch1_patient_status')
  choose(engine, 'patient_route', 'ch1_route_task')
  choose(engine, 'route_note', 'ch1_route_task')

  idle(engine)
  dial(engine, '9460264', 'ch1_road_service')
  choose(engine, 'road_original', 'ch1_driver_original')
  choose(engine, 'restore_original', 'ch1_handoff_strong')

  idle(engine)
  dial(engine, '8714000', 'ch2_meridian_desk')
  choose(engine, 'fault_cross_system', 'ch2_cross_system')
  choose(engine, 'hear_wren', 'ch2_wren_review_cross')
  choose(engine, 'share_liability', 'ch2_handoff_allied')

  idle(engine)
  dial(engine, '8714003', 'ch3_fault_desk')
  choose(engine, 'fault_submit_exact', 'ch3_leonard_window')
  choose(engine, 'leonard_verify_terminal', 'ch3_mce19_issue')

  idle(engine)
  dial(engine, '8714019', 'ch3_mce19_recording')
  choose(engine, 'mce19_return_fault', 'ch3_external_sources')

  idle(engine)
  dial(engine, '3011968', 'ch4_dorothy')
  choose(engine, 'dorothy_submit_technical', 'ch4_need_radio')

  idle(engine)
  dial(engine, '7941966', 'ch4_radio_menu')
  choose(engine, 'radio_verify', 'ch4_radio_verify')
  choose(engine, 'radio_confirm_source', 'ch4_custody_release')

  idle(engine)
  dial(engine, '8714036', 'ch5_archive_menu')
  for (const item of ['archive_1981', 'archive_1984', 'archive_1986', 'archive_1989']) {
    choose(engine, item)
    choose(engine, 'archive_return', 'ch5_archive_menu')
  }
  choose(engine, 'archive_handover', 'ch5_vale_handover')
  choose(engine, 'hear_wren_proposal', 'ch5_wren_debate')
  choose(engine, 'wren_note_benefit', 'ch5_handoff')

  if (withPeterToken) {
    idle(engine)
    dial(engine, '8714227', 'ch5_peter_token')
    expect(engine.state.durableState.peterToken).toBe('available')
  }

  idle(engine)
  dial(engine, '8714127', 'ch6_release_intro')
  choose(engine, 'open_release_menu', 'ch6_release_menu')
  return engine
}

function progressFrom(engine: CallEngine, ending: EndingType, attempts = 1): ProgressData {
  return {
    attempts,
    clues: [...engine.state.clues],
    facts: [...engine.state.facts],
    durableState: { ...engine.state.durableState },
    discoveredNumbers: [...engine.state.discoveredNumbers],
    seenEndings: [...engine.state.seenEndings],
    lastEnding: ending,
  }
}

describe('Telephone event graph engine', () => {
  it('ignores and clears stale v2 browser story overrides', () => {
    const values = new Map<string, string>([
      ['telephone.storyOverride.v2', JSON.stringify({ format: 'stale-story' })],
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

    expect(story.extensions.telephone.scene.slots.some((slot) => slot.layer === 'counter')).toBe(true)
    expect(storage.getItem('telephone.storyOverride.v2')).toBeNull()
    expect(STORY_OVERRIDE_KEY).toBe('telephone.storyOverride.v3')
  })

  it('routes known early calls to recovery copy and unknown calls to fallback', () => {
    const known = new CallEngine(defaultTelephoneStory(), undefined, 10)
    expect(known.dispatch({ type: 'dialNumber', value: '9460264' }).node.id).toBe('ch1_road_early')

    const unknown = new CallEngine(defaultTelephoneStory(), undefined, 10)
    const result = unknown.dispatch({ type: 'dialNumber', value: '1234567' })
    expect(result.node.id).toBe('wrong_number')
    expect(result.fallback).toBe(true)
    expect(result.state.flags.wrongDials).toBe(1)
  })

  it('exposes motivated chapter-one choices and applies durable evidence effects', () => {
    const engine = new CallEngine(defaultTelephoneStory(), undefined, 11)
    engine.dispatch({ type: 'incomingAnswer', value: 'maeve_transfer' })
    expect(engine.getChoices().map((choice) => choice.value)).toEqual(expect.arrayContaining(['maeve_triage', 'maeve_route', 'maeve_central']))
    choose(engine, 'maeve_triage')
    expect(engine.state.facts).toContain('maeve-trust')
    choose(engine, 'patient_route')
    idle(engine)
    dial(engine, '9460264')
    choose(engine, 'road_original')
    choose(engine, 'restore_original')
    expect(engine.state.durableState.hospitalEvidence).toBe('strong')
    expect(engine.state.discoveredNumbers).toContain('8714000')
  })

  it('supports the complete six-chapter route to formal disconnection', () => {
    const engine = reachReleaseMenu(new CallEngine(defaultTelephoneStory(), undefined, 12))
    const ending = choose(engine, 'final_disconnected', 'ending_disconnected')
    expect(ending.state.ending).toBe('disconnected')
    expect(ending.state.durableState).toMatchObject({ safetySignature: 'revoked', releaseStatus: 'stopped' })
  })

  it('issues the counterfeit delay token only after Peter is allied and founder history is complete', () => {
    const engine = reachReleaseMenu(new CallEngine(defaultTelephoneStory(), undefined, 13), true)
    expect(engine.getChoices().map((choice) => choice.value)).toContain('final_counterfeit')
    expect(choose(engine, 'final_counterfeit').state.ending).toBe('counterfeit')
    expect(engine.state.durableState.peterDiscipline).toBe('suspended')
  })

  it('repairs the worn source across three independent custodians before reopening release', () => {
    const first = reachReleaseMenu(new CallEngine(defaultTelephoneStory(), undefined, 14))
    expect(choose(first, 'final_worn').state.ending).toBe('worn')

    const replay = new CallEngine(defaultTelephoneStory(), progressFrom(first, 'worn'), 15)
    dial(replay, '8714127', 'ch6_missing_source')
    idle(replay)
    dial(replay, '8714019', 'ch3_repair_log')
    idle(replay)
    dial(replay, '3011968', 'ch4_dorothy_repair')
    choose(replay, 'repair_check_other', 'ch4_dorothy_repair')
    idle(replay)
    dial(replay, '7941966', 'ch4_radio_repair')
    choose(replay, 'repair_check_other', 'ch4_repair_complete')

    expect(replay.state.durableState).toMatchObject({ sourceCard: 'rebuilt', technicalEvidence: 'valid', custodyEvidence: 'valid', safetySignature: 'released' })
    idle(replay)
    dial(replay, '8714127', 'ch6_release_intro')
  })

  it('does not let the two external custodians impersonate Leonard during a worn repair', () => {
    const first = reachReleaseMenu(new CallEngine(defaultTelephoneStory(), undefined, 16))
    first.applyEffects([
      { type: 'setDurable', values: { escrowRepair: 'valid', radioRepair: 'valid' } },
    ])
    expect(choose(first, 'final_worn').state.ending).toBe('worn')
    expect(first.state.durableState).toMatchObject({ escrowRepair: 'pending', radioRepair: 'pending', technicalEvidence: 'invalid' })

    const replay = new CallEngine(defaultTelephoneStory(), progressFrom(first, 'worn'), 17)
    dial(replay, '3011968', 'ch4_dorothy_repair')
    choose(replay, 'repair_check_other', 'ch4_dorothy_repair')
    idle(replay)
    dial(replay, '7941966', 'ch4_radio_repair')
    choose(replay, 'repair_check_other', 'ch4_repair_need_tech')

    expect(replay.state.durableState.sourceCard).toBe('damaged')
    expect(replay.state.durableState.technicalEvidence).toBe('invalid')
    idle(replay)
    dial(replay, '8714019', 'ch3_repair_log')
    idle(replay)
    dial(replay, '3011968', 'ch4_dorothy_repair')
    choose(replay, 'repair_check_other', 'ch4_repair_complete')
  })

  it('lets Maeve reopen a weak hospital attachment for the conditional-release route', () => {
    const progress: ProgressData = {
      attempts: 1,
      clues: [],
      facts: ['maeve-contacted', 'chapter-1-complete', 'hospital-evidence-weak'],
      durableState: { hospitalEvidence: 'weak' },
      discoveredNumbers: ['7350194'],
      seenEndings: [],
    }
    const engine = new CallEngine(defaultTelephoneStory(), progress, 18)
    dial(engine, '7350194', 'ch1_hospital_followup_weak')
    choose(engine, 'hospital_reopen_original', 'ch1_hospital_followup_strong')
    expect(engine.state.durableState.hospitalEvidence).toBe('strong')
    expect(engine.state.facts).toContain('hospital-original-restored-late')
  })

  it('allows an operator ending to redeclare its conditional signature in a later docket', () => {
    const first = reachReleaseMenu(new CallEngine(defaultTelephoneStory(), undefined, 19))
    expect(choose(first, 'final_operator').state.ending).toBe('operator')

    const replay = new CallEngine(defaultTelephoneStory(), progressFrom(first, 'operator'), 20)
    dial(replay, '8714127', 'ch6_after_operator')
    choose(replay, 'open_new_docket', 'ch6_release_menu')
    choose(replay, 'final_weather', 'ch6_missing_signature')
    idle(replay)
    dial(replay, '3011968', 'ch4_dorothy_reissue')
    expect(replay.state.durableState.safetySignature).toBe('released')
    idle(replay)
    dial(replay, '8714127', 'ch6_after_operator')
    choose(replay, 'open_new_docket', 'ch6_release_menu')
    expect(choose(replay, 'final_weather').state.ending).toBe('weather')
  })

  it('varies node copy deterministically per seed and visit', () => {
    const first = new CallEngine(defaultTelephoneStory(), undefined, 99).opening().text
    const second = new CallEngine(defaultTelephoneStory(), undefined, 99).opening().text
    expect(first).toBe(second)
  })

  it('matches keywordAny edges against authored keywords and sample inputs', () => {
    const story = defaultTelephoneStory()
    story.edges.push({
      id: 'keyword_road_probe',
      label: '文本式道路测试',
      from: 'global',
      to: 'ch1_road_early',
      priority: 999,
      trigger: { type: 'keywordAny', value: 'road|道路' },
      samples: ['Is the route flooded?'],
    })
    const engine = new CallEngine(story, undefined, 101)

    expect(engine.dispatch({ type: 'keywordAny', value: 'Could you check the ROAD?' }).node.id).toBe('ch1_road_early')
    engine.returnToIdleNode()
    expect(engine.dispatch({ type: 'keywordAny', value: 'IS THE ROUTE FLOODED?' }).node.id).toBe('ch1_road_early')
  })

  it('normalizes a shipped phone alias to its canonical dial edge', () => {
    const engine = new CallEngine(defaultTelephoneStory(), undefined, 102)
    const transition = engine.dispatch({ type: 'dialNumber', value: '871 4119' })

    expect(transition.node.id).toBe('ch3_mce19_early')
    expect(transition.event.value).toBe('8714019')
  })

  it('restores historical facts and overwritable durable state', () => {
    const progress: ProgressData = {
      attempts: 2,
      clues: [],
      facts: ['source-card-damaged'],
      durableState: { sourceCard: 'rebuilt', peterToken: 'spent' },
      discoveredNumbers: [],
      seenEndings: ['worn', 'counterfeit'],
      lastEnding: 'counterfeit',
    }
    const engine = new CallEngine(defaultTelephoneStory(), progress, 103)
    engine.applyEffects([
      { type: 'addFact', fact: 'source-card-damaged' },
      { type: 'setDurable', values: { peterToken: 'available' } },
    ])

    expect(engine.state.facts).toEqual(['source-card-damaged'])
    expect(engine.state.durableState).toMatchObject({ sourceCard: 'rebuilt', peterToken: 'available' })
  })

  it('shows only the highest-priority edge for one choice value', () => {
    const story = defaultTelephoneStory()
    story.edges.push({
      id: 'maeve_triage_explanation_fallback',
      label: '同值低优先级说明',
      from: 'ch1_maeve_alert',
      to: 'ch1_route_task',
      priority: -10,
      trigger: { type: 'choice', value: 'maeve_triage' },
      choice: { text: '先问病人。' },
    })
    const engine = new CallEngine(story, undefined, 104)
    engine.dispatch({ type: 'incomingAnswer', value: 'maeve_transfer' })

    expect(engine.getChoices().filter((choice) => choice.value === 'maeve_triage')).toHaveLength(1)
    expect(choose(engine, 'maeve_triage').node.id).toBe('ch1_patient_status')
  })

  it('keeps all seven endings reachable after the same six-chapter evidence route', () => {
    const endings: Array<{ ending: EndingType, value: string, token?: boolean }> = [
      { ending: 'weather', value: 'final_weather' },
      { ending: 'recruited', value: 'final_recruited' },
      { ending: 'transfer', value: 'final_transfer' },
      { ending: 'worn', value: 'final_worn' },
      { ending: 'counterfeit', value: 'final_counterfeit', token: true },
      { ending: 'disconnected', value: 'final_disconnected' },
      { ending: 'operator', value: 'final_operator' },
    ]
    const seen = new Set<EndingType>()

    for (const [index, route] of endings.entries()) {
      const engine = reachReleaseMenu(new CallEngine(defaultTelephoneStory(), undefined, 200 + index), route.token)
      const transition = choose(engine, route.value)
      expect(transition.node.telephone?.ending).toBe(route.ending)
      seen.add(transition.state.ending!)
    }

    expect(seen).toEqual(new Set(endings.map((item) => item.ending)))
  })

  it('opens a later review docket that remembers the last ending but permits a different outcome', () => {
    const first = reachReleaseMenu(new CallEngine(defaultTelephoneStory(), undefined, 301))
    expect(choose(first, 'final_weather').state.ending).toBe('weather')

    const replay = new CallEngine(defaultTelephoneStory(), progressFrom(first, 'weather'), 302)
    dial(replay, '8714127', 'ch6_after_weather')
    choose(replay, 'open_new_docket', 'ch6_release_menu')
    const secondEnding = choose(replay, 'final_transfer')

    expect(secondEnding.state.ending).toBe('transfer')
    expect(secondEnding.state.facts).toEqual(expect.arrayContaining(['public-4-approved', 'public-4-not-released']))
  })
})
