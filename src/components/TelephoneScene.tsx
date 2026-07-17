import { Headphones, NotebookTabs, RotateCcw, Settings2, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { CallEngine, conditionsMatch, loadStoryDefinition } from '../game/callEngine'
import { elapsedSeconds } from '../game/callTimer'
import { formatPhoneNumber, shouldConnect } from '../game/dialModel'
import { TelephoneAudio } from '../game/audio'
import { BOOTH_OBJECTS, canDialWithCredit, createNightCoins, returnedCoin, type ShelfCoin } from '../game/boothItems'
import { createSessionId, loadProgress, saveRecord } from '../game/record'
import { hotspotById, visibleHotspots } from '../game/sceneInteractions'
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
import { BoothShelf } from './BoothShelf'
import { ChoiceClouds } from './ChoiceClouds'
import { PhoneBooth } from './PhoneBooth'
import { SceneHotspots } from './SceneHotspots'

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function TelephoneScene() {
  const sceneRef = useRef<HTMLElement>(null)
  const lightFrameRef = useRef<number | null>(null)
  const pendingLightRef = useRef<{ clientX: number; clientY: number } | null>(null)
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
  const [coins, setCoins] = useState(() => createNightCoins(engine.state.sessionSeed))
  const [heldItemId, setHeldItemId] = useState<string | null>(null)
  const [coinCredit, setCoinCredit] = useState(0)
  const [spentCoins, setSpentCoins] = useState(0)
  const [mechanicalPulse, setMechanicalPulse] = useState<'coin-in' | 'coin-out' | 'line-test' | null>(null)
  const recordSavedRef = useRef(false)
  const connectTimerRef = useRef<number | null>(null)
  const idleDeadlineRef = useRef<{ key: string; at: number } | null>(null)
  const mechanicalTimerRef = useRef<number | null>(null)

  const triggerMechanicalPulse = useCallback((pulse: 'coin-in' | 'coin-out' | 'line-test') => {
    if (mechanicalTimerRef.current) window.clearTimeout(mechanicalTimerRef.current)
    setMechanicalPulse(null)
    window.requestAnimationFrame(() => setMechanicalPulse(pulse))
    mechanicalTimerRef.current = window.setTimeout(() => {
      setMechanicalPulse(null)
      mechanicalTimerRef.current = null
    }, pulse === 'line-test' ? 520 : 760)
  }, [])

  useEffect(() => () => {
    if (mechanicalTimerRef.current) window.clearTimeout(mechanicalTimerRef.current)
    if (lightFrameRef.current !== null) window.cancelAnimationFrame(lightFrameRef.current)
  }, [])

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
    if (coinCredit) audioRef.current.startDialTone()
  }

  function connectNumber(number: string) {
    if (!canDialWithCredit(machine.phase, coinCredit)) {
      audioRef.current.playError()
      setClueCard({ title: '需要三便士', body: '线路没有获得脉冲。先从台面拿起一枚硬币，再按下投币槽。' })
      return
    }
    setCoinCredit(0)
    setSpentCoins((value) => value + 1)
    engine.setFlag('coinsSpent', Number(engine.state.flags.coinsSpent ?? 0) + 1)
    setRuntime(structuredClone(engine.state))
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
    if (!canDialWithCredit(machine.phase, coinCredit)) {
      audioRef.current.playError()
      setClueCard({ title: 'NO CREDIT', body: '转盘仍会回弹，但交换机拒绝记录数字。台面上的三便士硬币可以投入右上方槽口。' })
      return
    }
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

  function toggleCoin(coin: ShelfCoin) {
    if (machine.phase === 'ending') return
    audioRef.current.playObjectMove()
    setHeldItemId((current) => current === coin.id ? null : coin.id)
    setClueCard({
      title: heldItemId === coin.id ? '放下硬币' : '三便士硬币',
      body: heldItemId === coin.id ? '硬币重新落在木台上，滚了半圈才停下。' : '边缘被磨得发亮，尺寸正好能通过电话机右上方的投币槽。',
    })
  }

  function toggleBoothObject(itemId: string) {
    if (machine.phase === 'ending') return
    const item = BOOTH_OBJECTS.find((candidate) => candidate.id === itemId)
    if (!item) return
    const puttingDown = heldItemId === itemId
    audioRef.current.playObjectMove()
    setHeldItemId(puttingDown ? null : itemId)
    setClueCard({
      title: puttingDown ? `放下${item.label}` : item.label,
      body: puttingDown ? `${item.label}被留在台面原来的灰尘轮廓里。` : item.description,
    })
  }

  function insertCoin() {
    if (!['idle', 'offHook', 'dialing', 'timeoutWarning'].includes(machine.phase)) {
      audioRef.current.playError()
      return
    }
    if (coinCredit) {
      audioRef.current.playError()
      setClueCard({ title: '投币槽已占用', body: '信用窗已经亮起。先完成拨号，或按下退币键取回硬币。' })
      return
    }
    const coin = coins.find((candidate) => candidate.id === heldItemId)
    if (!coin) {
      audioRef.current.playError()
      setClueCard({ title: '投币槽', body: '槽口只接受三便士硬币。先点击台面上的硬币将它拿起。' })
      return
    }
    setCoins((items) => items.filter((item) => item.id !== coin.id))
    setHeldItemId(null)
    setCoinCredit(1)
    triggerMechanicalPulse('coin-in')
    engine.setFlag('coinsInserted', Number(engine.state.flags.coinsInserted ?? 0) + 1)
    setRuntime(structuredClone(engine.state))
    audioRef.current.playCoinInsert()
    if (['offHook', 'dialing', 'timeoutWarning'].includes(machine.phase)) audioRef.current.startDialTone()
    setClueCard({ title: 'CREDIT 3d', body: '硬币经过检验闸，绿色信用窗亮起。现在可以拨出一通电话。' })
  }

  function returnCoinFromPhone() {
    if (coinCredit) {
      const coin = returnedCoin(`returned-${Date.now()}`, coins.length + spentCoins)
      setCoins((items) => [...items, coin])
      setCoinCredit(0)
      triggerMechanicalPulse('coin-out')
      audioRef.current.stopLoop('dialTone')
      audioRef.current.playCoinReturn()
      setClueCard({ title: '退回三便士', body: '机械闸门松开，硬币从下方槽口滚回台面。' })
      return
    }
    const hotspot = hotspotById(story, 'coin-return')
    if (hotspot && machine.phase === 'idle') inspect(hotspot)
    else {
      audioRef.current.playCoinReturn()
      setClueCard({ title: '退币槽', body: '金属托盘空空作响。里面没有可以退回的信用。' })
    }
  }

  function testLine() {
    triggerMechanicalPulse('line-test')
    void audioRef.current.unlock().catch(() => undefined)
    audioRef.current.playDigit()
    window.setTimeout(() => audioRef.current.playDigit(), 115)
    setClueCard({
      title: 'LINE TEST',
      body: machine.phase === 'ringing'
        ? '测试键被铃流锁住。先拿起听筒接听；来电不会消耗硬币。'
        : coinCredit
          ? '检验脉冲返回两声短响：CREDIT 3d，线路可以外拨。'
          : '检验脉冲只有一声空响：NO CREDIT。台面上的硬币可以解除拨号锁。',
    })
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
    setCoins(createNightCoins(nextEngine.state.sessionSeed))
    setHeldItemId(null)
    setCoinCredit(0)
    setSpentCoins(0)
    setMechanicalPulse(null)
    setStartedAt(Date.now())
    recordSavedRef.current = false
    machineDispatch({ type: 'RESTART' })
    void audioRef.current.unlock().then(() => audioRef.current.startRain()).catch(() => undefined)
  }

  const hotspots = visibleHotspots(story, runtime, progress).filter((hotspot) => hotspot.id !== 'coin-return')
  const handsetDocked = ['intro', 'idle', 'ringing', 'hungUp'].includes(machine.phase)
  const callVisible = ['inCall', 'awaitingChoice', 'timeoutWarning', 'ending'].includes(machine.phase)
  const ending = runtime.ending ? story.extensions.telephone.endings[runtime.ending] : null
  const discoveredDefinitions = story.globals.phone.validNumbers.filter((number) => runtime.discoveredNumbers.includes(number.number))

  function moveAmbientLight(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse') return
    pendingLightRef.current = { clientX: event.clientX, clientY: event.clientY }
    if (lightFrameRef.current !== null) return
    lightFrameRef.current = window.requestAnimationFrame(() => {
      lightFrameRef.current = null
      const scene = sceneRef.current
      const pointer = pendingLightRef.current
      if (!scene || !pointer) return
      const rect = scene.getBoundingClientRect()
      const x = (pointer.clientX - rect.left) / rect.width * 100
      const y = (pointer.clientY - rect.top) / rect.height * 100
      scene.style.setProperty('--light-x', `${x.toFixed(2)}%`)
      scene.style.setProperty('--light-y', `${y.toFixed(2)}%`)
    })
  }

  return (
    <main ref={sceneRef} className={`telephone-scene phase-${machine.phase} ${heldItemId ? 'has-held-item' : ''}`} onPointerMove={moveAmbientLight}>
      <div className="rain-layer rain-far" aria-hidden="true" />
      <div className="rain-layer rain-near" aria-hidden="true" />
      <div className="booth-glass" aria-hidden="true"><i /><i /><i /></div>
      <div className="window-condensation" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="ceiling-lamp" aria-hidden="true"><span /><i /></div>
      <div className="street-bokeh" aria-hidden="true"><i /><i /><i /><i /><i /></div>
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
        <BoothShelf
          coins={coins}
          heldItemId={heldItemId}
          coinCredit={coinCredit}
          disabled={machine.phase === 'ending'}
          onToggleCoin={toggleCoin}
          onToggleObject={toggleBoothObject}
        />
        <PhoneBooth
          phase={machine.phase}
          dialWarning={machine.phase === 'timeoutWarning' && machine.warningKind === 'dial'}
          dialedNumber={machine.dialedNumber}
          elapsed={elapsed}
          node={node}
          handsetDocked={handsetDocked}
          coinCredit={coinCredit}
          heldCoin={coins.some((coin) => coin.id === heldItemId)}
          mechanicalPulse={mechanicalPulse}
          onLift={liftHandset}
          onHangup={hangUp}
          onInsertCoin={insertCoin}
          onReturnCoin={returnCoinFromPhone}
          onLineTest={testLine}
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
        <span>{machine.phase === 'idle' ? `台面 ${coins.length} 枚硬币 · ${coinCredit ? '信用已就绪' : '拿起硬币后点击投币槽'}` : machine.phase === 'offHook' ? coinCredit ? '信用 3d · 可以拨号' : '请投入三便士硬币 · 来电无需投币' : machine.phase === 'dialing' ? `已拨 ${formatPhoneNumber(machine.dialedNumber)}` : machine.phase === 'awaitingChoice' ? '线路等待回应' : '伦敦 · 雨夜 · 线路开放'}</span>
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
            <p>伦敦的雨夜。一个不在地图上的公共电话亭。<br />台面每晚会留下 1–3 枚硬币：拿起硬币、投入三便士、再提起听筒拨号。来电可以直接接听。</p>
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
