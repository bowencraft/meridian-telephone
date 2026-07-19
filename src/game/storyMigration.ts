import type {
  PhoneDirectoryEntry,
  SceneAppearance,
  SceneDefinition,
  SceneFixtureLayout,
  SceneHotspot,
  ScenePropDefinition,
  ScenePropKind,
  SceneStylePreset,
  TelephoneStory,
} from './types'

export const DEFAULT_SCENE_FIXTURES: SceneFixtureLayout = {
  phone: {
    desktop: { x: 50, y: 1.5 },
    mobile: { x: 50, y: 12.5 },
  },
  counter: {
    desktop: { x: 50, y: 75 },
    mobile: { x: 50, y: 80 },
  },
}

const KNOWN_PHONE_IDS: Record<string, string> = {
  '999': 'emergency-services',
  '9460264': 'weather-service',
  '8714000': 'meridian-public',
  '8714003': 'meridian-complaints',
  '8714019': 'meridian-extension-19',
  '8714127': 'meridian-switchboard',
  '3011968': 'lost-property',
  '7941966': 'radio-nocturne',
}

export const DEFAULT_SCENE_STYLE_PRESETS: SceneStylePreset[] = [
  { id: 'damp-service-card', label: '潮湿公共服务卡', kind: 'paper-card', defaults: { presetId: 'damp-service-card', paperTone: '#b5a986', inkColor: '#37362f', accentColor: '#716348', aging: .62, moisture: .7, crease: .28, tear: .12, opacity: .97, typography: 'typewriter' } },
  { id: 'meridian-black-gold', label: 'Meridian 黑金广告', kind: 'classified-ad', defaults: { presetId: 'meridian-black-gold', paperTone: '#20211d', inkColor: '#d0b46f', accentColor: '#8d7443', aging: .36, moisture: .15, crease: .12, tear: .04, opacity: .98, typography: 'serif' } },
  { id: 'official-brass', label: '氧化黄铜铭牌', kind: 'brass-plate', defaults: { presetId: 'official-brass', paperTone: '#91866d', inkColor: '#28261f', accentColor: '#b8ad90', aging: .7, moisture: .08, crease: 0, tear: 0, opacity: 1, typography: 'official' } },
  { id: 'torn-newsprint', label: '撕裂旧报纸', kind: 'newspaper', defaults: { presetId: 'torn-newsprint', paperTone: '#aaa087', inkColor: '#403c32', accentColor: '#756d59', aging: .76, moisture: .34, crease: .5, tear: .82, opacity: .98, typography: 'serif' } },
  { id: 'mouldy-directory', label: '发霉电话簿', kind: 'booklet', defaults: { presetId: 'mouldy-directory', paperTone: '#59462f', inkColor: '#d1c5a5', accentColor: '#2f271c', aging: .86, moisture: .74, crease: .2, tear: .18, opacity: 1, typography: 'official' } },
  { id: 'carbon-ticket', label: '蓝灰回执', kind: 'ticket', defaults: { presetId: 'carbon-ticket', paperTone: '#8196a0', inkColor: '#263943', accentColor: '#b4c5c7', aging: .44, moisture: .42, crease: .64, tear: .25, opacity: .96, typography: 'typewriter' } },
  { id: 'faded-sticker', label: '褪色贴纸', kind: 'sticker', defaults: { presetId: 'faded-sticker', paperTone: '#9b8464', inkColor: '#4b2f25', accentColor: '#b5a07a', aging: .72, moisture: .2, crease: .18, tear: .38, opacity: .92, typography: 'official' } },
  { id: 'pencil-note', label: '铅笔手写纸条', kind: 'handwritten-note', defaults: { presetId: 'pencil-note', paperTone: '#c0b394', inkColor: '#3e3a33', accentColor: '#776d5a', aging: .55, moisture: .25, crease: .72, tear: .5, opacity: .96, typography: 'handwritten' } },
]

function slug(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry'
}

function phoneId(number: string, label: string) {
  return KNOWN_PHONE_IDS[number] ?? `${slug(label)}-${number}`
}

function kindForHotspot(id: string): ScenePropKind {
  if (id.includes('plate') || id.includes('return')) return 'brass-plate'
  if (id.includes('newspaper')) return 'newspaper'
  if (id.includes('phonebook')) return 'booklet'
  if (id.includes('meridian')) return 'classified-ad'
  return 'paper-card'
}

function presetForKind(kind: ScenePropKind) {
  return DEFAULT_SCENE_STYLE_PRESETS.find((preset) => preset.kind === kind)?.id ?? 'damp-service-card'
}

