import type { TelephoneMachineState } from './types'

export type TelephoneAction =
  | { type: 'START' }
  | { type: 'RING'; eventId: string }
  | { type: 'LIFT'; now: number; nodeId?: string }
  | { type: 'BEGIN_DIAL' }
  | { type: 'DIGIT'; digit: string }
  | { type: 'CONNECT' }
  | { type: 'CONNECTED'; nodeId: string; now: number; hasChoices: boolean }
  | { type: 'SHOW_CHOICES' }
  | { type: 'WARNING'; reason: string }
  | { type: 'HANG_UP' }
  | { type: 'RESET_IDLE' }
  | { type: 'END'; nodeId: string }
  | { type: 'CLEAR_NUMBER' }
  | { type: 'RESTART' }

export const initialTelephoneState: TelephoneMachineState = {
  phase: 'intro',
  dialedNumber: '',
  incomingEventId: null,
  activeNodeId: null,
  callStartedAt: null,
  warningReason: null,
}

export function telephoneReducer(state: TelephoneMachineState, action: TelephoneAction): TelephoneMachineState {
  switch (action.type) {
    case 'START':
      return { ...state, phase: 'idle', warningReason: null }
    case 'RING':
      if (state.phase !== 'idle') return state
      return { ...state, phase: 'ringing', incomingEventId: action.eventId }
    case 'LIFT':
      if (!['idle', 'ringing', 'hungUp'].includes(state.phase)) return state
      return {
        ...state,
        phase: action.nodeId ? 'inCall' : 'offHook',
        activeNodeId: action.nodeId ?? null,
        callStartedAt: action.nodeId ? action.now : null,
        warningReason: null,
      }
    case 'BEGIN_DIAL':
      return state.phase === 'offHook' || state.phase === 'dialing' ? { ...state, phase: 'dialing' } : state
    case 'DIGIT':
      return state.phase === 'dialing' || state.phase === 'offHook'
        ? { ...state, phase: 'dialing', dialedNumber: `${state.dialedNumber}${action.digit}` }
        : state
    case 'CONNECT':
      return state.dialedNumber && ['dialing', 'offHook'].includes(state.phase)
        ? { ...state, phase: 'connecting', warningReason: null }
        : state
    case 'CONNECTED':
      return {
        ...state,
        phase: action.hasChoices ? 'awaitingChoice' : 'inCall',
        activeNodeId: action.nodeId,
        callStartedAt: state.callStartedAt ?? action.now,
        warningReason: null,
      }
    case 'SHOW_CHOICES':
      return state.phase === 'inCall' ? { ...state, phase: 'awaitingChoice' } : state
    case 'WARNING':
      return ['offHook', 'dialing', 'inCall', 'awaitingChoice'].includes(state.phase)
        ? { ...state, phase: 'timeoutWarning', warningReason: action.reason }
        : state
    case 'HANG_UP':
      return state.phase === 'intro' || state.phase === 'idle' ? state : {
        ...state,
        phase: 'hungUp',
        dialedNumber: '',
        incomingEventId: null,
        activeNodeId: null,
        callStartedAt: null,
        warningReason: null,
      }
    case 'RESET_IDLE':
      return { ...state, phase: 'idle', dialedNumber: '', incomingEventId: null, activeNodeId: null, callStartedAt: null, warningReason: null }
    case 'END':
      return { ...state, phase: 'ending', activeNodeId: action.nodeId, warningReason: null }
    case 'CLEAR_NUMBER':
      return { ...state, dialedNumber: '' }
    case 'RESTART':
      return { ...initialTelephoneState, phase: 'idle' }
  }
}
