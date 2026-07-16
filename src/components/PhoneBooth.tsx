import { useState } from 'react'
import type { TelephoneNode, TelephonePhase } from '../game/types'
import { Handset, type HandsetPose } from './Handset'
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
  coinCredit: number
  heldCoin: boolean
  onLift: () => void
  onHangup: () => void
  onInsertCoin: () => void
  onReturnCoin: () => void
  onLineTest: () => void
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
  coinCredit,
  heldCoin,
  onLift,
  onHangup,
  onInsertCoin,
  onReturnCoin,
  onLineTest,
  onDigit,
  onDialTick,
  onDialReturn,
  onDialError,
}: PhoneBoothProps) {
  const [handsetPose, setHandsetPose] = useState<HandsetPose>({ x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: -1, nearCradle: false, carrying: false })
  const dialEnabled = !handsetDocked && (['offHook', 'dialing'].includes(phase) || dialWarning)
  const handsetLocked = phase === 'ending' || (!handsetDocked && node?.telephone?.canHangUp === false)
  const visiblePose = handsetDocked
    ? { x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: -1, nearCradle: false, carrying: false }
    : handsetPose

  return (
    <section className={`phone-assembly phase-${phase}`} aria-label="GPO 公共电话机">
      <div className="booth-backlight" />
      <div className="phone-shadow" />
      <div className="phone-wall-shadow" />
      <div className="phone-case">
        <div className="phone-body-depth" />
        <div className="phone-case-top">
          <span className="receiver-rest" />
          <span className="hook hook-left" />
          <span className="hook hook-right" />
          <div className="maker-plate"><small>GENERAL POST OFFICE</small><strong>PUBLIC TELEPHONE</strong></div>
        </div>
        <div className="phone-face">
          <div className="phone-case-shine" aria-hidden="true" />
          <LcdDisplay
            phase={phase}
            dialedNumber={dialedNumber}
            elapsed={elapsed}
            node={node}
            fallbackMessage={coinCredit ? 'DIAL NUMBER' : 'INSERT COIN'}
            coinReady={coinCredit > 0}
          />
          <button
            type="button"
            className={`coin-slot ${heldCoin ? 'is-accepting' : ''} ${coinCredit ? 'has-credit' : ''}`}
            aria-label={coinCredit ? '投币槽内已有硬币' : heldCoin ? '将手中的三便士硬币投入电话机' : '检查投币槽'}
            onClick={onInsertCoin}
          ><span>INSERT 3d</span><i /><small>{coinCredit ? 'CREDIT' : 'COIN'}</small></button>
          <div className={`coin-check-window ${coinCredit ? 'is-lit' : ''}`} aria-hidden="true"><i /></div>
          <button type="button" className="line-test-button" onClick={onLineTest} aria-label="按下线路测试键"><i /><span>LINE<br />TEST</span></button>
          <RotaryDial
            disabled={!dialEnabled}
            onDigit={onDigit}
            onTick={onDialTick}
            onReturn={onDialReturn}
            onError={onDialError}
          />
          <div className="instruction-card">
            <strong>TO CALL</strong>
            <span>INSERT 3d · LIFT RECEIVER · DIAL</span>
            <small>INCOMING CALLS REQUIRE NO COIN</small>
          </div>
          <div className="service-stamp" aria-hidden="true"><span>GPO</span><small>INSPECTED<br />19·6·68</small></div>
          <button type="button" className="coin-return-physical" onClick={onReturnCoin} aria-label="按下退币键"><span>COIN RETURN</span><i /><small>PRESS</small></button>
          <div className="case-screws"><i /><i /><i /><i /></div>
        </div>
      </div>
      <PhoneCord lifted={!handsetDocked} pose={visiblePose} />
      <Handset
        docked={handsetDocked}
        ringing={phase === 'ringing'}
        disabled={handsetLocked}
        onLift={onLift}
        onHangup={onHangup}
        onPoseChange={setHandsetPose}
      />
    </section>
  )
}
