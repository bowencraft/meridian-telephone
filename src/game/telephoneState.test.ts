import { describe, expect, it } from 'vitest'
import { initialTelephoneState, telephoneReducer } from './telephoneState'
import type { TelephoneMachineState } from './types'

describe('telephone state machine', () => {
  it('moves from intro through lift, dial and connection', () => {
    let state = telephoneReducer(initialTelephoneState, { type: 'START' })
    expect(state.phase).toBe('idle')
    state = telephoneReducer(state, { type: 'LIFT', now: 100 })
    expect(state.phase).toBe('offHook')
    state = telephoneReducer(state, { type: 'DIGIT', digit: '8' })
    expect(state).toMatchObject({ phase: 'dialing', dialedNumber: '8' })
    state = telephoneReducer(state, { type: 'CONNECT' })
    expect(state.phase).toBe('connecting')
    state = telephoneReducer(state, { type: 'CONNECTED', nodeId: 'meridian_welcome', now: 200, hasChoices: true })
    expect(state).toMatchObject({ phase: 'awaitingChoice', activeNodeId: 'meridian_welcome' })
  })

  it('answers an incoming call with no dial buffer', () => {
    let state = telephoneReducer(initialTelephoneState, { type: 'START' })
    state = telephoneReducer(state, { type: 'RING', eventId: 'rain_query' })
    expect(state.phase).toBe('ringing')
    state = telephoneReducer(state, { type: 'LIFT', now: 300, nodeId: 'incoming_weather' })
    expect(state).toMatchObject({ phase: 'inCall', incomingEventId: 'rain_query', activeNodeId: 'incoming_weather' })
  })

  it('clears transient call state on hangup', () => {
    let state: TelephoneMachineState = { ...initialTelephoneState, phase: 'inCall', dialedNumber: '8714000', activeNodeId: 'menu_main', callStartedAt: 12 }
    state = telephoneReducer(state, { type: 'HANG_UP' })
    expect(state).toMatchObject({ phase: 'hungUp', dialedNumber: '', activeNodeId: null, callStartedAt: null })
    state = telephoneReducer(state, { type: 'RESET_IDLE' })
    expect(state.phase).toBe('idle')
  })

  it('keeps the dial usable during its timeout warning and resets the deadline state', () => {
    let state = telephoneReducer(initialTelephoneState, { type: 'START' })
    state = telephoneReducer(state, { type: 'LIFT', now: 100 })
    state = telephoneReducer(state, { type: 'WARNING', reason: '即将断开', kind: 'dial' })
    expect(state).toMatchObject({ phase: 'timeoutWarning', warningKind: 'dial' })

    state = telephoneReducer(state, { type: 'DIGIT', digit: '9' })
    expect(state).toMatchObject({
      phase: 'dialing',
      dialedNumber: '9',
      warningReason: null,
      warningKind: null,
    })
  })

  it('preserves the warning kind while waiting for a choice', () => {
    const warned = telephoneReducer(
      { ...initialTelephoneState, phase: 'awaitingChoice', activeNodeId: 'weather_intro', callStartedAt: 100 },
      { type: 'WARNING', reason: '线路正在等待您的回答。', kind: 'choice' },
    )
    expect(warned).toMatchObject({ phase: 'timeoutWarning', warningKind: 'choice' })

    const advanced = telephoneReducer(warned, { type: 'CONNECTED', nodeId: 'weather_repeat', now: 200, hasChoices: false })
    expect(advanced).toMatchObject({ phase: 'inCall', warningReason: null, warningKind: null })
  })
})
