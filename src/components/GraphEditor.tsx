import {
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { BookOpen, Cable, Clock3, ContactRound, MapPin, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CallEngine } from '../game/callEngine'
import type {
  EngineTransition,
  RingEvent,
  TelephoneEdge,
  TelephoneNode,
  TelephoneNodeKind,
  TelephoneStory,
  TriggerType,
} from '../game/types'
import { SceneAdminEditor } from './SceneAdminEditor'
import { CollapsibleAdminSection } from './CollapsibleAdminSection'
import { PhoneDirectoryEditor } from './PhoneDirectoryEditor'

interface GraphEditorProps { story: TelephoneStory; onChange: (story: TelephoneStory) => void }
type InspectorTab = 'node' | 'edge' | 'simulate' | 'phone' | 'directory' | 'scene'

const NODE_KINDS: TelephoneNodeKind[] = ['start', 'idle', 'incoming_call', 'dial_target', 'call', 'menu', 'scene', 'global', 'end', 'fail']
const TRIGGERS: TriggerType[] = ['dialNumber', 'choice', 'incomingAnswer', 'hangUp', 'timeout', 'sceneInspect', 'keywordAny', 'auto']
const SPEAKERS = ['caller', 'operator', 'recording', 'stranger', 'system', 'player'] as const

function lines(value: string) { return value.split('\n').map((line) => line.trim()).filter(Boolean) }
function uniqueId(prefix: string, existing: string[]) {
  let index = existing.length + 1
  while (existing.includes(`${prefix}_${index}`)) index += 1
  return `${prefix}_${index}`
}

function nodeColor(kind: TelephoneNodeKind) {
  if (kind === 'end') return '#376857'
  if (kind === 'fail') return '#71413e'
  if (kind === 'global') return '#6f673e'
  if (kind === 'incoming_call') return '#765b2f'
  if (kind === 'scene') return '#4d6171'
  if (kind === 'menu') return '#4e466e'
  return '#37443e'
}

function JsonTextarea({ value, rows = 6, onCommit }: { value: unknown; rows?: number; onCommit: (value: any) => void }) {
  const serialized = JSON.stringify(value ?? [], null, 2)
  const [invalid, setInvalid] = useState(false)

  function commit(raw: string) {
    try {
      onCommit(JSON.parse(raw))
      setInvalid(false)
    } catch {
      setInvalid(true)
    }
  }

  return <textarea key={serialized} rows={rows} defaultValue={serialized} aria-invalid={invalid} onBlur={(event) => commit(event.currentTarget.value)} />
}

export function GraphEditor({ story, onChange }: GraphEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(story.entryNodeId)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [tab, setTab] = useState<InspectorTab>('node')
  const [simEvent, setSimEvent] = useState<TriggerType>('dialNumber')
  const [simValue, setSimValue] = useState('9460264')
  const [simulator, setSimulator] = useState(() => new CallEngine(story, undefined, 42))
  const [simState, setSimState] = useState(() => structuredClone(new CallEngine(story, undefined, 42).state))
  const [simLog, setSimLog] = useState<EngineTransition[]>([])

  const flowNodes = useMemo<Node[]>(() => story.nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: `${node.label}\n${node.id}` },
    type: 'default',
    initialWidth: 178,
    initialHeight: 64,
    measured: { width: 178, height: 64 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    className: `telephone-flow-node kind-${node.kind}`,
    style: { background: nodeColor(node.kind), color: '#f2eee2', border: selectedNodeId === node.id ? '2px solid #e5b85c' : '1px solid #737b70', borderRadius: 6, width: 178, fontSize: 11, whiteSpace: 'pre-line' },
  })), [selectedNodeId, story.nodes])
  const flowEdges = useMemo<Edge[]>(() => story.edges.map((edge) => ({ id: edge.id, source: edge.from, target: edge.to, label: `${edge.label} · ${edge.trigger.type}`, animated: selectedEdgeId === edge.id, className: selectedEdgeId === edge.id ? 'selected-flow-edge' : '' })), [selectedEdgeId, story.edges])
  const selectedNode = story.nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = story.edges.find((edge) => edge.id === selectedEdgeId) ?? null
  const simulatorNode = story.nodes.find((node) => node.id === simState.currentNodeId) ?? null

  function updateNode(patch: Partial<TelephoneNode>) {
    onChange({ ...story, nodes: story.nodes.map((node) => node.id === selectedNodeId ? { ...node, ...patch } : node) })
  }
  function updateEdge(patch: Partial<TelephoneEdge>) {
    if (!selectedEdgeId) return
    onChange({ ...story, edges: story.edges.map((edge) => edge.id === selectedEdgeId ? { ...edge, ...patch } : edge) })
  }

  function onNodesChange(changes: NodeChange[]) {
    const next = applyNodeChanges(changes, flowNodes)
    const positions = new Map(next.map((node) => [node.id, node.position]))
    onChange({ ...story, nodes: story.nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })) })
  }

  function onEdgesChange(changes: EdgeChange[]) {
    const next = applyEdgeChanges(changes, flowEdges)
    const kept = new Set(next.map((edge) => edge.id))
    onChange({ ...story, edges: story.edges.filter((edge) => kept.has(edge.id)) })
  }

  function connect(connection: Connection) {
    if (!connection.source || !connection.target) return
    const id = uniqueId('edge', story.edges.map((edge) => edge.id))
    const edge: TelephoneEdge = {
      id,
      label: '新转场',
      from: connection.source,
      to: connection.target,
      priority: 50,
      trigger: { type: 'choice', value: id },
      choice: { text: '继续', tone: 'plain' },
    }
    addEdge({ id, source: connection.source, target: connection.target }, flowEdges)
    onChange({ ...story, edges: [...story.edges, edge] })
    setSelectedEdgeId(id)
    setTab('edge')
  }

  function addNode(kind: TelephoneNodeKind) {
    const id = uniqueId(kind, story.nodes.map((node) => node.id))
    const node: TelephoneNode = {
      id, label: `新 ${kind}`, kind,
      position: { x: 160 + story.nodes.length * 26, y: 160 + story.nodes.length * 18 },
      body: { variants: ['新通话文本。'], fallbackVariants: [], notes: '' },
      telephone: { speaker: 'operator', speakerLabel: '未知线路', lcd: 'LINE OPEN', canHangUp: true },
    }
    onChange({ ...story, nodes: [...story.nodes, node] })
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
    setTab('node')
  }

  function removeSelection() {
    if (selectedEdgeId) {
      onChange({ ...story, edges: story.edges.filter((edge) => edge.id !== selectedEdgeId) })
      setSelectedEdgeId(null)
      return
    }
    if (!selectedNode || selectedNode.id === story.entryNodeId || selectedNode.kind === 'global') return
    onChange({ ...story, nodes: story.nodes.filter((node) => node.id !== selectedNode.id), edges: story.edges.filter((edge) => edge.from !== selectedNode.id && edge.to !== selectedNode.id) })
    setSelectedNodeId(story.entryNodeId)
  }

  function resetSimulator() {
    const next = new CallEngine(story, undefined, 42)
    setSimulator(next)
    setSimState(structuredClone(next.state))
    setSimLog([])
  }

  function runSimulation() {
    const transition = simulator.dispatch({ type: simEvent, value: simValue, createdAt: Date.now() })
    setSimState(transition.state)
    setSimLog((items) => [...items, transition])
  }

  function updateRing(index: number, patch: Partial<RingEvent>) {
    const idleRingSchedule = story.globals.phone.idleRingSchedule.map((ring, itemIndex) => itemIndex === index ? { ...ring, ...patch } : ring)
    onChange({ ...story, globals: { ...story.globals, phone: { ...story.globals.phone, idleRingSchedule } } })
  }
  if (tab === 'scene') return <SceneAdminEditor story={story} onChange={onChange} onExit={() => setTab('node')} />
  if (tab === 'directory') return <PhoneDirectoryEditor story={story} onChange={onChange} onExit={() => setTab('node')} />

  return (
    <section className="graph-editor-shell">
      <div className="graph-canvas-pane">
        <div className="graph-toolbar">
          <div className="node-adders">{NODE_KINDS.map((kind) => <button type="button" key={kind} onClick={() => addNode(kind)}><Plus size={12} />{kind}</button>)}</div>
          <button className="danger-tool" type="button" onClick={removeSelection} aria-label="删除所选内容"><Trash2 size={15} /></button>
        </div>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          minZoom={0.12}
          maxZoom={1.8}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connect}
          onNodeClick={(_, selected) => { setSelectedNodeId(selected.id); setSelectedEdgeId(null); setTab('node') }}
          onEdgeClick={(_, selected) => { setSelectedEdgeId(selected.id); setTab('edge') }}
        >
          <Background color="#727970" gap={22} size={1} />
          <MiniMap nodeColor={(flowNode) => nodeColor(story.nodes.find((node) => node.id === flowNode.id)?.kind ?? 'call')} pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>

      <aside className="graph-inspector">
        <nav className="inspector-tabs">
          <button className={tab === 'node' ? 'active' : ''} onClick={() => setTab('node')}><BookOpen size={13} />节点</button>
          <button className={tab === 'edge' ? 'active' : ''} onClick={() => setTab('edge')}><Cable size={13} />转场</button>
          <button className={tab === 'simulate' ? 'active' : ''} onClick={() => setTab('simulate')}><Play size={13} />运行预览</button>
          <button className={tab === 'phone' ? 'active' : ''} onClick={() => setTab('phone')}><Clock3 size={13} />线路与超时</button>
          <button onClick={() => setTab('directory')}><ContactRound size={13} />电话簿</button>
          <button onClick={() => setTab('scene')}><MapPin size={13} />夜班场景</button>
        </nav>

        <div className="inspector-scroll">
          {tab === 'node' && selectedNode && <>
            <CollapsibleAdminSection title="节点身份">
              <label><span>ID（保持稳定）</span><input value={selectedNode.id} disabled /></label>
              <label><span>名称</span><input value={selectedNode.label} onChange={(event) => updateNode({ label: event.target.value })} /></label>
              <label><span>类型</span><select value={selectedNode.kind} onChange={(event) => updateNode({ kind: event.target.value as TelephoneNodeKind })}>{NODE_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></label>
              <label><span>标签（逗号分隔）</span><input value={(selectedNode.tags ?? []).join(', ')} onChange={(event) => updateNode({ tags: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></label>
            </CollapsibleAdminSection>
            <CollapsibleAdminSection title="通话内容">
              <label><span>文本 variants（每行一条）</span><textarea rows={7} value={selectedNode.body.variants.join('\n')} onChange={(event) => updateNode({ body: { ...selectedNode.body, variants: lines(event.target.value) } })} /></label>
              <label><span>Fallback（每行一条）</span><textarea rows={4} value={(selectedNode.body.fallbackVariants ?? []).join('\n')} onChange={(event) => updateNode({ body: { ...selectedNode.body, fallbackVariants: lines(event.target.value) } })} /></label>
              <label><span>剧情目标 / 备注</span><textarea rows={3} value={selectedNode.body.notes ?? ''} onChange={(event) => updateNode({ body: { ...selectedNode.body, notes: event.target.value } })} /></label>
            </CollapsibleAdminSection>
            <CollapsibleAdminSection title="电话适配字段">
              <label><span>说话者类型</span><select value={selectedNode.telephone?.speaker ?? 'operator'} onChange={(event) => updateNode({ telephone: { ...selectedNode.telephone, speaker: event.target.value as typeof SPEAKERS[number] } })}>{SPEAKERS.map((speaker) => <option key={speaker}>{speaker}</option>)}</select></label>
              <label><span>说话者显示名</span><input value={selectedNode.telephone?.speakerLabel ?? ''} onChange={(event) => updateNode({ telephone: { ...selectedNode.telephone, speakerLabel: event.target.value } })} /></label>
              <label><span>LCD 覆盖文本</span><input value={selectedNode.telephone?.lcd ?? ''} onChange={(event) => updateNode({ telephone: { ...selectedNode.telephone, lcd: event.target.value } })} /></label>
              <div className="two-fields"><label><span>自动推进（毫秒）</span><input type="number" value={selectedNode.telephone?.autoAdvanceMs ?? ''} onChange={(event) => updateNode({ telephone: { ...selectedNode.telephone, autoAdvanceMs: event.target.value ? Number(event.target.value) : undefined } })} /></label><label><span>线路失真（0–1）</span><input type="number" min="0" max="1" step="0.05" value={selectedNode.telephone?.corruption ?? 0} onChange={(event) => updateNode({ telephone: { ...selectedNode.telephone, corruption: Number(event.target.value) } })} /></label></div>
              <label className="checkbox-line"><input type="checkbox" checked={selectedNode.telephone?.canHangUp !== false} onChange={(event) => updateNode({ telephone: { ...selectedNode.telephone, canHangUp: event.target.checked } })} /><span>允许玩家挂断</span></label>
              <label><span>结局类型（留空表示非结局）</span><input value={selectedNode.telephone?.ending ?? ''} onChange={(event) => updateNode({ telephone: { ...selectedNode.telephone, ending: event.target.value as any || undefined } })} /></label>
            </CollapsibleAdminSection>
          </>}

          {tab === 'edge' && (selectedEdge ? <>
            <CollapsibleAdminSection title="转场身份">
              <label><span>ID</span><input value={selectedEdge.id} disabled /></label>
              <label><span>名称</span><input value={selectedEdge.label} onChange={(event) => updateEdge({ label: event.target.value })} /></label>
              <div className="two-fields"><label><span>From</span><select value={selectedEdge.from} onChange={(event) => updateEdge({ from: event.target.value })}>{story.nodes.map((node) => <option key={node.id}>{node.id}</option>)}</select></label><label><span>To</span><select value={selectedEdge.to} onChange={(event) => updateEdge({ to: event.target.value })}>{story.nodes.map((node) => <option key={node.id}>{node.id}</option>)}</select></label></div>
              <label><span>优先级</span><input type="number" value={selectedEdge.priority} onChange={(event) => updateEdge({ priority: Number(event.target.value) })} /></label>
            </CollapsibleAdminSection>
            <CollapsibleAdminSection title="事件触发">
              <label><span>触发类型</span><select value={selectedEdge.trigger.type} onChange={(event) => updateEdge({ trigger: { ...selectedEdge.trigger, type: event.target.value as TriggerType } })}>{TRIGGERS.map((trigger) => <option key={trigger}>{trigger}</option>)}</select></label>
              <label><span>触发值（号码 / 选项 ID / 热点 ID）</span><input value={selectedEdge.trigger.value ?? ''} onChange={(event) => updateEdge({ trigger: { ...selectedEdge.trigger, value: event.target.value || undefined } })} /></label>
              <label><span>样例事件（每行一条）</span><textarea rows={3} value={(selectedEdge.samples ?? []).join('\n')} onChange={(event) => updateEdge({ samples: lines(event.target.value) })} /></label>
              {selectedEdge.trigger.type === 'choice' && <><label><span>玩家可见选项</span><textarea rows={3} value={selectedEdge.choice?.text ?? ''} onChange={(event) => updateEdge({ choice: { ...selectedEdge.choice, text: event.target.value, tone: selectedEdge.choice?.tone ?? 'plain' } })} /></label><label><span>选项语气</span><select value={selectedEdge.choice?.tone ?? 'plain'} onChange={(event) => updateEdge({ choice: { text: selectedEdge.choice?.text ?? selectedEdge.label, tone: event.target.value as any } })}><option>plain</option><option>warm</option><option>defiant</option><option>compliant</option></select></label><label className="checkbox-line"><input type="checkbox" checked={selectedEdge.choice?.hidden ?? false} onChange={(event) => updateEdge({ choice: { text: selectedEdge.choice?.text ?? selectedEdge.label, tone: selectedEdge.choice?.tone ?? 'plain', hidden: event.target.checked } })} /><span>默认隐藏该选项</span></label></>}
            </CollapsibleAdminSection>
            <CollapsibleAdminSection title="条件与效果（JSON）">
              <label><span>conditions</span><JsonTextarea rows={7} value={selectedEdge.conditions ?? []} onCommit={(conditions) => updateEdge({ conditions })} /></label>
              <label><span>effects</span><JsonTextarea rows={7} value={selectedEdge.effects ?? []} onCommit={(effects) => updateEdge({ effects })} /></label>
            </CollapsibleAdminSection>
          </> : <div className="empty-inspector">在画布中选择一条转场连线。</div>)}

          {tab === 'simulate' && <>
            <CollapsibleAdminSection title="事件模拟器">
              <div className="two-fields"><label><span>事件</span><select value={simEvent} onChange={(event) => setSimEvent(event.target.value as TriggerType)}>{TRIGGERS.map((trigger) => <option key={trigger}>{trigger}</option>)}</select></label><label><span>值</span><input value={simValue} onChange={(event) => setSimValue(event.target.value)} /></label></div>
              <div className="sim-actions"><button type="button" onClick={runSimulation}><Play size={14} />执行事件</button><button type="button" onClick={resetSimulator}><RotateCcw size={14} />重置</button></div>
            </CollapsibleAdminSection>
            <dl className="sim-state"><div><dt>当前节点</dt><dd>{simState.currentNodeId}</dd></div><div><dt>LCD</dt><dd>{simulatorNode?.telephone?.lcd ?? 'LINE OPEN'}</dd></div><div><dt>回合</dt><dd>{simState.turn}</dd></div><div><dt>结局</dt><dd>{simState.ending ?? '—'}</dd></div><div><dt>Flags</dt><dd><code>{JSON.stringify(simState.flags)}</code></dd></div></dl>
            <div className="sim-transcript">{simLog.length ? simLog.map((item, index) => <article key={`${item.event.type}-${index}`}><span>{item.event.type}</span><strong>{item.node.label}</strong><p>{item.text}</p><small>{item.edge ? `命中 ${item.edge.id}` : 'Fallback / 无匹配边'} · 候选 {item.candidates.join(', ') || '无'}</small></article>) : <p className="muted-copy">从任意号码、来电、选择、超时、挂断或场景事件开始测试。</p>}</div>
          </>}

          {tab === 'phone' && <>
            <CollapsibleAdminSection title="线路目标">
              <label><span>空号节点</span><select value={story.globals.phone.wrongNumberNodeId} onChange={(event) => onChange({ ...story, globals: { ...story.globals, phone: { ...story.globals.phone, wrongNumberNodeId: event.target.value } } })}>{story.nodes.map((node) => <option key={node.id}>{node.id}</option>)}</select></label>
              <label><span>忙音节点</span><select value={story.globals.phone.busyNumberNodeId} onChange={(event) => onChange({ ...story, globals: { ...story.globals, phone: { ...story.globals.phone, busyNumberNodeId: event.target.value } } })}>{story.nodes.map((node) => <option key={node.id}>{node.id}</option>)}</select></label>
              <label><span>紧急号码（逗号分隔）</span><input value={(story.globals.phone.emergencyNumbers ?? []).join(', ')} onChange={(event) => onChange({ ...story, globals: { ...story.globals, phone: { ...story.globals.phone, emergencyNumbers: event.target.value.split(',').map((value) => value.replace(/\D/g, '')).filter(Boolean) } } })} /></label>
            </CollapsibleAdminSection>
            <CollapsibleAdminSection title="超时配置（毫秒）">
              {Object.entries(story.globals.timeout).map(([key, value]) => <label key={key}><span>{key}</span><input type="number" value={value} onChange={(event) => onChange({ ...story, globals: { ...story.globals, timeout: { ...story.globals.timeout, [key]: Number(event.target.value) } } })} /></label>)}
            </CollapsibleAdminSection>
            <CollapsibleAdminSection title="主动来电排程">
              <div className="admin-list-heading"><div><span>INCOMING SWITCHBOARD</span><h3>来电列表</h3></div><button type="button" onClick={() => onChange({ ...story, globals: { ...story.globals, phone: { ...story.globals.phone, idleRingSchedule: [...story.globals.phone.idleRingSchedule, { id: `incoming-${story.globals.phone.idleRingSchedule.length + 1}`, label: '新来电', delayMs: 12000, nodeId: story.entryNodeId, requires: [] }] } } })}><Plus size={13} />新增</button></div>
              <div className="admin-number-list">{story.globals.phone.idleRingSchedule.map((ring, index) => <article key={`${ring.id}-${index}`}><div className="two-fields"><label><span>ID</span><input value={ring.id} onChange={(event) => updateRing(index, { id: event.target.value })} /></label><label><span>显示名称</span><input value={ring.label} onChange={(event) => updateRing(index, { label: event.target.value })} /></label></div><div className="two-fields"><label><span>来电节点</span><select value={ring.nodeId} onChange={(event) => updateRing(index, { nodeId: event.target.value })}>{story.nodes.map((node) => <option key={node.id}>{node.id}</option>)}</select></label><label><span>等待时间（毫秒）</span><input type="number" value={ring.delayMs} onChange={(event) => updateRing(index, { delayMs: Number(event.target.value) })} /></label></div><label><span>触发条件</span><JsonTextarea rows={5} value={ring.requires ?? []} onCommit={(requires) => updateRing(index, { requires })} /></label><button type="button" className="inline-delete" onClick={() => onChange({ ...story, globals: { ...story.globals, phone: { ...story.globals.phone, idleRingSchedule: story.globals.phone.idleRingSchedule.filter((_, itemIndex) => itemIndex !== index) } } })}><Trash2 size={13} />删除</button></article>)}</div>
            </CollapsibleAdminSection>
          </>}
        </div>
      </aside>
    </section>
  )
}
