import type { TelephoneNode } from '../game/types'

interface CallTextOverlayProps { node: TelephoneNode | null; text: string; visible: boolean; warning?: string | null }

export function CallTextOverlay({ node, text, visible, warning }: CallTextOverlayProps) {
  if (!visible || !node) return null
  return (
    <aside className={`call-text-overlay corruption-${Math.round((node.telephone?.corruption ?? 0) * 10)}`} aria-live="polite">
      <div className="speaker-tag">
        <span className="line-indicator" />
        {node.telephone?.speakerLabel ?? '未知线路'}
      </div>
      <p>{text}</p>
      {warning && <strong className="call-warning">{warning}</strong>}
    </aside>
  )
}
