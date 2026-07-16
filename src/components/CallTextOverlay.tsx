import type { TelephoneNode } from '../game/types'

interface CallTextOverlayProps { node: TelephoneNode | null; text: string; visible: boolean; warning?: string | null }

export function CallTextOverlay({ node, text, visible, warning }: CallTextOverlayProps) {
  if (!visible || !node) return null
  const channel = String([...node.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 24 + 1).padStart(2, '0')
  return (
    <aside className={`call-text-overlay corruption-${Math.round((node.telephone?.corruption ?? 0) * 10)}`} aria-live="polite">
      <div className="transcript-clip" aria-hidden="true"><i /><i /></div>
      <div className="transcript-feed-edge" aria-hidden="true"><i /><i /></div>
      <header>
        <div className="speaker-tag"><span className="line-indicator" />{node.telephone?.speakerLabel ?? '未知线路'}</div>
        <span className="line-stamp">MONITORED LINE</span>
      </header>
      <div className="transcript-routing" aria-hidden="true"><span>TRUNK {channel}</span><i /><small>LIVE TRANSCRIPTION</small></div>
      <div className="voice-meter" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <p><span aria-hidden="true">“</span>{text}<span aria-hidden="true">”</span></p>
      {warning && <strong className="call-warning">{warning}</strong>}
      <footer><span>GPO EXCHANGE</span><i />VOICE TRANSCRIPTION</footer>
    </aside>
  )
}
