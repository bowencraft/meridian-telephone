import defaultStory from '../story/telephone.rules.json'
import type {
  CallEvent,
  ChoiceView,
  EndingType,
  EngineTransition,
  GraphCondition,
  GraphEffect,
  ProgressData,
  RuntimeState,
  Scalar,
  TelephoneEdge,
  TelephoneNode,
  TelephoneStory,
} from './types'

export const STORY_OVERRIDE_KEY = 'telephone.storyOverride.v1'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function defaultTelephoneStory() {
  return clone(defaultStory) as TelephoneStory
}

export function loadStoryDefinition(storage?: Storage): TelephoneStory {
  const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage)
  const stored = target?.getItem(STORY_OVERRIDE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as TelephoneStory
    } catch {
      target?.removeItem(STORY_OVERRIDE_KEY)
    }
  }
  return defaultTelephoneStory()
}

export function nodeById(story: TelephoneStory, id: string): TelephoneNode {
  const node = story.nodes.find((candidate) => candidate.id === id)
  if (!node) throw new Error(`Unknown Telephone node: ${id}`)
  return node
}

export function conditionMatches(condition: GraphCondition, state: RuntimeState, progress?: ProgressData) {
  const current = state.flags[condition.type === 'hasNumber' || condition.type === 'endingSeen' ? '' : condition.key]
  switch (condition.type) {
    case 'stateEquals': return current === condition.value
    case 'stateNotEquals': return current !== condition.value
    case 'stateGte': return Number(current ?? 0) >= condition.value
    case 'hasNumber': return state.discoveredNumbers.includes(condition.value) || progress?.discoveredNumbers.includes(condition.value) === true
    case 'endingSeen': return state.seenEndings.includes(condition.value) || progress?.seenEndings.includes(condition.value) === true
  }
}

export function conditionsMatch(conditions: GraphCondition[] | undefined, state: RuntimeState, progress?: ProgressData) {
  return (conditions ?? []).every((condition) => conditionMatches(condition, state, progress))
}

function triggerMatches(edge: TelephoneEdge, event: CallEvent) {
  if (edge.trigger.type !== event.type) return false
  if (event.type === 'keywordAny') {
    const input = event.value?.trim().toLocaleLowerCase() ?? ''
    const keywords = [edge.trigger.value, ...(edge.samples ?? [])]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => value.split(/[|,，]/))
      .map((value) => value.trim().toLocaleLowerCase())
      .filter(Boolean)
    return input.length > 0 && keywords.some((keyword) => input.includes(keyword))
  }
  if (edge.trigger.value === undefined || edge.trigger.value === '*') return true
  return edge.trigger.value === event.value
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nodeText(node: TelephoneNode, state: RuntimeState) {
  const variants = node.body.variants.length ? node.body.variants : node.body.fallbackVariants ?? ['…']
  const visit = state.visits[node.id] ?? 1
  const index = stableHash(`${state.sessionSeed}:${node.id}:${visit}`) % variants.length
  return variants[index] ?? '…'
}

function applyEffect(state: RuntimeState, effect: GraphEffect) {
  switch (effect.type) {
    case 'setState':
      state.flags = { ...state.flags, ...effect.values }
      break
    case 'increment':
      state.flags = { ...state.flags, [effect.key]: Number(state.flags[effect.key] ?? 0) + effect.amount }
      break
    case 'discoverNumber':
      if (!state.discoveredNumbers.includes(effect.number)) state.discoveredNumbers.push(effect.number)
      break
    case 'addClue':
      if (!state.clues.includes(effect.clue)) state.clues.push(effect.clue)
      break
  }
}

function initialState(story: TelephoneStory, progress?: ProgressData, seed = Date.now() % 1_000_000) : RuntimeState {
  const initiallyKnown = story.globals.phone.validNumbers.filter((item) => item.initiallyKnown).map((item) => item.number)
  const persistedNumbers = progress?.discoveredNumbers ?? []
  return {
    currentNodeId: story.entryNodeId,
    flags: { compliance: 0, suspicion: 0, wrongDials: 0, hangups: 0, inspected: 0 },
    discoveredNumbers: [...new Set([...initiallyKnown, ...persistedNumbers])],
    clues: [...(progress?.clues ?? [])],
    seenNodes: [story.entryNodeId],
    handledRings: [],
    missedRings: [],
    seenEndings: [...(progress?.seenEndings ?? [])],
    visits: { [story.entryNodeId]: 1 },
    turn: 0,
    sessionSeed: seed,
  }
}

export class CallEngine {
  readonly story: TelephoneStory
  readonly progress?: ProgressData
  state: RuntimeState

