import type { ChoiceView } from '../game/types'

interface ChoiceCloudsProps { choices: ChoiceView[]; onChoose: (choice: ChoiceView) => void; disabled?: boolean }

export function ChoiceClouds({ choices, onChoose, disabled }: ChoiceCloudsProps) {
  const visible = choices.filter((choice) => !choice.hidden)
  if (!visible.length) return null
  return (
    <div className="choice-clouds" aria-label="回应选项">
      <div className="response-bank-chassis" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="response-bank-label"><span>SELECT RESPONSE</span><small>PRESS ONE SPEAKING KEY</small></div>
      {visible.map((choice, index) => (
        <button
          type="button"
          key={choice.edgeId}
          className={`choice-cloud tone-${choice.tone}`}
          style={{ '--choice-index': index } as React.CSSProperties}
          disabled={disabled}
          onClick={() => onChoose(choice)}
        >
          <span className="choice-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="choice-copy">{choice.text}</span>
          <i className="choice-rivet" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
