import type { TelephoneNode, TelephonePhase } from '../game/types'
import { Handset } from './Handset'
import { LcdDisplay } from './LcdDisplay'
import { PhoneCord } from './PhoneCord'
import { RotaryDial } from './RotaryDial'

interface PhoneBoothProps {
  phase: TelephonePhase
  dialWarning: boolean
  dialedNumber: string
  elapsed: number
  node: TelephoneNode | null
  handsetDocked: boolean
  onLift: () => void
  onHangup: () => void
  onDigit: (digit: string) => void
  onDialTick: () => void
  onDialReturn: (digit: string) => void
  onDialError: () => void
}

export function PhoneBooth({
  phase,
  dialWarning,
  dialedNumber,
  elapsed,
  node,
  handsetDocked,
  onLift,
  onHangup,
  onDigit,
  onDialTick,
  onDialReturn,
  onDialError,
}: PhoneBoothProps) {
  const dialEnabled = !handsetDocked && (['offHook', 'dialing'].includes(phase) || dialWarning)
  const handsetLocked = phase === 'ending' || (!handsetDocked && node?.telephone?.canHangUp === false)

  return (
    <section className={`phone-assembly phase-${phase}`} aria-label="GPO 公共电话机">
      <div className="booth-backlight" />
      <div className="phone-shadow" />
      <div className="phone-case">
        <div className="phone-case-top">
          <span className="hook hook-left" />
          <span className="hook hook-right" />
          <div className="maker-plate"><small>GENERAL POST OFFICE</small><strong>PUBLIC TELEPHONE</strong></div>
        </div>
        <div className="phone-face">
          <LcdDisplay
            phase={phase}
            dialedNumber={dialedNumber}
            elapsed={elapsed}
            node={node}
            fallbackMessage={phase === 'idle' ? 'INSERT COIN' : 'DIAL NUMBER'}
          />
          <div className="coin-slot"><span>COINS</span><i /></div>
          <RotaryDial
            disabled={!dialEnabled}
            onDigit={onDigit}
            onTick={onDialTick}
            onReturn={onDialReturn}
            onError={onDialError}
          />
          <div className="instruction-card">
            <strong>TO CALL</strong>
            <span>LIFT HANDSET · DIAL NUMBER</span>
            <small>WAIT FOR THE DIAL TO RETURN</small>
          </div>
          <div className="coin-return-physical"><span>PRESS</span><i /></div>
          <div className="case-screws"><i /><i /><i /><i /></div>
        </div>
      </div>
      <PhoneCord lifted={!handsetDocked} />
      <Handset
        docked={handsetDocked}
        ringing={phase === 'ringing'}
        disabled={handsetLocked}
        onLift={onLift}
        onHangup={onHangup}
      />
    </section>
  )
}
