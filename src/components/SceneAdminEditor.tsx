import { ArrowLeft, Dice5, Eye, Grip, MapPin, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createNightCoins } from '../game/boothItems'
import { CallEngine } from '../game/callEngine'
import { candidatePercentages, resolveSceneCandidatePreview, resolveSceneLayout } from '../game/sceneRandomizer'
import type {
  SceneAppearance,
  SceneCandidate,
  ScenePropDefinition,
  ScenePropKind,
  SceneFixturePosition,
  SceneSlot,
  SceneTypography,
  TelephoneStory,
} from '../game/types'
import { CollapsibleAdminSection } from './CollapsibleAdminSection'
import { BoothShelf } from './BoothShelf'
import { PhoneBooth } from './PhoneBooth'
import { SceneProp } from './SceneProp'

interface SceneAdminEditorProps {
  story: TelephoneStory
  onChange: (story: TelephoneStory) => void
  onExit: () => void
}

const KINDS: ScenePropKind[] = ['paper-card', 'classified-ad', 'poster', 'brass-plate', 'newspaper', 'booklet', 'ticket', 'sticker', 'handwritten-note']
const TYPOGRAPHY: SceneTypography[] = ['serif', 'typewriter', 'handwritten', 'official']
const BRUSHES = [0, .25, .5, .75, 1]

function lines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

