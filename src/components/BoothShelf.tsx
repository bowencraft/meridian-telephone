import type { CSSProperties, ReactNode, Ref } from 'react'
import type { ShelfCoin } from '../game/boothItems'
import type { ResolvedSceneItem } from '../game/types'
import { CounterSceneProp } from './CounterSceneProp'

interface BoothShelfProps {
  coins: ShelfCoin[]
  heldItemId: string | null
  coinCredit: number
  objects: ResolvedSceneItem[]
  disabled?: boolean
  objectsDisabled?: boolean
  preview?: boolean
  counterItemsRef?: Ref<HTMLDivElement>
  overlay?: ReactNode
  onToggleCoin: (coin: ShelfCoin) => void
  onToggleObject: (item: ResolvedSceneItem) => void
}

export function BoothShelf({
  coins,
  heldItemId,
  coinCredit,
  objects,
  disabled,
  objectsDisabled,
  preview = false,
  counterItemsRef,
  overlay,
  onToggleCoin,
  onToggleObject,
}: BoothShelfProps) {
  return (
    <section className={`booth-counter ${preview ? 'is-fixture-preview' : ''}`} aria-label="电话亭置物台">
      <div className="counter-back-rail" aria-hidden="true"><i /><i /><i /></div>
      <div className="counter-surface" aria-hidden="true" />
      <div className="counter-light-pool" aria-hidden="true" />
      <div className="counter-wear" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="counter-front" aria-hidden="true"><span>GPO PROPERTY · KEEP CLEAR</span></div>

      <div ref={counterItemsRef} className="counter-items">
        {coins.map((coin) => (
          <button
            key={coin.id}
            type="button"
            className={`shelf-coin ${heldItemId === coin.id ? 'is-held' : ''}`}
            style={{ '--coin-x': `${coin.x}%`, '--coin-y': `${coin.y}%`, '--coin-rotation': `${coin.rotation}deg` } as CSSProperties}
            aria-label={`${heldItemId === coin.id ? '放下' : '拿起'}三便士硬币`}
            aria-pressed={heldItemId === coin.id}
            disabled={disabled}
            onClick={() => onToggleCoin(coin)}
          >
            <span>3</span><small>PENCE</small>
          </button>
        ))}

        {objects.map((item) => (
          <CounterSceneProp
            key={item.instanceId}
            item={item}
            held={heldItemId === item.instanceId}
            disabled={disabled || objectsDisabled}
            onClick={() => onToggleObject(item)}
          />
        ))}
        {overlay}
      </div>

      <div className={`credit-witness ${coinCredit ? 'is-ready' : ''}`} aria-live="polite">
        <i />{coinCredit ? '投币已就绪' : `${coins.length} 枚硬币留在台面`}
      </div>
    </section>
  )
}
