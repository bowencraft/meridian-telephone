import type { CSSProperties } from 'react'
import type { ResolvedSceneItem } from '../game/types'

type CounterStyle = CSSProperties & Record<`--counter-${string}`, string | number>

interface CounterScenePropProps {
  item: ResolvedSceneItem
  held?: boolean
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

function counterStyle(item: ResolvedSceneItem): CounterStyle {
  const { appearance, bounds, mobileBounds = bounds } = item
  return {
    left: `${bounds.x}%`,
    right: 'auto',
    top: `${bounds.y}%`,
    width: `${bounds.width}%`,
    height: `${bounds.height}%`,
    '--counter-mobile-left': `${mobileBounds.x}%`,
    '--counter-mobile-top': `${mobileBounds.y}%`,
    '--counter-mobile-width': `${mobileBounds.width}%`,
    '--counter-mobile-height': `${mobileBounds.height}%`,
    '--counter-rotation': `${appearance.rotation ?? 0}deg`,
    '--counter-scale': appearance.scale ?? 1,
    '--counter-paper': appearance.paperTone ?? '#b5a986',
    '--counter-ink': appearance.inkColor ?? '#37362f',
    '--counter-accent': appearance.accentColor ?? '#716348',
  }
}

export function CounterSceneProp({ item, held = false, selected = false, disabled = false, onClick }: CounterScenePropProps) {
  const style = item.prop.counterStyle ?? 'night-ticket'
  return (
    <button
      type="button"
      className={`shelf-object shelf-object-${style} is-scene-counter-prop ${held ? 'is-held' : ''} ${selected ? 'is-selected' : ''}`}
      style={counterStyle(item)}
      aria-label={`${held ? '放下' : '拿起并查看'}${item.prop.label}`}
      aria-pressed={held}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="counter-prop-print" aria-hidden="true">
        {(item.prop.printedLines ?? []).map((line) => <b key={line}>{line}</b>)}
      </div>
      <span className="counter-prop-label">{item.prop.label}</span>
    </button>
  )
}