function uniqueId(prefix: string, existing: string[]) {
  let index = existing.length + 1
  while (existing.includes(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clampChance(value: number) {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1)
}

interface SlotDragState {
  kind: 'slot'
  slotId: string
  offsetX: number
  offsetY: number
  width: number
  height: number
  layer: 'wall' | 'counter'
}

interface FixtureDragState {
  kind: 'fixture'
  fixture: 'phone' | 'counter'
  offsetX: number
  offsetY: number
}

type DragState = SlotDragState | FixtureDragState

export function SceneAdminEditor({ story, onChange, onExit }: SceneAdminEditorProps) {
  const scene = story.extensions.telephone.scene
  const [selectedSlotId, setSelectedSlotId] = useState(scene.slots[0]?.id ?? '')
  const [selectedFixture, setSelectedFixture] = useState<'phone' | 'counter' | null>(null)
  const [previewPropId, setPreviewPropId] = useState<string | null>(null)
  const [seed, setSeed] = useState(42)
  const [mobilePreview, setMobilePreview] = useState(false)
  const [brushChance, setBrushChance] = useState<number | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fixtureStageRef = useRef<HTMLDivElement>(null)
  const counterLayerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)

  const selectedSlot = scene.slots.find((slot) => slot.id === selectedSlotId)
  const selectedCandidateIndex = selectedSlot
    ? Math.max(0, selectedSlot.candidates.findIndex((candidate) => candidate.propId === previewPropId))
    : -1
  const selectedCandidate = selectedSlot?.candidates[selectedCandidateIndex]
  const selectedProp = scene.props.find((prop) => prop.id === selectedCandidate?.propId)
  const selectedPreset = scene.stylePresets.find((preset) => preset.id === selectedProp?.appearance.presetId)
  const effectiveAppearance = { ...selectedPreset?.defaults, ...selectedProp?.appearance }
  const percentages = selectedSlot ? candidatePercentages(selectedSlot) : []
  const compatibleProps = selectedSlot?.layer === 'counter'
    ? scene.props.filter((prop) => prop.counterStyle)
    : scene.props.filter((prop) => !prop.counterStyle)

  const previewItems = useMemo(() => {
    const state = new CallEngine(story, undefined, seed).state
    const rolled = resolveSceneLayout(story, state, undefined, 0)
    const previewSlot = story.extensions.telephone.scene.slots.find((slot) => slot.id === selectedSlotId)
    const previewCandidate = previewSlot?.candidates.find((candidate) => candidate.propId === previewPropId)
    if (!previewSlot || !previewCandidate) return rolled
    const forced = resolveSceneCandidatePreview(story, previewSlot, previewCandidate, seed)
    if (!forced) return rolled
    return [...rolled.filter((item) => item.slotId !== previewSlot.id), forced]
  }, [previewPropId, seed, selectedSlotId, story])
  const previewCoins = useMemo(() => createNightCoins(seed), [seed])

  function updateScene(nextScene: typeof scene) {
    onChange({
      ...story,
      extensions: {
        ...story.extensions,
        telephone: { ...story.extensions.telephone, scene: nextScene },
      },
    })
  }

  function updateSlotById(slotId: string, patch: Partial<SceneSlot>) {
    updateScene({ ...scene, slots: scene.slots.map((slot) => slot.id === slotId ? { ...slot, ...patch } : slot) })
  }

  function updateSlot(patch: Partial<SceneSlot>) {
    if (selectedSlot) updateSlotById(selectedSlot.id, patch)
  }

  function updateFixture(fixture: 'phone' | 'counter', patch: Partial<SceneFixturePosition>) {
    const viewport = mobilePreview ? 'mobile' : 'desktop'
    updateScene({
      ...scene,
      fixtures: {
        ...scene.fixtures,
        [fixture]: {
          ...scene.fixtures[fixture],
          [viewport]: { ...scene.fixtures[fixture][viewport], ...patch },
        },
      },
    })
  }

  function updateCandidate(index: number, patch: Partial<SceneCandidate>) {
    if (!selectedSlot) return
    updateSlot({ candidates: selectedSlot.candidates.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, ...patch } : candidate) })
  }

  function updateProp(patch: Partial<ScenePropDefinition>) {
    if (!selectedProp) return
    updateScene({ ...scene, props: scene.props.map((prop) => prop.id === selectedProp.id ? { ...prop, ...patch } : prop) })
  }

  function updateAppearance(patch: Partial<SceneAppearance>) {
    if (selectedProp) updateProp({ appearance: { ...selectedProp.appearance, ...patch } })
  }

  function applyAppearancePreset(presetId: string) {
    if (!selectedProp) return
    const preset = scene.stylePresets.find((item) => item.id === presetId)
    updateProp({
      appearance: {
        ...(preset?.defaults ?? { presetId }),
        presetId,
        ...(selectedProp.appearance.rotation !== undefined ? { rotation: selectedProp.appearance.rotation } : {}),
        ...(selectedProp.appearance.scale !== undefined ? { scale: selectedProp.appearance.scale } : {}),
      },
    })
  }

  function selectSlot(slot: SceneSlot) {
    setSelectedFixture(null)
    setSelectedSlotId(slot.id)
    setPreviewPropId(slot.candidates[0]?.propId ?? null)
    if (brushChance !== null) updateSlotById(slot.id, { spawnChance: brushChance })
  }

  function changeSlotLayer(layer: 'wall' | 'counter') {
    if (!selectedSlot) return
    const pool = layer === 'counter' ? scene.props.filter((prop) => prop.counterStyle) : scene.props.filter((prop) => !prop.counterStyle)
    const compatibleIds = new Set(pool.map((prop) => prop.id))
    const retained = selectedSlot.candidates.filter((candidate) => compatibleIds.has(candidate.propId))
    const candidates = retained.length ? retained : pool[0] ? [{ propId: pool[0].id, weight: 1 }] : []
    updateSlot({ layer, candidates })
    setPreviewPropId(candidates[0]?.propId ?? null)
  }

  function addSlot() {
    const id = uniqueId('scene-slot', scene.slots.map((slot) => slot.id))
    const propId = scene.props[0]?.id
    const slot: SceneSlot = {
      id,
      label: '新场景点位',
      layer: 'wall',
      bounds: { x: 44, y: 46, width: 12, height: 12 },
      mobileBounds: { x: 36, y: 62, width: 28, height: 10 },
      spawnChance: .5,
      candidates: propId ? [{ propId, weight: 1 }] : [],
      jitter: { x: 1, y: 1, rotation: 2, scale: .03 },
    }
    updateScene({ ...scene, slots: [...scene.slots, slot] })
    setSelectedFixture(null)
    setSelectedSlotId(id)
    setPreviewPropId(propId ?? null)
  }

  function addProp() {
    const id = uniqueId('scene-prop', scene.props.map((prop) => prop.id))
    const onCounter = selectedSlot?.layer === 'counter'
    const prop: ScenePropDefinition = {
      id,
      kind: onCounter ? 'ticket' : 'paper-card',
      label: onCounter ? '新柜台遗留物' : '新遗留物',
      ariaLabel: onCounter ? '拿起一件新柜台遗留物' : '查看一件新遗留物',
      printedLines: onCounter ? ['GPO NIGHT DESK', 'UNFILED'] : ['LONDON', 'NO. 000'],
      copy: { firstVariants: ['纸面受潮，字迹仍能辨认。'], repeatVariants: ['没有更多线索。'] },
      ...(onCounter ? { counterStyle: 'night-ticket' as const } : {}),
      appearance: { presetId: onCounter ? 'carbon-ticket' : scene.stylePresets[0]?.id ?? 'damp-service-card' },
    }
    const slots = selectedSlot
      ? scene.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, candidates: [...slot.candidates, { propId: id, weight: 1 }] } : slot)
      : scene.slots
    updateScene({ ...scene, props: [...scene.props, prop], slots })
    setPreviewPropId(id)
  }

  function deleteSelectedSlot() {
    if (!selectedSlot || scene.slots.length <= 1) return
    const slots = scene.slots.filter((slot) => slot.id !== selectedSlot.id)
    updateScene({ ...scene, slots })
    setSelectedSlotId(slots[0]?.id ?? '')
    setPreviewPropId(slots[0]?.candidates[0]?.propId ?? null)
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>, slot: SceneSlot) {
    if (brushChance !== null) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    selectSlot(slot)
    const layer = slot.layer ?? 'wall'
    const container = layer === 'counter' ? counterLayerRef.current : stageRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const bounds = mobilePreview ? slot.mobileBounds ?? slot.bounds : slot.bounds
    dragRef.current = {
      kind: 'slot',
      slotId: slot.id,
      offsetX: (event.clientX - rect.left) / rect.width * 100 - bounds.x,
      offsetY: (event.clientY - rect.top) / rect.height * 100 - bounds.y,
      width: bounds.width,
      height: bounds.height,
      layer,
    }
  }

  function dragSlot(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.kind !== 'slot') return
    const container = drag.layer === 'counter' ? counterLayerRef.current : stageRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width * 100 - drag.offsetX, -8, 108 - drag.width)
    const y = clamp((event.clientY - rect.top) / rect.height * 100 - drag.offsetY, -8, 108 - drag.height)
    const slot = scene.slots.find((item) => item.id === drag.slotId)
    if (!slot) return
    if (mobilePreview) updateSlotById(slot.id, { mobileBounds: { ...(slot.mobileBounds ?? slot.bounds), x, y } })
    else updateSlotById(slot.id, { bounds: { ...slot.bounds, x, y } })
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
  }

  function selectFixture(fixture: 'phone' | 'counter') {
    setSelectedFixture(fixture)
    setSelectedSlotId('')
    setPreviewPropId(null)
    setBrushChance(null)
  }

  function beginFixtureDrag(event: ReactPointerEvent<HTMLButtonElement>, fixture: 'phone' | 'counter') {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    selectFixture(fixture)
    const container = fixtureStageRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const viewport = mobilePreview ? 'mobile' : 'desktop'
    const position = scene.fixtures[fixture][viewport]
    dragRef.current = {
      kind: 'fixture',
      fixture,
      offsetX: (event.clientX - rect.left) / rect.width * 100 - position.x,
      offsetY: (event.clientY - rect.top) / rect.height * 100 - position.y,
    }
  }

  function dragFixture(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const container = fixtureStageRef.current
    if (!drag || drag.kind !== 'fixture' || !container) return
    const rect = container.getBoundingClientRect()
    updateFixture(drag.fixture, {
      x: clamp((event.clientX - rect.left) / rect.width * 100 - drag.offsetX, 0, 100),
      y: clamp((event.clientY - rect.top) / rect.height * 100 - drag.offsetY, 0, 100),
    })
  }

  function renderSlotOutline(slot: SceneSlot) {
    const previewBounds = mobilePreview ? slot.mobileBounds ?? slot.bounds : slot.bounds
    return (
      <button
        key={`slot-${slot.id}`}
        type="button"
        className={`scene-slot-outline ${selectedSlot?.id === slot.id ? 'is-selected' : ''}`}
        style={{ left: `${previewBounds.x}%`, top: `${previewBounds.y}%`, width: `${previewBounds.width}%`, height: `${previewBounds.height}%` }}
        onClick={() => selectSlot(slot)}
        onPointerDown={(event) => beginDrag(event, slot)}
        onPointerMove={dragSlot}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label={`拖动或编辑点位 ${slot.label}`}
      >
        <Grip size={12} /><span>{Math.round(slot.spawnChance * 100)}%</span>
      </button>
    )
  }

  const wallSlots = scene.slots.filter((slot) => (slot.layer ?? 'wall') === 'wall')
  const counterSlots = scene.slots.filter((slot) => slot.layer === 'counter')
  const wallItems = previewItems.filter((item) => item.layer === 'wall')
  const counterItems = previewItems.filter((item) => item.layer === 'counter')
  const fixtures = scene.fixtures
  const fixtureStyle = {
    '--fixture-phone-x': `${fixtures.phone.desktop.x}%`,
    '--fixture-phone-y': `${fixtures.phone.desktop.y}%`,
    '--fixture-phone-mobile-x': `${fixtures.phone.mobile.x}%`,
    '--fixture-phone-mobile-y': `${fixtures.phone.mobile.y}%`,
    '--fixture-counter-x': `${fixtures.counter.desktop.x}%`,
    '--fixture-counter-y': `${fixtures.counter.desktop.y}%`,
    '--fixture-counter-mobile-x': `${fixtures.counter.mobile.x}%`,
    '--fixture-counter-mobile-y': `${fixtures.counter.mobile.y}%`,
  } as CSSProperties
  const selectedFixturePosition = selectedFixture
    ? fixtures[selectedFixture][mobilePreview ? 'mobile' : 'desktop']
    : null
  const noop = () => undefined

  return (
    <section className="graph-editor-shell scene-admin-shell">
      <div className="scene-admin-canvas-pane">
        <div className="scene-admin-toolbar">
          <button type="button" onClick={onExit}><ArrowLeft size={14} />返回剧情图</button>
          <span className="scene-drag-hint"><Grip size={12} />直接拖动物件框移动点位</span>
          <div className="scene-preview-seed">
            <label><span>夜班种子</span><input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value) || 1)} /></label>
            <button type="button" onClick={() => setSeed((value) => value + 1)}><Dice5 size={14} />下一夜</button>
          </div>
          <div className="scene-preview-size" role="group" aria-label="预览尺寸">
            <button className={!mobilePreview ? 'active' : ''} type="button" onClick={() => setMobilePreview(false)}>16:9</button>
            <button className={mobilePreview ? 'active' : ''} type="button" onClick={() => setMobilePreview(true)}>手机</button>
          </div>
        </div>

        <div className={`scene-admin-stage-wrap ${mobilePreview ? 'is-mobile' : ''}`}>
          <div ref={stageRef} className="scene-admin-stage" aria-label="场景热点实时预览">
            <div className="scene-admin-lamp" aria-hidden="true" />
            <div className="scene-admin-rain" aria-hidden="true" />
            {wallItems.map((item) => <SceneProp key={item.instanceId} item={item} selected={item.slotId === selectedSlot?.id} preview />)}
            <div ref={fixtureStageRef} className="scene-admin-fixture-stage" style={fixtureStyle}>
              <PhoneBooth
                preview
                phase="idle"
                dialWarning={false}
                dialedNumber=""
                elapsed={0}
                node={null}
                handsetDocked
                coinCredit={0}
                heldCoin={false}
                mechanicalPulse={null}
                onLift={noop}
                onHangup={noop}
                onInsertCoin={noop}
                onReturnCoin={noop}
                onLineTest={noop}
                onDigit={noop}
                onDialTick={noop}
                onDialReturn={noop}
                onDialError={noop}
              />
              <BoothShelf
                preview
                coins={previewCoins}
                heldItemId={null}
                coinCredit={0}
                objects={counterItems}
                disabled
                counterItemsRef={counterLayerRef}
                overlay={counterSlots.map(renderSlotOutline)}
                onToggleCoin={noop}
                onToggleObject={noop}
              />
              <button
                type="button"
                className={`scene-fixture-outline fixture-phone ${selectedFixture === 'phone' ? 'is-selected' : ''}`}
                onClick={() => selectFixture('phone')}
                onPointerDown={(event) => beginFixtureDrag(event, 'phone')}
                onPointerMove={dragFixture}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                aria-label="移动电话机（固定尺寸）"
              ><Grip size={14} /><span>电话机 · 仅位置</span></button>
              <button
                type="button"
                className={`scene-fixture-outline fixture-counter ${selectedFixture === 'counter' ? 'is-selected' : ''}`}
                onClick={() => selectFixture('counter')}
                onPointerDown={(event) => beginFixtureDrag(event, 'counter')}
                onPointerMove={dragFixture}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                aria-label="移动柜台（固定尺寸）"
              ><Grip size={14} /><span>柜台 · 仅位置</span></button>
            </div>
            {wallSlots.map(renderSlotOutline)}
            <div className="scene-admin-caption"><span>LIVE BOOTH PROOF</span><strong>这一夜将出现 {previewItems.length} 件物品</strong><small>同一夜班内快照不会变化</small></div>
          </div>
        </div>
      </div>

      <aside className="graph-inspector scene-admin-inspector">
        <header className="scene-inspector-heading">
          <div><span>SCENE RANDOMIZATION / NIGHT START</span><h2>夜班场景配置</h2></div>
          <button type="button" onClick={addSlot}><Plus size={13} />新增点位</button>
        </header>
        <div className="inspector-scroll">
          <CollapsibleAdminSection title="固定设施位置">
            <p className="admin-help">电话机与柜台只能移动，尺寸、比例、旋转和删除均已锁定；这里的坐标直接用于正式游戏。</p>
            <div className="scene-fixture-list">
              <button className={selectedFixture === 'phone' ? 'active' : ''} type="button" onClick={() => selectFixture('phone')}><Grip size={12} /><span>公共电话机</span><small>固定比例</small></button>
              <button className={selectedFixture === 'counter' ? 'active' : ''} type="button" onClick={() => selectFixture('counter')}><Grip size={12} /><span>置物柜台</span><small>固定比例</small></button>
            </div>
            {selectedFixture && selectedFixturePosition && (
              <div className="fixture-position-fields">
                <label><span>{mobilePreview ? '手机' : '桌面'} X（中心）%</span><input type="number" step=".1" value={selectedFixturePosition.x} onChange={(event) => updateFixture(selectedFixture, { x: Number(event.target.value) })} /></label>
                <label><span>{mobilePreview ? '手机' : '桌面'} Y（顶边）%</span><input type="number" step=".1" value={selectedFixturePosition.y} onChange={(event) => updateFixture(selectedFixture, { y: Number(event.target.value) })} /></label>
              </div>
            )}
          </CollapsibleAdminSection>

          <CollapsibleAdminSection title="概率刷">
            <p className="admin-help">选择概率后，点击左侧任一点位即可快速刷入；“选择”模式可拖动点位。</p>
            <div className="probability-brushes">
              <button className={brushChance === null ? 'active' : ''} type="button" onClick={() => setBrushChance(null)}>选择</button>
              {BRUSHES.map((chance) => <button className={brushChance === chance ? 'active' : ''} type="button" key={chance} onClick={() => setBrushChance(chance)}>{Math.round(chance * 100)}%</button>)}
            </div>
          </CollapsibleAdminSection>

          <CollapsibleAdminSection title="场景点位">
            <div className="scene-slot-list">{scene.slots.map((slot) => <button className={slot.id === selectedSlot?.id ? 'active' : ''} type="button" key={slot.id} onClick={() => selectSlot(slot)}><MapPin size={12} /><span>{slot.label}</span><small>{slot.layer === 'counter' ? '柜台' : '墙面'} · {Math.round(slot.spawnChance * 100)}%</small></button>)}</div>
          </CollapsibleAdminSection>

          {selectedSlot && <>
            <CollapsibleAdminSection title="所选点位">
              <div className="two-fields"><label><span>ID（稳定引用）</span><input value={selectedSlot.id} disabled /></label><label><span>名称</span><input value={selectedSlot.label} onChange={(event) => updateSlot({ label: event.target.value })} /></label></div>
              <label><span>所在层</span><select value={selectedSlot.layer ?? 'wall'} onChange={(event) => changeSlotLayer(event.target.value as 'wall' | 'counter')}><option value="wall">电话后方墙面</option><option value="counter">下方柜台</option></select></label>
              <label><span>整点生成概率 · {Math.round(selectedSlot.spawnChance * 100)}%</span><input type="range" min="0" max="1" step=".01" value={selectedSlot.spawnChance} onChange={(event) => updateSlot({ spawnChance: clampChance(Number(event.target.value)) })} /></label>
              <p className="admin-help">也可直接拖动左侧虚线框。墙面坐标相对整个场景，柜台坐标相对下方台面。</p>
              <div className="four-fields">{(['x', 'y', 'width', 'height'] as const).map((field) => <label key={field}><span>{field}%</span><input type="number" step=".1" value={selectedSlot.bounds[field]} onChange={(event) => updateSlot({ bounds: { ...selectedSlot.bounds, [field]: Number(event.target.value) } })} /></label>)}</div>
              <p className="admin-help">竖屏点位（未填写时沿用桌面坐标）</p>
              <div className="four-fields">{(['x', 'y', 'width', 'height'] as const).map((field) => <label key={`mobile-${field}`}><span>手机 {field}%</span><input type="number" step=".1" value={(selectedSlot.mobileBounds ?? selectedSlot.bounds)[field]} onChange={(event) => updateSlot({ mobileBounds: { ...(selectedSlot.mobileBounds ?? selectedSlot.bounds), [field]: Number(event.target.value) } })} /></label>)}</div>
              <div className="four-fields">{(['x', 'y', 'rotation', 'scale'] as const).map((field) => <label key={field}><span>抖动 {field}</span><input type="number" step=".01" value={selectedSlot.jitter?.[field] ?? 0} onChange={(event) => updateSlot({ jitter: { ...selectedSlot.jitter, [field]: Number(event.target.value) } })} /></label>)}</div>
              <button className="inline-delete" type="button" disabled={scene.slots.length <= 1} onClick={deleteSelectedSlot}><Trash2 size={13} />删除点位</button>
            </CollapsibleAdminSection>

            <CollapsibleAdminSection title="候选池与权重">
              <div className="scene-candidate-list">
                {selectedSlot.candidates.map((candidate, index) => {
                  const chance = percentages[index]?.absoluteChance ?? 0
                  return <article className={candidate.propId === selectedCandidate?.propId ? 'active' : ''} key={`${candidate.propId}-${index}`}>
                    <button className="candidate-preview" type="button" onClick={() => setPreviewPropId(candidate.propId)}><Eye size={13} /><span>{scene.props.find((prop) => prop.id === candidate.propId)?.label ?? candidate.propId}</span><strong>{Math.round(chance * 1000) / 10}% / 夜</strong></button>
                    <label><span>物品样式</span><select value={candidate.propId} onChange={(event) => { updateCandidate(index, { propId: event.target.value }); setPreviewPropId(event.target.value) }}>{compatibleProps.map((prop) => <option key={prop.id} value={prop.id}>{prop.label} · {prop.id}</option>)}</select></label>
                    <label><span>相对权重 · {candidate.weight}</span><input type="range" min="0" max="10" step=".1" value={candidate.weight} onChange={(event) => updateCandidate(index, { weight: Number(event.target.value) })} /></label>
                    <div className="two-fields"><label><span>该候选预设覆盖</span><select value={candidate.appearanceOverrides?.presetId ?? ''} onChange={(event) => updateCandidate(index, { appearanceOverrides: { ...candidate.appearanceOverrides, presetId: event.target.value || undefined } })}><option value="">继承物品</option>{scene.stylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label><label><span>旋转覆盖（°）</span><input type="number" value={candidate.appearanceOverrides?.rotation ?? ''} onChange={(event) => updateCandidate(index, { appearanceOverrides: { ...candidate.appearanceOverrides, rotation: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label></div>
                    <button className="inline-delete" type="button" disabled={selectedSlot.candidates.length <= 1} onClick={() => updateSlot({ candidates: selectedSlot.candidates.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={12} />移出候选池</button>
                  </article>
                })}
              </div>
              <div className="candidate-actions"><button type="button" disabled={!compatibleProps.length} onClick={() => updateSlot({ candidates: [...selectedSlot.candidates, { propId: compatibleProps[0]?.id ?? '', weight: 1 }] })}><Plus size={13} />引用现有物品</button><button type="button" onClick={addProp}><Plus size={13} />新建物品样式</button></div>
            </CollapsibleAdminSection>
          </>}

          {selectedProp && <>
            <CollapsibleAdminSection title="物品内容（可被多个点位复用）">
              <div className="two-fields"><label><span>物品 ID</span><input value={selectedProp.id} disabled /></label><label><span>显示名称</span><input value={selectedProp.label} onChange={(event) => updateProp({ label: event.target.value })} /></label></div>
              <div className="two-fields"><label><span>物品种类</span><select value={selectedProp.kind} onChange={(event) => updateProp({ kind: event.target.value as ScenePropKind })}>{KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></label><label><span>场景事件</span><input value={selectedProp.sceneEvent ?? ''} onChange={(event) => updateProp({ sceneEvent: event.target.value || undefined })} /></label></div>
              {selectedSlot?.layer === 'counter' && <label><span>柜台拟物造型</span><select value={selectedProp.counterStyle ?? 'night-ticket'} onChange={(event) => updateProp({ counterStyle: event.target.value as ScenePropDefinition['counterStyle'] })}><option value="night-ticket">末班车票</option><option value="meridian-matches">火柴盒</option><option value="locker-key">黄铜钥匙</option><option value="operator-docket">交换台回执</option></select></label>}
              <label><span>无障碍描述</span><input value={selectedProp.ariaLabel} onChange={(event) => updateProp({ ariaLabel: event.target.value })} /></label>
              <label><span>物品表面印刷（每行一条）</span><textarea rows={4} value={(selectedProp.printedLines ?? []).join('\n')} onChange={(event) => updateProp({ printedLines: lines(event.target.value) })} /></label>
              <label><span>首次查看文案 variants（每行一条）</span><textarea rows={5} value={selectedProp.copy.firstVariants.join('\n')} onChange={(event) => updateProp({ copy: { ...selectedProp.copy, firstVariants: lines(event.target.value) } })} /></label>
              <label><span>再次查看文案 variants（每行一条）</span><textarea rows={3} value={(selectedProp.copy.repeatVariants ?? []).join('\n')} onChange={(event) => updateProp({ copy: { ...selectedProp.copy, repeatVariants: lines(event.target.value) } })} /></label>
            </CollapsibleAdminSection>

            <CollapsibleAdminSection title="关联电话簿（可留空）">
              <p className="admin-help">不含号码的车票、回执或私人物件可以完全不关联电话，只提供气氛、人物或线路规则信息。</p>
              <div className="phone-ref-grid">{story.globals.phone.directory.map((phone) => {
                const checked = (selectedProp.phoneRefs ?? []).includes(phone.id)
                return <label className="checkbox-line" key={phone.id}><input type="checkbox" checked={checked} onChange={(event) => updateProp({ phoneRefs: event.target.checked ? [...(selectedProp.phoneRefs ?? []), phone.id] : (selectedProp.phoneRefs ?? []).filter((id) => id !== phone.id) })} /><span><strong>{phone.label}</strong><small>{phone.number} · {phone.id}</small></span></label>
              })}</div>
            </CollapsibleAdminSection>

            <CollapsibleAdminSection title="拟物外观参数">
              <div className="two-fields"><label><span>样式预设</span><select value={selectedProp.appearance.presetId} onChange={(event) => applyAppearancePreset(event.target.value)}>{scene.stylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label><label><span>排版</span><select value={selectedProp.appearance.typography ?? ''} onChange={(event) => updateAppearance({ typography: event.target.value as SceneTypography || undefined })}><option value="">继承预设</option>{TYPOGRAPHY.map((type) => <option key={type}>{type}</option>)}</select></label></div>
              <div className="three-colors"><label><span>纸张/材质</span><input type="color" value={effectiveAppearance.paperTone ?? '#b5a986'} onChange={(event) => updateAppearance({ paperTone: event.target.value })} /></label><label><span>墨色</span><input type="color" value={effectiveAppearance.inkColor ?? '#37362f'} onChange={(event) => updateAppearance({ inkColor: event.target.value })} /></label><label><span>强调色</span><input type="color" value={effectiveAppearance.accentColor ?? '#716348'} onChange={(event) => updateAppearance({ accentColor: event.target.value })} /></label></div>
              {(['rotation', 'scale', 'aging', 'moisture', 'crease', 'tear', 'opacity'] as const).map((field) => {
                const isRotation = field === 'rotation'
                const min = isRotation ? -20 : field === 'scale' ? .5 : 0
                const max = isRotation ? 20 : field === 'scale' ? 1.5 : 1
                const fallback = field === 'scale' || field === 'opacity' ? 1 : 0
                const value = effectiveAppearance[field] ?? fallback
                return <label key={field}><span>{field} · {value}</span><input type="range" min={min} max={max} step={isRotation ? .1 : .01} value={value} onChange={(event) => updateAppearance({ [field]: Number(event.target.value) })} /></label>
              })}
            </CollapsibleAdminSection>
          </>}
        </div>
      </aside>
    </section>
  )
}
