import type { CSSProperties } from 'react'
import { BOOTH_OBJECTS, type ShelfCoin } from '../game/boothItems'

interface BoothShelfProps {
  coins: ShelfCoin[]
  heldItemId: string | null
  coinCredit: number
  disabled?: boolean
  onToggleCoin: (coin: ShelfCoin) => void
  onToggleObject: (itemId: string) => void
}

export function BoothShelf({
  coins,
  heldItemId,
  coinCredit,
  disabled,
  onToggleCoin,
  onToggleObject,
}: BoothShelfProps) {
  return (
    <section className="booth-counter" aria-label="电话亭置物台">
      <div className="counter-back-rail" aria-hidden="true"><i /><i /><i /></div>
      <div className="counter-surface" aria-hidden="true" />
      <div className="counter-light-pool" aria-hidden="true" />
      <div className="counter-wear" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="counter-front" aria-hidden="true"><span>GPO PROPERTY · KEEP CLEAR</span></div>

      <div className="counter-items">
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

        {BOOTH_OBJECTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`shelf-object shelf-object-${item.id} ${heldItemId === item.id ? 'is-held' : ''}`}
            aria-label={`${heldItemId === item.id ? '放下' : '拿起并查看'}${item.label}`}
            aria-pressed={heldItemId === item.id}
            disabled={disabled}
            onClick={() => onToggleObject(item.id)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className={`credit-witness ${coinCredit ? 'is-ready' : ''}`} aria-live="polite">
        <i />{coinCredit ? '投币已就绪' : `${coins.length} 枚硬币留在台面`}
      </div>
    </section>
  )
}
