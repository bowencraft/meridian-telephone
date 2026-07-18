import { ArrowLeft, Dice5, Eye, MapPin, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CallEngine } from '../game/callEngine'
import { candidatePercentages, resolveSceneCandidatePreview, resolveSceneLayout } from '../game/sceneRandomizer'
import type {
  SceneAppearance,
  SceneCandidate,
  ScenePropDefinition,
  ScenePropKind,
  SceneSlot,
  SceneTypography,
  TelephoneStory,
} from '../game/types'
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

function clampChance(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

export function SceneAdminEditor({ story, onChange, onExit }: SceneAdminEditorProps) {
  const scene = story.extensions.telephone.scene
  const [selectedSlotId, setSelectedSlotId] = useState(scene.slots[0]?.id ?? '')
  const [previewPropId, setPreviewPropId] = useState<string | null>(null)
  const [seed, setSeed] = useState(42)
  const [mobilePreview, setMobilePreview] = useState(false)
  const [brushChance, setBrushChance] = useState<number | null>(null)

  const selectedSlot = scene.slots.find((slot) => slot.id === selectedSlotId) ?? scene.slots[0]
  const selectedCandidateIndex = selectedSlot
    ? Math.max(0, selectedSlot.candidates.findIndex((candidate) => candidate.propId === previewPropId))
    : -1
  const selectedCandidate = selectedSlot?.candidates[selectedCandidateIndex]
  const selectedProp = scene.props.find((prop) => prop.id === selectedCandidate?.propId)
  const percentages = selectedSlot ? candidatePercentages(selectedSlot) : []

  const previewItems = useMemo(() => {
    const state = new CallEngine(story, undefined, seed).state
    const rolled = resolveSceneLayout(story, state, undefined, 0)
    if (!selectedSlot || !selectedCandidate) return rolled
    const forced = resolveSceneCandidatePreview(story, selectedSlot, selectedCandidate, seed)
    if (!forced) return rolled
    return [...rolled.filter((item) => item.slotId !== selectedSlot.id), forced]
  }, [seed, selectedCandidate, selectedSlot, story])

  function updateScene(nextScene: typeof scene) {
    onChange({
      ...story,
      extensions: {
        ...story.extensions,
        telephone: { ...story.extensions.telephone, scene: nextScene },
      },
    })
  }

  function updateSlot(patch: Partial<SceneSlot>) {
    if (!selectedSlot) return
    updateScene({ ...scene, slots: scene.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, ...patch } : slot) })
  }

  function updateCandidate(index: number, patch: Partial<SceneCandidate>) {
    if (!selectedSlot) return
    const candidates = selectedSlot.candidates.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, ...patch } : candidate)
    updateSlot({ candidates })
  }

  function updateProp(patch: Partial<ScenePropDefinition>) {
    if (!selectedProp) return
    updateScene({ ...scene, props: scene.props.map((prop) => prop.id === selectedProp.id ? { ...prop, ...patch } : prop) })
  }

  function updateAppearance(patch: Partial<SceneAppearance>) {
    if (!selectedProp) return
    updateProp({ appearance: { ...selectedProp.appearance, ...patch } })
  }

  function selectSlot(slot: SceneSlot) {
    setSelectedSlotId(slot.id)
    const firstPropId = slot.candidates[0]?.propId ?? null
    setPreviewPropId(firstPropId)
    if (brushChance !== null) {
      updateScene({ ...scene, slots: scene.slots.map((item) => item.id === slot.id ? { ...item, spawnChance: brushChance } : item) })
    }
  }

  function addSlot() {
    const id = uniqueId('scene-slot', scene.slots.map((slot) => slot.id))
    const propId = scene.props[0]?.id
    const slot: SceneSlot = {
      id,
      label: '新场景点位',
      bounds: { x: 44, y: 46, width: 12, height: 12 },
      mobileBounds: { x: 36, y: 62, width: 28, height: 10 },
      spawnChance: .5,
      candidates: propId ? [{ propId, weight: 1 }] : [],
      jitter: { x: 1, y: 1, rotation: 2, scale: .03 },
    }
    updateScene({ ...scene, slots: [...scene.slots, slot] })
    setSelectedSlotId(id)
    setPreviewPropId(propId ?? null)
  }

  function addProp() {
    const id = uniqueId('scene-prop', scene.props.map((prop) => prop.id))
    const prop: ScenePropDefinition = {
      id,
      kind: 'paper-card',
      label: '新遗留物',
      ariaLabel: '查看一件新遗留物',
      printedLines: ['LONDON', 'NO. 000'],
      copy: { firstVariants: ['纸面受潮，字迹仍能辨认。'], repeatVariants: ['没有更多线索。'] },
      appearance: { presetId: scene.stylePresets[0]?.id ?? 'damp-service-card' },
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

  return (
    <section className="graph-editor-shell scene-admin-shell">
      <div className="scene-admin-canvas-pane">
        <div className="scene-admin-toolbar">
          <button type="button" onClick={onExit}><ArrowLeft size={14} />返回剧情图</button>
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
          <div className="scene-admin-stage" aria-label="场景热点实时预览">
            <div className="scene-admin-lamp" aria-hidden="true" />
            <div className="scene-admin-rain" aria-hidden="true" />
            <div className="scene-admin-phone-ghost" aria-hidden="true"><i /><span /></div>
            {scene.slots.map((slot) => (
              (() => {
                const previewBounds = mobilePreview ? slot.mobileBounds ?? slot.bounds : slot.bounds
                return (
              <button
                key={`slot-${slot.id}`}
                type="button"
                className={`scene-slot-outline ${selectedSlot?.id === slot.id ? 'is-selected' : ''}`}
                style={{ left: `${previewBounds.x}%`, top: `${previewBounds.y}%`, width: `${previewBounds.width}%`, height: `${previewBounds.height}%` }}
                onClick={() => selectSlot(slot)}
                aria-label={`编辑点位 ${slot.label}`}
              >
                <span>{Math.round(slot.spawnChance * 100)}%</span>
              </button>
                )
              })()
            ))}
            {previewItems.map((item) => (
              <SceneProp
                key={item.instanceId}
                item={item}
                selected={item.slotId === selectedSlot?.id}
                preview
                onClick={() => {
                  const slot = scene.slots.find((entry) => entry.id === item.slotId)
                  if (slot) selectSlot(slot)
                }}
              />
            ))}
            <div className="scene-admin-caption"><span>LIVE BOOTH PROOF</span><strong>这一夜将出现 {resolveSceneLayout(story, new CallEngine(story, undefined, seed).state, undefined, 0).length} 件物品</strong><small>同一夜班内快照不会变化</small></div>
          </div>
        </div>
      </div>

      <aside className="graph-inspector scene-admin-inspector">
        <header className="scene-inspector-heading">
          <div><span>SCENE RANDOMIZATION / NIGHT START</span><h2>夜班场景配置</h2></div>
          <button type="button" onClick={addSlot}><Plus size={13} />新增点位</button>
        </header>
        <div className="inspector-scroll">
          <fieldset>
            <legend>概率刷</legend>
            <p className="admin-help">选择概率后，点击左侧任一点位即可快速刷入；“选择”模式只定位，不修改。</p>
            <div className="probability-brushes">
              <button className={brushChance === null ? 'active' : ''} type="button" onClick={() => setBrushChance(null)}>选择</button>
              {BRUSHES.map((chance) => <button className={brushChance === chance ? 'active' : ''} type="button" key={chance} onClick={() => setBrushChance(chance)}>{Math.round(chance * 100)}%</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>场景点位</legend>
            <div className="scene-slot-list">{scene.slots.map((slot) => <button className={slot.id === selectedSlot?.id ? 'active' : ''} type="button" key={slot.id} onClick={() => selectSlot(slot)}><MapPin size={12} /><span>{slot.label}</span><small>{Math.round(slot.spawnChance * 100)}%</small></button>)}</div>
          </fieldset>

          {selectedSlot && <>
            <fieldset>
              <legend>所选点位</legend>
              <div className="two-fields"><label><span>ID（稳定引用）</span><input value={selectedSlot.id} disabled /></label><label><span>名称</span><input value={selectedSlot.label} onChange={(event) => updateSlot({ label: event.target.value })} /></label></div>
              <label><span>整点生成概率 · {Math.round(selectedSlot.spawnChance * 100)}%</span><input type="range" min="0" max="1" step=".01" value={selectedSlot.spawnChance} onChange={(event) => updateSlot({ spawnChance: clampChance(Number(event.target.value)) })} /></label>
              <div className="four-fields">{(['x', 'y', 'width', 'height'] as const).map((field) => <label key={field}><span>{field}%</span><input type="number" step=".1" value={selectedSlot.bounds[field]} onChange={(event) => updateSlot({ bounds: { ...selectedSlot.bounds, [field]: Number(event.target.value) } })} /></label>)}</div>
              <p className="admin-help">竖屏点位（未填写时沿用桌面坐标）</p>
              <div className="four-fields">{(['x', 'y', 'width', 'height'] as const).map((field) => <label key={`mobile-${field}`}><span>手机 {field}%</span><input type="number" step=".1" value={(selectedSlot.mobileBounds ?? selectedSlot.bounds)[field]} onChange={(event) => updateSlot({ mobileBounds: { ...(selectedSlot.mobileBounds ?? selectedSlot.bounds), [field]: Number(event.target.value) } })} /></label>)}</div>
              <div className="four-fields">{(['x', 'y', 'rotation', 'scale'] as const).map((field) => <label key={field}><span>抖动 {field}</span><input type="number" step=".01" value={selectedSlot.jitter?.[field] ?? 0} onChange={(event) => updateSlot({ jitter: { ...selectedSlot.jitter, [field]: Number(event.target.value) } })} /></label>)}</div>
              <button className="inline-delete" type="button" disabled={scene.slots.length <= 1} onClick={deleteSelectedSlot}><Trash2 size={13} />删除点位</button>
            </fieldset>

            <fieldset>
              <legend>候选池与权重</legend>
              <div className="scene-candidate-list">
                {selectedSlot.candidates.map((candidate, index) => {
                  const chance = percentages[index]?.absoluteChance ?? 0
                  return <article className={candidate.propId === selectedCandidate?.propId ? 'active' : ''} key={`${candidate.propId}-${index}`}>
                    <button className="candidate-preview" type="button" onClick={() => setPreviewPropId(candidate.propId)}><Eye size={13} /><span>{scene.props.find((prop) => prop.id === candidate.propId)?.label ?? candidate.propId}</span><strong>{Math.round(chance * 1000) / 10}% / 夜</strong></button>
                    <label><span>物品样式</span><select value={candidate.propId} onChange={(event) => { updateCandidate(index, { propId: event.target.value }); setPreviewPropId(event.target.value) }}>{scene.props.map((prop) => <option key={prop.id} value={prop.id}>{prop.label} · {prop.id}</option>)}</select></label>
                    <label><span>相对权重 · {candidate.weight}</span><input type="range" min="0" max="10" step=".1" value={candidate.weight} onChange={(event) => updateCandidate(index, { weight: Number(event.target.value) })} /></label>
                    <div className="two-fields"><label><span>该候选预设覆盖</span><select value={candidate.appearanceOverrides?.presetId ?? ''} onChange={(event) => updateCandidate(index, { appearanceOverrides: { ...candidate.appearanceOverrides, presetId: event.target.value || undefined } })}><option value="">继承物品</option>{scene.stylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label><label><span>旋转覆盖（°）</span><input type="number" value={candidate.appearanceOverrides?.rotation ?? ''} onChange={(event) => updateCandidate(index, { appearanceOverrides: { ...candidate.appearanceOverrides, rotation: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label></div>
                    <button className="inline-delete" type="button" disabled={selectedSlot.candidates.length <= 1} onClick={() => updateSlot({ candidates: selectedSlot.candidates.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={12} />移出候选池</button>
                  </article>
                })}
              </div>
              <div className="candidate-actions"><button type="button" onClick={() => updateSlot({ candidates: [...selectedSlot.candidates, { propId: scene.props[0]?.id ?? '', weight: 1 }] })}><Plus size={13} />引用现有物品</button><button type="button" onClick={addProp}><Plus size={13} />新建物品样式</button></div>
            </fieldset>
          </>}

          {selectedProp && <>
            <fieldset>
              <legend>物品内容（可被多个点位复用）</legend>
              <div className="two-fields"><label><span>物品 ID</span><input value={selectedProp.id} disabled /></label><label><span>显示名称</span><input value={selectedProp.label} onChange={(event) => updateProp({ label: event.target.value })} /></label></div>
              <div className="two-fields"><label><span>物品种类</span><select value={selectedProp.kind} onChange={(event) => updateProp({ kind: event.target.value as ScenePropKind })}>{KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></label><label><span>场景事件</span><input value={selectedProp.sceneEvent ?? ''} onChange={(event) => updateProp({ sceneEvent: event.target.value || undefined })} /></label></div>
              <label><span>无障碍描述</span><input value={selectedProp.ariaLabel} onChange={(event) => updateProp({ ariaLabel: event.target.value })} /></label>
              <label><span>物品表面印刷（每行一条）</span><textarea rows={4} value={(selectedProp.printedLines ?? []).join('\n')} onChange={(event) => updateProp({ printedLines: lines(event.target.value) })} /></label>
              <label><span>首次查看文案 variants（每行一条）</span><textarea rows={5} value={selectedProp.copy.firstVariants.join('\n')} onChange={(event) => updateProp({ copy: { ...selectedProp.copy, firstVariants: lines(event.target.value) } })} /></label>
              <label><span>再次查看文案 variants（每行一条）</span><textarea rows={3} value={(selectedProp.copy.repeatVariants ?? []).join('\n')} onChange={(event) => updateProp({ copy: { ...selectedProp.copy, repeatVariants: lines(event.target.value) } })} /></label>
            </fieldset>

            <fieldset>
              <legend>关联电话簿</legend>
              <p className="admin-help">通过稳定的电话 ID 关联，不把号码写死在热点里；多个物品、多个点位可以指向同一个电话。</p>
              <div className="phone-ref-grid">{story.globals.phone.directory.map((phone) => {
                const checked = (selectedProp.phoneRefs ?? []).includes(phone.id)
                return <label className="checkbox-line" key={phone.id}><input type="checkbox" checked={checked} onChange={(event) => updateProp({ phoneRefs: event.target.checked ? [...(selectedProp.phoneRefs ?? []), phone.id] : (selectedProp.phoneRefs ?? []).filter((id) => id !== phone.id) })} /><span><strong>{phone.label}</strong><small>{phone.number} · {phone.id}</small></span></label>
              })}</div>
            </fieldset>

            <fieldset>
              <legend>拟物外观参数</legend>
              <div className="two-fields"><label><span>样式预设</span><select value={selectedProp.appearance.presetId} onChange={(event) => updateAppearance({ presetId: event.target.value })}>{scene.stylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label><label><span>排版</span><select value={selectedProp.appearance.typography ?? ''} onChange={(event) => updateAppearance({ typography: event.target.value as SceneTypography || undefined })}><option value="">继承预设</option>{TYPOGRAPHY.map((type) => <option key={type}>{type}</option>)}</select></label></div>
              <div className="three-colors"><label><span>纸张/材质</span><input type="color" value={selectedProp.appearance.paperTone ?? '#b5a986'} onChange={(event) => updateAppearance({ paperTone: event.target.value })} /></label><label><span>墨色</span><input type="color" value={selectedProp.appearance.inkColor ?? '#37362f'} onChange={(event) => updateAppearance({ inkColor: event.target.value })} /></label><label><span>强调色</span><input type="color" value={selectedProp.appearance.accentColor ?? '#716348'} onChange={(event) => updateAppearance({ accentColor: event.target.value })} /></label></div>
              {(['rotation', 'scale', 'aging', 'moisture', 'crease', 'tear', 'opacity'] as const).map((field) => {
                const isRotation = field === 'rotation'
                const min = isRotation ? -20 : field === 'scale' ? .5 : 0
                const max = isRotation ? 20 : field === 'scale' ? 1.5 : 1
                const fallback = field === 'scale' || field === 'opacity' ? 1 : 0
                return <label key={field}><span>{field} · {selectedProp.appearance[field] ?? fallback}</span><input type="range" min={min} max={max} step={isRotation ? .1 : .01} value={selectedProp.appearance[field] ?? fallback} onChange={(event) => updateAppearance({ [field]: Number(event.target.value) })} /></label>
              })}
            </fieldset>
          </>}
        </div>
      </aside>
    </section>
  )
}
