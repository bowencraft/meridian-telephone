import { Headphones, NotebookTabs, RotateCcw, Settings2, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { CallEngine, conditionsMatch, loadStoryDefinition } from '../game/callEngine'
import { elapsedSeconds } from '../game/callTimer'
import { formatPhoneNumber, shouldConnect } from '../game/dialModel'
import { TelephoneAudio } from '../game/audio'
import { createSessionId, loadProgress, saveRecord } from '../game/record'
import { visibleHotspots } from '../game/sceneInteractions'
import { initialTelephoneState, telephoneReducer } from '../game/telephoneState'
import type {
  CallRecordData,
  ChoiceView,
  DialLogEntry,
  EngineTransition,
  SceneHotspot,
  TranscriptEntry,
} from '../game/types'
import { CallTextOverlay } from './CallTextOverlay'
import { ChoiceClouds } from './ChoiceClouds'
import { PhoneBooth } from './PhoneBooth'
import { SceneHotspots } from './SceneHotspots'

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function TelephoneScene() {
  const story = useMemo(() => loadStoryDefinition(), [])
  const [progress, setProgress] = useState(loadProgress)
  const audioRef = useRef(new TelephoneAudio())
  const [engine, setEngine] = useState(() => new CallEngine(story, progress))

  const [machine, machineDispatch] = useReducer(telephoneReducer, initialTelephoneState)
  const [started, setStarted] = useState(false)
  const [runtime, setRuntime] = useState(() => structuredClone(engine.state))
  const [node, setNode] = useState(engine.currentNode())
  const [callText, setCallText] = useState(engine.opening().text)
  const [choices, setChoices] = useState<ChoiceView[]>([])
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [dialLog, setDialLog] = useState<DialLogEntry[]>([])
  const [inspected, setInspected] = useState<string[]>([])
  const [clueCard, setClueCard] = useState<{ title: string; body: string } | null>(null)
  const [numberBookOpen, setNumberBookOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [ringLabel, setRingLabel] = useState('未知来电')
  const [startedAt, setStartedAt] = useState(0)
  const [sessionId, setSessionId] = useState(createSessionId)
  const recordSavedRef = useRef(false)
  const connectTimerRef = useRef<number | null>(null)
  const idleDeadlineRef = useRef<{ key: string; at: number } | null>(null)

  const appendTranscript = useCallback((transition: EngineTransition, number?: string) => {
    const speaker = transition.node.telephone?.speaker ?? 'system'
    const entry: TranscriptEntry = {
      id: nowId('line'),
      speaker,
      speakerLabel: transition.node.telephone?.speakerLabel ?? transition.node.label,
      text: transition.text,
      nodeId: transition.node.id,
      ...(number ? { number } : {}),
      createdAt: Date.now(),
    }
    setTranscript((items) => [...items, entry])
  }, [])

  const applyTransition = useCallback((transition: EngineTransition, number?: string) => {
    const nextChoices = engine.getChoices()
    setRuntime(transition.state)
    setNode(transition.node)
    setCallText(transition.text)
    setChoices(nextChoices)
    appendTranscript(transition, number)
    audioRef.current.playWhisper()
    if (transition.node.id === story.globals.phone.busyNumberNodeId) audioRef.current.startBusy()
    if (transition.node.id === story.globals.phone.wrongNumberNodeId) audioRef.current.playNumberUnobtainable()
    machineDispatch({
      type: 'CONNECTED',
      nodeId: transition.node.id,
      now: Date.now(),
      hasChoices: nextChoices.some((choice) => !choice.hidden),
    })
    if (transition.node.telephone?.ending) {
      machineDispatch({ type: 'END', nodeId: transition.node.id })
      audioRef.current.stopAll()
      audioRef.current.playReveal()
    }
  }, [appendTranscript, engine, story.globals.phone.busyNumberNodeId, story.globals.phone.wrongNumberNodeId])

  const hangUp = useCallback(() => {
    if (machine.phase === 'idle' || machine.phase === 'intro' || machine.phase === 'ending') return
    if (node.telephone?.canHangUp === false) {
      audioRef.current.playError()
      return
    }
    if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current)
    audioRef.current.stopCallLoops()
    audioRef.current.playHangup()
    engine.setFlag('hangups', Number(engine.state.flags.hangups ?? 0) + 1)
    const hangupEdges = engine.availableEdges({ type: 'hangUp' })
    if (hangupEdges.length) {
      const transition = engine.dispatch({ type: 'hangUp', createdAt: Date.now() })
      if (transition.node.telephone?.ending) {
        applyTransition(transition)
        return
      }
    }
    engine.returnToIdleNode()
    setRuntime(structuredClone(engine.state))
    setNode(engine.currentNode())
    setCallText(engine.opening().text)
    setChoices([])
    machineDispatch({ type: 'HANG_UP' })
    window.setTimeout(() => machineDispatch({ type: 'RESET_IDLE' }), 560)
  }, [applyTransition, engine, machine.phase, node.telephone?.canHangUp])

  const handleTimeout = useCallback((kind: 'choice' | 'call') => {
    const transition = engine.dispatch({ type: 'timeout', value: kind, createdAt: Date.now() })
    if (!transition.edge) {
      hangUp()
      return
    }
    if (transition.node.id === story.entryNodeId) {
      hangUp()
      return
    }
    applyTransition(transition)
  }, [applyTransition, engine, hangUp, story.entryNodeId])

  useEffect(() => {
    if (!machine.callStartedAt) return
    const update = () => setElapsed(elapsedSeconds(machine.callStartedAt, Date.now()))
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [machine.callStartedAt])

  useEffect(() => {
    if (!started || machine.phase !== 'idle') return
    const next = story.globals.phone.idleRingSchedule.find((ring) =>
      !engine.state.handledRings.includes(ring.id) && conditionsMatch(ring.requires, engine.state, progress),
    )
    if (!next) return
    const id = window.setTimeout(() => {
      setRingLabel(next.label)
      machineDispatch({ type: 'RING', eventId: next.id })
      audioRef.current.startRing()
    }, next.delayMs)
    return () => window.clearTimeout(id)
  }, [engine, machine.phase, progress, runtime, started, story.globals.phone.idleRingSchedule])

  useEffect(() => {
    if (machine.phase !== 'ringing' || !machine.incomingEventId) return
    const incomingId = machine.incomingEventId
    const id = window.setTimeout(() => {
      engine.markRingMissed(incomingId)
      setRuntime(structuredClone(engine.state))
      audioRef.current.stopLoop('ring')
      setTranscript((items) => [...items, {
        id: nowId('missed'), speaker: 'system', speakerLabel: '未接来电',
        text: `${ringLabel}在第七声铃后断开。`, createdAt: Date.now(),
      }])
      machineDispatch({ type: 'HANG_UP' })
      window.setTimeout(() => machineDispatch({ type: 'RESET_IDLE' }), 420)
    }, 13500)
    return () => window.clearTimeout(id)
  }, [engine, machine.incomingEventId, machine.phase, ringLabel])

  useEffect(() => {
    let kind: 'dial' | 'choice' | 'call' | null = null
    if (machine.phase === 'offHook' || machine.phase === 'dialing') kind = 'dial'
    else if (machine.phase === 'awaitingChoice') kind = 'choice'
    else if (machine.phase === 'inCall' && !choices.some((choice) => !choice.hidden) && !node.telephone?.ending) kind = 'call'
    else if (machine.phase === 'timeoutWarning') kind = machine.warningKind

    if (!kind) {
      idleDeadlineRef.current = null
      return
    }

    const totalMs = kind === 'dial'
      ? story.globals.timeout.dialIdleMs
      : kind === 'choice'
        ? story.globals.timeout.choiceIdleMs
        : node.telephone?.autoAdvanceMs ?? (['wrong_number', 'busy_line'].includes(node.id) ? 7000 : 14500)
    const activityKey = `${kind}:${kind === 'dial' ? machine.dialedNumber : `${node.id}:${runtime.turn}`}`
    if (idleDeadlineRef.current?.key !== activityKey) {
      idleDeadlineRef.current = { key: activityKey, at: Date.now() + totalMs }
    }
    const deadline = idleDeadlineRef.current.at
    const remaining = Math.max(0, deadline - Date.now())
    const warningDelay = Math.max(0, remaining - Math.min(story.globals.timeout.warningMs, Math.floor(totalMs * 0.45)))
    const reason = kind === 'dial' ? '线路等待拨号，听筒即将断开。' : kind === 'choice' ? '线路正在等待您的回答。' : '线路即将自动断开。'
    const warning = machine.phase === 'timeoutWarning' ? null : window.setTimeout(() => {
      const current = idleDeadlineRef.current
      if (current?.key === activityKey && current.at === deadline) {
        machineDispatch({ type: 'WARNING', reason, kind })
      }
    }, warningDelay)
    const timeout = window.setTimeout(() => {
      const current = idleDeadlineRef.current
      if (current?.key !== activityKey || current.at !== deadline) return
      idleDeadlineRef.current = null
      if (kind === 'dial') hangUp()
      else handleTimeout(kind)
    }, remaining)
    return () => {
      if (warning !== null) window.clearTimeout(warning)
      window.clearTimeout(timeout)
    }
  }, [choices, handleTimeout, hangUp, machine.dialedNumber, machine.phase, machine.warningKind, node, runtime.turn, story.globals.timeout.choiceIdleMs, story.globals.timeout.dialIdleMs, story.globals.timeout.warningMs])

  useEffect(() => {
    if (!machine.callStartedAt || !['inCall', 'awaitingChoice', 'timeoutWarning'].includes(machine.phase) || node.telephone?.ending) return
    const remaining = Math.max(0, story.globals.timeout.callMaxMs - (Date.now() - machine.callStartedAt))
    const timeout = window.setTimeout(() => handleTimeout('call'), remaining)
    return () => window.clearTimeout(timeout)
  }, [handleTimeout, machine.callStartedAt, machine.phase, node.telephone?.ending, story.globals.timeout.callMaxMs])

  useEffect(() => {
    if (!runtime.ending || recordSavedRef.current) return
    const ending = story.extensions.telephone.endings[runtime.ending]
    const record: CallRecordData = {
      sessionId,
      startedAt,
      completedAt: Date.now(),
      ending: runtime.ending,
      endingTitle: ending.title,
      transcript,
      dialLog,
      discoveredNumbers: runtime.discoveredNumbers,
      clues: runtime.clues,
      flags: runtime.flags,
    }
    saveRecord(record)
    recordSavedRef.current = true
  }, [dialLog, runtime, sessionId, startedAt, story.extensions.telephone.endings, transcript])

  function startExperience() {
    setStarted(true)
    setStartedAt(Date.now())
    machineDispatch({ type: 'START' })
    setTranscript([{ id: nowId('system'), speaker: 'system', speakerLabel: '电话亭', text: engine.opening().text, createdAt: Date.now() }])
    void audioRef.current.unlock().then(() => {
      audioRef.current.setMuted(muted)
      audioRef.current.startRain()
    }).catch(() => undefined)
  }

  function liftHandset() {
    if (!started) return
    void audioRef.current.unlock().catch(() => undefined)
    audioRef.current.playLift()
    if (machine.phase === 'ringing' && machine.incomingEventId) {
      const id = machine.incomingEventId
      audioRef.current.stopLoop('ring')
      audioRef.current.startLineNoise()
      engine.markRingHandled(id)
      const transition = engine.dispatch({ type: 'incomingAnswer', value: id, createdAt: Date.now() })
      machineDispatch({ type: 'LIFT', now: Date.now(), nodeId: transition.node.id })
      applyTransition(transition)
      return
    }
    machineDispatch({ type: 'LIFT', now: Date.now() })
    audioRef.current.startDialTone()
  }

  function connectNumber(number: string) {
    machineDispatch({ type: 'CONNECT' })
    audioRef.current.stopLoop('dialTone')
    audioRef.current.playConnectNoise()
    const known = story.globals.phone.validNumbers.find((item) => item.number === number)
    connectTimerRef.current = window.setTimeout(() => {
      const transition = engine.dispatch({ type: 'dialNumber', value: number, createdAt: Date.now() })
      setDialLog((items) => [...items, { number, label: known?.label ?? '未登记号码', connected: !transition.fallback, createdAt: Date.now() }])
      audioRef.current.startLineNoise()
      applyTransition(transition, number)
    }, 880)
  }

  function handleDigit(digit: string) {
    if (!['offHook', 'dialing'].includes(machine.phase) && !(machine.phase === 'timeoutWarning' && machine.warningKind === 'dial')) return
    const next = `${machine.dialedNumber}${digit}`
    machineDispatch({ type: 'DIGIT', digit })
    audioRef.current.playDigit()
    if (shouldConnect(next, story.globals.phone.emergencyNumbers)) connectNumber(next)
  }

  function choose(choice: ChoiceView) {
    if (!['awaitingChoice', 'timeoutWarning'].includes(machine.phase)) return
    setTranscript((items) => [...items, {
      id: nowId('player'), speaker: 'player', speakerLabel: '您的回应', text: choice.text, nodeId: node.id, createdAt: Date.now(),
    }])
    const transition = engine.dispatch({ type: 'choice', value: choice.value, createdAt: Date.now() })
    applyTransition(transition)
  }

  function inspect(hotspot: SceneHotspot) {
    if (machine.phase !== 'idle') return
    audioRef.current.playReveal()
    const transition = engine.dispatch({ type: 'sceneInspect', value: hotspot.id, createdAt: Date.now() })
    setClueCard({ title: hotspot.label, body: transition.text })
    setInspected((items) => items.includes(hotspot.id) ? items : [...items, hotspot.id])
    engine.returnToIdleNode()
    setRuntime(structuredClone(engine.state))
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    audioRef.current.setMuted(next)
  }

  function restart() {
    audioRef.current.stopAll()
    const nextEngine = new CallEngine(story, loadProgress(), Date.now() % 1_000_000)
    setEngine(nextEngine)
    setRuntime(structuredClone(nextEngine.state))
    setNode(nextEngine.currentNode())
    setCallText(nextEngine.opening().text)
    setChoices([])
    setTranscript([])
    setDialLog([])
    setInspected([])
    setClueCard(null)
    setElapsed(0)
    const nextProgress = loadProgress()
    setProgress(nextProgress)
    setSessionId(createSessionId())
    setStartedAt(Date.now())
    recordSavedRef.current = false
    machineDispatch({ type: 'RESTART' })
    void audioRef.current.unlock().then(() => audioRef.current.startRain()).catch(() => undefined)
  }

  const hotspots = visibleHotspots(story, runtime, progress)
  const handsetDocked = ['intro', 'idle', 'ringing', 'hungUp'].includes(machine.phase)
  const callVisible = ['inCall', 'awaitingChoice', 'timeoutWarning', 'ending'].includes(machine.phase)
  const ending = runtime.ending ? story.extensions.telephone.endings[runtime.ending] : null
  const discoveredDefinitions = story.globals.phone.validNumbers.filter((number) => runtime.discoveredNumbers.includes(number.number))

  return (
    <main className={`telephone-scene phase-${machine.phase}`}>
      <div className="rain-layer rain-far" aria-hidden="true" />
      <div className="rain-layer rain-near" aria-hidden="true" />
      <div className="booth-frame" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="street-reflection" aria-hidden="true" />

      <header className="game-masthead">
        <a className="game-wordmark" href="#/" aria-label="Telephone 主页">
          <span>GPO NIGHT SERVICE</span><strong>TELEPHONE</strong>
        </a>
        <nav aria-label="游戏工具">
          <button type="button" onClick={() => setNumberBookOpen((open) => !open)}><NotebookTabs size={16} /><span>号码簿</span></button>
          <button type="button" onClick={toggleMute}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}<span>{muted ? '开启声音' : '静音'}</span></button>
          <a href="#/record"><Headphones size={16} /><span>通话档案</span></a>
          <a href="#/admin"><Settings2 size={16} /><span>剧情后台</span></a>
        </nav>
      </header>

      <SceneHotspots hotspots={hotspots} inspected={inspected} disabled={machine.phase !== 'idle'} onInspect={inspect} />

      <div className="booth-copy booth-copy-left" aria-hidden="true">
        <span>PUBLIC CALL OFFICE</span><strong>LOCAL CALLS<br />THREE PENCE</strong><small>NO REFUNDS AFTER MIDNIGHT</small>
      </div>
      <div className="booth-copy booth-copy-right" aria-hidden="true"><span>MERIDIAN</span><strong>EVERY VOICE<br />HAS VALUE</strong></div>

      <CallTextOverlay
        node={node}
        text={callText}
        visible={callVisible}
        warning={machine.phase === 'timeoutWarning' ? machine.warningReason : null}
      />

      <div className="game-stage">
        <PhoneBooth
          phase={machine.phase}
          dialWarning={machine.phase === 'timeoutWarning' && machine.warningKind === 'dial'}
          dialedNumber={machine.dialedNumber}
          elapsed={elapsed}
          node={node}
          handsetDocked={handsetDocked}
          onLift={liftHandset}
          onHangup={hangUp}
          onDigit={handleDigit}
          onDialTick={() => audioRef.current.playRotaryTick()}
          onDialReturn={(digit) => audioRef.current.playRotaryReturn(digit)}
          onDialError={() => audioRef.current.playError()}
        />
        <ChoiceClouds choices={choices} onChoose={choose} disabled={!['awaitingChoice', 'timeoutWarning'].includes(machine.phase)} />
      </div>

      <footer className="game-status">
        <span className={`status-light status-${machine.phase}`} />
        <strong>{machine.phase === 'ringing' ? ringLabel : node.label}</strong>
        <span>{machine.phase === 'idle' ? '查看亭内线索，或提起听筒拨号' : machine.phase === 'dialing' ? `已拨 ${formatPhoneNumber(machine.dialedNumber)}` : machine.phase === 'awaitingChoice' ? '线路等待回应' : '伦敦 · 雨夜 · 线路开放'}</span>
      </footer>

      {numberBookOpen && (
        <aside className="number-book" aria-label="已发现号码簿">
          <header><div><span>GPO / PRIVATE NOTES</span><h2>已发现号码</h2></div><button type="button" onClick={() => setNumberBookOpen(false)} aria-label="关闭号码簿"><X size={17} /></button></header>
          <div className="number-book-list">
            {discoveredDefinitions.map((number) => (
              <article key={number.number}><span>{number.category}</span><strong>{formatPhoneNumber(number.number)}</strong><h3>{number.label}</h3><p>{number.description}</p></article>
            ))}
          </div>
          <footer>{discoveredDefinitions.length} / {story.globals.phone.validNumbers.length} 条线路已记录</footer>
        </aside>
      )}

      {clueCard && (
        <aside className="clue-card" role="dialog" aria-modal="false" aria-label={`发现：${clueCard.title}`}>
          <button type="button" onClick={() => setClueCard(null)} aria-label="收起发现"><X size={16} /></button>
          <span>BOOTH EVIDENCE</span><h2>{clueCard.title}</h2><p>{clueCard.body}</p>
        </aside>
      )}

      {!started && (
        <section className="intro-curtain" role="dialog" aria-modal="true" aria-label="开始 Telephone">
          <div className="intro-card">
            <div className="intro-kicker"><span />LONDON · AFTER MIDNIGHT<span /></div>
            <h1>TELEPHONE</h1>
            <p className="intro-subtitle">子午礼仪交换所</p>
            <blockquote>“如果电话先响了，别让它听出你在害怕。”</blockquote>
            <p>伦敦的雨夜。一个不在地图上的公共电话亭。<br />接听、拨号、留意墙上的数字——但别重复它要你说的话。</p>
            <button type="button" className="enter-booth" onClick={startExperience}><span>进入电话亭</span><small>建议开启声音 · 支持鼠标、触摸与数字键</small></button>
            <div className="intro-progress">第 {loadProgress().attempts + 1} 次夜班</div>
          </div>
        </section>
      )}

      {ending && (
        <section className={`ending-curtain ending-${runtime.ending}`} role="dialog" aria-modal="true" aria-label={`结局：${ending.title}`}>
          <div className="ending-card">
            <span className="ending-code">{sessionId} / CALL TERMINATED</span>
            <p>{ending.subtitle}</p>
            <h1>{ending.title}</h1>
            <div className="ending-rule" />
            <blockquote>{ending.description}</blockquote>
            <dl><div><dt>发现线路</dt><dd>{runtime.discoveredNumbers.length}</dd></div><div><dt>通话记录</dt><dd>{transcript.length}</dd></div><div><dt>通话时长</dt><dd>{elapsed}s</dd></div></dl>
            <div className="ending-actions"><a href="#/record"><Headphones size={17} />查看通话档案</a><button type="button" onClick={restart}><RotateCcw size={17} />再次进入</button></div>
          </div>
        </section>
      )}
    </main>
  )
}
