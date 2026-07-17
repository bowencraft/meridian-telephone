import { formatDuration } from '../game/callTimer'
import { formatPhoneNumber } from '../game/dialModel'
import type { TelephoneNode, TelephonePhase } from '../game/types'

interface LcdDisplayProps {
  phase: TelephonePhase
  dialedNumber: string
  elapsed: number
  node: TelephoneNode | null
  fallbackMessage: string
  coinReady?: boolean
}

export function LcdDisplay({ phase, dialedNumber, elapsed, node, fallbackMessage, coinReady = false }: LcdDisplayProps) {
  let primary = fallbackMessage
  let secondary = phase.toUpperCase()

  if (phase === 'dialing' || phase === 'offHook' || phase === 'connecting') {
    primary = dialedNumber ? formatPhoneNumber(dialedNumber) : fallbackMessage
    secondary = phase === 'connecting' ? 'CONNECTING' : coinReady ? 'CREDIT 3d' : 'INSERT 3d'
  }
  if (['inCall', 'awaitingChoice', 'timeoutWarning', 'ending'].includes(phase) && node) {
    primary = node.telephone?.lcd ?? 'LINE OPEN'
    secondary = `CALL ${formatDuration(elapsed)}`
  }
  if (phase === 'ringing') {
    primary = 'INCOMING CALL'
    secondary = 'LIFT RECEIVER'
  }

  return (
    <div className={`lcd-display phase-${phase}`} aria-live="polite" aria-label={`${primary}, ${secondary}`}>
      <div className="lcd-glass">
        <span className="lcd-primary">{primary}</span>
        <span className="lcd-secondary">{secondary}</span>
      </div>
      <i className="lcd-led" />
    </div>
  )
}