function legacyPrintedLines(hotspot: SceneHotspot) {
  const number = hotspot.number ? hotspot.number.replace(/(\d{3})(\d{4})/, '$1 $2') : undefined
  if (hotspot.id === 'weather-card') return ['LONDON WEATHER', number ?? '946 0264', 'RAIN · RAIN · RAIN']
  if (hotspot.id === 'meridian-ad') return ['MERIDIAN', 'COURTESY EXCHANGE', number ?? '871 4000']
  if (hotspot.id === 'scratched-plate') return ['MAINTENANCE', number ?? '871 4///19']
  if (hotspot.id === 'newspaper') return ['RADIO NOCTURNE', number ?? '794 1966', 'MIDNIGHT REQUESTS']
  if (hotspot.id === 'phonebook') return ['LONDON DIRECTORY', 'LOST PROPERTY', number ?? '301 1968']
  return [hotspot.label.toLocaleUpperCase()]
}

function migrateDirectory(entries: Array<Partial<PhoneDirectoryEntry> & { number: string; label: string; description: string }>) {
  return entries.map((entry) => ({ ...entry, id: entry.id || phoneId(entry.number, entry.label) })) as PhoneDirectoryEntry[]
}

function migrateLegacyScene(hotspots: SceneHotspot[], directory: PhoneDirectoryEntry[]): SceneDefinition {
  const props: ScenePropDefinition[] = hotspots.map((hotspot) => {
    const kind = kindForHotspot(hotspot.id)
    const linked = hotspot.number ? directory.find((entry) => entry.number === hotspot.number)?.id : undefined
    return {
      id: hotspot.id,
      kind,
      label: hotspot.label,
      ariaLabel: hotspot.ariaLabel,
      printedLines: legacyPrintedLines(hotspot),
      copy: { firstVariants: [hotspot.body], ...(hotspot.repeatBody ? { repeatVariants: [hotspot.repeatBody] } : {}) },
      ...(linked ? { phoneRefs: [linked] } : {}),
      sceneEvent: hotspot.id,
      appearance: { presetId: presetForKind(kind) },
    }
  })
  return {
    refreshPolicy: 'nightStart',
    initialRoll: true,
    fixtures: structuredClone(DEFAULT_SCENE_FIXTURES),
    stylePresets: structuredClone(DEFAULT_SCENE_STYLE_PRESETS),
    props,
    slots: hotspots.map((hotspot) => ({
      id: hotspot.id,
      label: hotspot.label,
      bounds: { x: hotspot.x, y: hotspot.y, width: hotspot.width, height: hotspot.height },
      spawnChance: 1,
      requires: hotspot.requires,
      candidates: [{ propId: hotspot.id, weight: 1 }],
      jitter: { rotation: 1.2, scale: .025 },
    })),
  }
}

export function mergeSceneAppearance(...values: Array<Partial<SceneAppearance> | undefined>): SceneAppearance {
  return Object.assign({ presetId: 'damp-service-card' }, ...values)
}

export function migrateTelephoneStory(value: unknown): TelephoneStory {
  if (!value || typeof value !== 'object') throw new Error('Telephone story must be an object.')
  const source = structuredClone(value) as any
  const legacyNumbers = source.globals?.phone?.validNumbers ?? source.globals?.phone?.directory ?? []
  const directory = migrateDirectory(legacyNumbers)
  const scene = source.extensions?.telephone?.scene
    ?? migrateLegacyScene(source.extensions?.telephone?.sceneHotspots ?? [], directory)
  scene.refreshPolicy = 'nightStart'
  scene.initialRoll ??= true
  scene.fixtures ??= structuredClone(DEFAULT_SCENE_FIXTURES)
  scene.fixtures.phone ??= structuredClone(DEFAULT_SCENE_FIXTURES.phone)
  scene.fixtures.counter ??= structuredClone(DEFAULT_SCENE_FIXTURES.counter)
  scene.fixtures.phone.desktop ??= structuredClone(DEFAULT_SCENE_FIXTURES.phone.desktop)
  scene.fixtures.phone.mobile ??= structuredClone(DEFAULT_SCENE_FIXTURES.phone.mobile)
  scene.fixtures.counter.desktop ??= structuredClone(DEFAULT_SCENE_FIXTURES.counter.desktop)
  scene.fixtures.counter.mobile ??= structuredClone(DEFAULT_SCENE_FIXTURES.counter.mobile)
  scene.stylePresets ??= structuredClone(DEFAULT_SCENE_STYLE_PRESETS)

  delete source.globals.phone.validNumbers
  source.globals.phone.directory = directory
  delete source.extensions.telephone.sceneHotspots
  source.extensions.telephone.scene = scene
  source.formatVersion = 2
  return source as TelephoneStory
}
