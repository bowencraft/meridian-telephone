import type { CSSProperties } from 'react'
import type { ResolvedSceneItem } from '../game/types'

type PropStyle = CSSProperties & Record<`--prop-${string}`, string | number>

interface ScenePropProps {
  item: ResolvedSceneItem
  inspected?: boolean
  disabled?: boolean
  selected?: boolean
  preview?: boolean
  onClick?: () => void
}

function propStyle(item: ResolvedSceneItem): PropStyle {
  const { bounds, mobileBounds = bounds, appearance } = item
  return {
    left: `${bounds.x}%`,
    top: `${bounds.y}%`,
    width: `${bounds.width}%`,
    height: `${bounds.height}%`,
    '--prop-mobile-left': `${mobileBounds.x}%`,
    '--prop-mobile-top': `${mobileBounds.y}%`,
    '--prop-mobile-width': `${mobileBounds.width}%`,
    '--prop-mobile-height': `${mobileBounds.height}%`,
    '--prop-rotation': `${appearance.rotation ?? 0}deg`,
    '--prop-scale': appearance.scale ?? 1,
    '--prop-paper': appearance.paperTone ?? '#b5a986',
    '--prop-ink': appearance.inkColor ?? '#37362f',
    '--prop-accent': appearance.accentColor ?? '#716348',
    '--prop-aging': appearance.aging ?? .5,
    '--prop-moisture': appearance.moisture ?? .2,
    '--prop-crease': appearance.crease ?? .2,
    '--prop-tear': appearance.tear ?? .1,
    '--prop-opacity': appearance.opacity ?? 1,
  }
}

export function SceneProp({ item, inspected = false, disabled = false, selected = false, preview = false, onClick }: ScenePropProps) {
  const typography = item.appearance.typography ?? 'typewriter'
  return (
    <button
      type="button"
      className={`scene-hotspot scene-prop kind-${item.prop.kind} type-${typography} ${inspected ? 'is-inspected' : ''} ${selected ? 'is-selected' : ''} ${preview ? 'is-preview' : ''}`}
      style={propStyle(item)}
      aria-label={item.prop.ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="scene-prop-surface" aria-hidden="true">
        <i className="scene-prop-stain" />
        <i className="scene-prop-crease" />
        <span className="scene-prop-print">{(item.prop.printedLines ?? [item.prop.label]).map((line) => <span key={line}>{line}</span>)}</span>
      </span>
      <span className="scene-hotspot-label">{item.prop.label}</span>
    </button>
  )
}
