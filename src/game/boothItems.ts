import type { TelephonePhase } from './types'

export interface ShelfCoin {
  id: string
  x: number
  y: number
  rotation: number
  denomination: 'THREE PENCE'
}

export interface BoothObjectDefinition {
  id: string
  label: string
  description: string
}

export const BOOTH_OBJECTS: BoothObjectDefinition[] = [
  {
    id: 'night-ticket',
    label: '末班车票',
    description: '一张被雨打湿的 15 路末班车票。背面写着：如果电话响了两次，不要报出你的名字。',
  },
  {
    id: 'meridian-matches',
    label: 'Meridian 火柴盒',
    description: '火柴只剩一根。盒底印着子午礼仪交换所的旧标志，地址一栏被蓝墨水涂黑。',
  },
  {
    id: 'locker-key',
    label: '黄铜钥匙',
    description: '细小的黄铜钥匙挂着 19 号牌，齿槽里有黑色电话线胶皮留下的碎屑。',
  },
]

function seededFraction(seed: number, offset: number) {
  const value = Math.sin((seed + offset * 7919) * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export function coinCountForNight(seed: number) {
  return 1 + Math.floor(seededFraction(seed, 1) * 3)
}

export function createNightCoins(seed: number): ShelfCoin[] {
  return Array.from({ length: coinCountForNight(seed) }, (_, index) => ({
    id: `night-${seed}-coin-${index + 1}`,
    x: 12 + index * 4.4 + seededFraction(seed, index + 3) * 1.8,
    y: 24 + (index % 2) * 8 + seededFraction(seed, index + 7) * 3,
    rotation: -18 + seededFraction(seed, index + 11) * 36,
    denomination: 'THREE PENCE' as const,
  }))
}

export function returnedCoin(id: string, index: number): ShelfCoin {
  return {
    id,
    x: 14 + (index % 3) * 4.2,
    y: 26 + (index % 2) * 7,
    rotation: -12 + (index % 5) * 6,
    denomination: 'THREE PENCE',
  }
}

export function canDialWithCredit(phase: TelephonePhase, credit: number) {
  return credit > 0 && (phase === 'offHook' || phase === 'dialing' || phase === 'timeoutWarning')
}
