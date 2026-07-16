import type { ChoiceView } from '../game/types'

interface ChoiceCloudsProps { choices: ChoiceView[]; onChoose: (choice: ChoiceView) => void; disabled?: boolean }

export function ChoiceClouds({ choices, onChoose, disabled }: ChoiceCloudsProps) {
  const visible = choices.filter((choice) => !choice.hidden)
  if (!visible.length) return null
  return (
    <div className="choice-clouds" aria-label="回应选项">
      {visible.map((choice, index) => (
        <button
          type="button"
          key={choice.edgeId}
          className={`choice-cloud tone-${choice.tone}`}
          style={{ '--choice-index': index } as React.CSSProperties}
          disabled={disabled}
          onClick={() => onChoose(choice)}
        >
          <span>{choice.text}</span>
        </button>
      ))}
    </div>
  )
}