  constructor(story = loadStoryDefinition(), progress?: ProgressData, seed?: number) {
    this.story = story
    this.progress = progress
    this.state = initialState(story, progress, seed)
  }

  reset(seed?: number) {
    this.state = initialState(this.story, this.progress, seed)
  }

  currentNode() {
    return nodeById(this.story, this.state.currentNodeId)
  }

  opening(): EngineTransition {
    const node = this.currentNode()
    return {
      event: { type: 'auto', value: 'opening' },
      edge: null,
      previousNode: node,
      node,
      text: nodeText(node, this.state),
      state: clone(this.state),
      fallback: false,
      candidates: [],
    }
  }

  availableEdges(event: CallEvent) {
    const globalIds = this.story.nodes.filter((node) => node.kind === 'global').map((node) => node.id)
    return this.story.edges
      .filter((edge) => edge.from === this.state.currentNodeId || globalIds.includes(edge.from))
      .filter((edge) => triggerMatches(edge, event))
      .filter((edge) => conditionsMatch(edge.conditions, this.state, this.progress))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  }

  getChoices(): ChoiceView[] {
    const globalIds = this.story.nodes.filter((node) => node.kind === 'global').map((node) => node.id)
    return this.story.edges
      .filter((edge) => edge.from === this.state.currentNodeId || globalIds.includes(edge.from))
      .filter((edge) => edge.trigger.type === 'choice')
      .filter((edge) => conditionsMatch(edge.conditions, this.state, this.progress))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
      .filter((edge) => edge.choice)
      .map((edge) => ({
        edgeId: edge.id,
        value: edge.trigger.value ?? edge.id,
        text: edge.choice?.text ?? edge.label,
        tone: edge.choice?.tone ?? 'plain',
        hidden: edge.choice?.hidden ?? false,
      }))
  }

  private transitionTo(targetId: string, event: CallEvent, edge: TelephoneEdge | null, candidates: string[], fallback: boolean): EngineTransition {
    const previousNode = this.currentNode()
    if (edge?.effects) edge.effects.forEach((effect) => applyEffect(this.state, effect))
    this.state.currentNodeId = targetId
    this.state.turn += 1
    this.state.visits[targetId] = (this.state.visits[targetId] ?? 0) + 1
    if (!this.state.seenNodes.includes(targetId)) this.state.seenNodes.push(targetId)
    const node = this.currentNode()
    const ending = node.telephone?.ending
    if (ending) {
      this.state.ending = ending
      if (!this.state.seenEndings.includes(ending)) this.state.seenEndings.push(ending)
    }
    return {
      event,
      edge,
      previousNode,
      node,
      text: nodeText(node, this.state),
      state: clone(this.state),
      fallback,
      candidates,
    }
  }

  dispatch(event: CallEvent): EngineTransition {
    const candidates = this.availableEdges(event)
    const winner = candidates[0] ?? null
    if (winner) return this.transitionTo(winner.to, event, winner, candidates.map((edge) => edge.id), false)

    if (event.type === 'dialNumber') {
      const knownNumber = this.story.globals.phone.validNumbers.some((entry) => entry.number === event.value)
      this.state.flags.wrongDials = Number(this.state.flags.wrongDials ?? 0) + 1
      const targetId = knownNumber ? this.story.globals.phone.busyNumberNodeId : this.story.globals.phone.wrongNumberNodeId
      return this.transitionTo(targetId, event, null, [], true)
    }

    const node = this.currentNode()
    const fallbacks = node.body.fallbackVariants ?? node.body.variants
    const text = fallbacks[this.state.turn % Math.max(1, fallbacks.length)] ?? '线路只留下了一阵静电。'
    this.state.turn += 1
    return {
      event,
      edge: null,
      previousNode: node,
      node,
      text,
      state: clone(this.state),
      fallback: true,
      candidates: [],
    }
  }

  markRingHandled(id: string) {
    if (!this.state.handledRings.includes(id)) this.state.handledRings.push(id)
  }

  markRingMissed(id: string) {
    if (!this.state.missedRings.includes(id)) this.state.missedRings.push(id)
    this.markRingHandled(id)
  }

  markHangup() {
    this.state.flags.hangups = Number(this.state.flags.hangups ?? 0) + 1
    this.state.currentNodeId = this.story.entryNodeId
  }

  returnToIdleNode() {
    this.state.currentNodeId = this.story.entryNodeId
  }

  setFlag(key: string, value: Scalar) {
    this.state.flags[key] = value
  }
}

export function endingForNode(node: TelephoneNode): EndingType | undefined {
  return node.telephone?.ending
}
