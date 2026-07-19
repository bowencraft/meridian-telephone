import { conditionsMatch } from './callEngine'
import { mergeSceneAppearance } from './storyMigration'
import type { ProgressData, ResolvedSceneItem, RuntimeState, SceneAppearance, SceneCandidate, SceneSlot, TelephoneStory } from './types'

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function fraction(seed: number, generation: number, slotId: string, channel: string) {
  return stableHash(`${seed}:${generation}:${slotId}:${channel}`) / 0x1_0000_0000
}

function jitter(base: number, amount: number | undefined, roll: number) {
  return base + (roll * 2 - 1) * (amount ?? 0)
}

function chooseCandidate(candidates: SceneCandidate[], roll: number) {
  const weighted = candidates.filter((candidate) => candidate.weight > 0)
  const total = weighted.reduce((sum, candidate) => sum + candidate.weight, 0)
  if (total <= 0) return undefined
  let cursor = roll * total
  for (const candidate of weighted) {
    cursor -= candidate.weight
    if (cursor <= 0) return candidate
  }
  return weighted[weighted.length - 1]
}

function copyVariant(values: string[] | undefined, roll: number) {
  if (!values?.length) return undefined
  return values[Math.min(values.length - 1, Math.floor(roll * values.length))]
}

function resolvedAppearance(story: TelephoneStory, slot: SceneSlot, candidate: SceneCandidate, propAppearance: SceneAppearance, seed: number, generation: number) {
  const presetId = candidate.appearanceOverrides?.presetId ?? propAppearance.presetId
  const propPreset = story.extensions.telephone.scene.stylePresets.find((item) => item.id === propAppearance.presetId)
  const preset = story.extensions.telephone.scene.stylePresets.find((item) => item.id === presetId)
  const candidateOverrides = candidate.appearanceOverrides
    ? Object.fromEntries(Object.entries(candidate.appearanceOverrides).filter(([key]) => key !== 'presetId'))
    : undefined
  const appearance = candidate.appearanceOverrides?.presetId
    ? mergeSceneAppearance(propPreset?.defaults, propAppearance, preset?.defaults, candidateOverrides, { presetId })
    : mergeSceneAppearance(preset?.defaults, propAppearance, candidateOverrides, { presetId })
  appearance.rotation = jitter(appearance.rotation ?? 0, slot.jitter?.rotation, fraction(seed, generation, slot.id, 'rotation'))
  appearance.scale = Math.max(.55, jitter(appearance.scale ?? 1, slot.jitter?.scale, fraction(seed, generation, slot.id, 'scale')))
  return appearance
}

export function resolveSceneCandidatePreview(
  story: TelephoneStory,
  slot: SceneSlot,
  candidate: SceneCandidate,
  seed: number,
  generation = 0,
): ResolvedSceneItem | undefined {
  const prop = story.extensions.telephone.scene.props.find((item) => item.id === candidate.propId)
  if (!prop) return undefined
  return {
    instanceId: `${generation}:${slot.id}:${prop.id}`,
    slotId: slot.id,
    layer: slot.layer ?? 'wall',
    prop,
    bounds: {
      ...slot.bounds,
      x: jitter(slot.bounds.x, slot.jitter?.x, fraction(seed, generation, slot.id, 'x')),
      y: jitter(slot.bounds.y, slot.jitter?.y, fraction(seed, generation, slot.id, 'y')),
    },
    mobileBounds: slot.mobileBounds ? {
      ...slot.mobileBounds,
      x: jitter(slot.mobileBounds.x, slot.jitter?.x, fraction(seed, generation, slot.id, 'mobile-x')),
      y: jitter(slot.mobileBounds.y, slot.jitter?.y, fraction(seed, generation, slot.id, 'mobile-y')),
    } : undefined,
    appearance: resolvedAppearance(story, slot, candidate, prop.appearance, seed, generation),
    firstCopy: copyVariant(prop.copy.firstVariants, fraction(seed, generation, slot.id, 'first-copy')) ?? '这件东西没有留下可辨认的内容。',
    repeatCopy: copyVariant(prop.copy.repeatVariants, fraction(seed, generation, slot.id, 'repeat-copy')),
  }
}

export function resolveSceneLayout(
  story: TelephoneStory,
  state: RuntimeState,
  progress: ProgressData | undefined,
  generation: number,
): ResolvedSceneItem[] {
  const scene = story.extensions.telephone.scene
  return scene.slots.flatMap((slot): ResolvedSceneItem[] => {
    if (!conditionsMatch(slot.requires, state, progress, story)) return []
    if (fraction(state.sessionSeed, generation, slot.id, 'spawn') >= Math.min(1, Math.max(0, slot.spawnChance))) return []
    const eligible = slot.candidates.filter((candidate) => conditionsMatch(candidate.requires, state, progress, story))
    const candidate = chooseCandidate(eligible, fraction(state.sessionSeed, generation, slot.id, 'candidate'))
    if (!candidate) return []
    const preview = resolveSceneCandidatePreview(story, slot, candidate, state.sessionSeed, generation)
    if (!preview) return []
    return [preview]
  })
}

/** Runtime entry point: one immutable roll per night shift. */
export function resolveNightScene(story: TelephoneStory, state: RuntimeState, progress?: ProgressData) {
  return resolveSceneLayout(story, state, progress, 0)
}

export function candidatePercentages(slot: SceneSlot) {
  const total = slot.candidates.reduce((sum, candidate) => sum + Math.max(0, candidate.weight), 0)
  return slot.candidates.map((candidate) => ({
    propId: candidate.propId,
    conditionalChance: total > 0 ? candidate.weight / total : 0,
    absoluteChance: total > 0 ? slot.spawnChance * candidate.weight / total : 0,
  }))
}
