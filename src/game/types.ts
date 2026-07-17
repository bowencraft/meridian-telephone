export type Scalar = boolean | string | number

export type TelephoneNodeKind =
  | 'start'
  | 'idle'
  | 'incoming_call'
  | 'dial_target'
  | 'call'
  | 'menu'
  | 'scene'
  | 'global'
  | 'end'
  | 'fail'

export type EndingType = 'disconnected' | 'recruited' | 'transfer' | 'worn' | 'weather' | 'counterfeit' | 'operator'
export type Speaker = 'caller' | 'operator' | 'recording' | 'stranger' | 'system' | 'player'

export type TriggerType =
  | 'dialNumber'
  | 'choice'
  | 'incomingAnswer'
  | 'hangUp'
  | 'timeout'
  | 'sceneInspect'
  | 'keywordAny'
  | 'auto'

export type GraphCondition =
  | { type: 'stateEquals'; key: string; value: Scalar }
  | { type: 'stateNotEquals'; key: string; value: Scalar }
  | { type: 'stateGte'; key: string; value: number }
  | { type: 'hasNumber'; value: string }
  | { type: 'endingSeen'; value: EndingType }

export type GraphEffect =
  | { type: 'setState'; values: Record<string, Scalar> }
  | { type: 'increment'; key: string; amount: number }
  | { type: 'discoverNumber'; number: string }
  | { type: 'addClue'; clue: string }

export interface GraphPosition { x: number; y: number }

export interface TelephoneNode {
  id: string
  label: string
  kind: TelephoneNodeKind
  position: GraphPosition
  tags?: string[]
  body: {
    variants: string[]
    fallbackVariants?: string[]
    notes?: string
  }
  telephone?: {
    speaker?: Speaker
    speakerLabel?: string
    lcd?: string
    ending?: EndingType
    canHangUp?: boolean
    autoAdvanceMs?: number
    corruption?: number
  }
}

export interface TelephoneEdge {
  id: string
  label: string
  from: string
  to: string
  priority: number
  trigger: { type: TriggerType; value?: string }
  conditions?: GraphCondition[]
  effects?: GraphEffect[]
  choice?: { text: string; tone?: 'plain' | 'warm' | 'defiant' | 'compliant'; hidden?: boolean }
  samples?: string[]
}

export interface PhoneNumberDefinition {
  number: string
  label: string
  description: string
  initiallyKnown?: boolean
  category?: 'public' | 'meridian' | 'internal' | 'emergency' | 'strange'
}

export interface RingEvent {
  id: string
  label: string
  delayMs: number
  nodeId: string
  requires?: GraphCondition[]
}

export interface SceneHotspot {
  id: string
  label: string
  ariaLabel: string
  x: number
  y: number
  width: number
  height: number
  body: string
  repeatBody?: string
  number?: string
  requires?: GraphCondition[]
}

export interface TelephoneStory {
  format: 'graph-content'
  formatVersion: number
  id: string
  title: string
  entryNodeId: string
  nodes: TelephoneNode[]
  edges: TelephoneEdge[]
  globals: {
    timeout: {
      dialIdleMs: number
      choiceIdleMs: number
      callMaxMs: number
      warningMs: number
    }
    phone: {
      validNumbers: PhoneNumberDefinition[]
      emergencyNumbers?: string[]
      wrongNumberNodeId: string
      busyNumberNodeId: string
      idleRingSchedule: RingEvent[]
    }
  }
  extensions: {
    telephone: {
      lcdMessages: Record<string, string>
      endings: Record<EndingType, { title: string; subtitle: string; description: string }>
      sceneHotspots: SceneHotspot[]
      audioProfile: { rainLevel: number; lineNoise: number; ringPitch: number }
    }
  }
}

export interface CallEvent {
  type: TriggerType
  value?: string
  createdAt?: number
}

export interface RuntimeState {
  currentNodeId: string
  flags: Record<string, Scalar>
  discoveredNumbers: string[]
  clues: string[]
  seenNodes: string[]
  handledRings: string[]
  missedRings: string[]
  seenEndings: EndingType[]
  visits: Record<string, number>
  turn: number
  sessionSeed: number
  ending?: EndingType
}

export interface EngineTransition {
  event: CallEvent
  edge: TelephoneEdge | null
  previousNode: TelephoneNode
  node: TelephoneNode
  text: string
  state: RuntimeState
  fallback: boolean
  candidates: string[]
}

export interface ChoiceView {
  edgeId: string
  value: string
  text: string
  tone: 'plain' | 'warm' | 'defiant' | 'compliant'
  hidden: boolean
}

export type TelephonePhase =
  | 'intro'
  | 'idle'
  | 'ringing'
  | 'offHook'
  | 'dialing'
  | 'connecting'
  | 'inCall'
  | 'awaitingChoice'
  | 'timeoutWarning'
  | 'hungUp'
  | 'ending'

export interface TelephoneMachineState {
  phase: TelephonePhase
  dialedNumber: string
  incomingEventId: string | null
  activeNodeId: string | null
  callStartedAt: number | null
  warningReason: string | null
  warningKind: 'dial' | 'choice' | 'call' | null
}

export interface TranscriptEntry {
  id: string
  speaker: Speaker
  speakerLabel: string
  text: string
  nodeId?: string
  number?: string
  createdAt: number
}

export interface DialLogEntry { number: string; label: string; connected: boolean; createdAt: number }

export interface CallRecordData {
  sessionId: string
  startedAt: number
  completedAt: number
  ending: EndingType
  endingTitle: string
  transcript: TranscriptEntry[]
  dialLog: DialLogEntry[]
  discoveredNumbers: string[]
  clues: string[]
  flags: Record<string, Scalar>
}

export interface ProgressData {
  discoveredNumbers: string[]
  seenEndings: EndingType[]
  clues: string[]
  attempts: number
}
