/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ResolvedSceneItem } from '../game/types'
import { BoothShelf } from './BoothShelf'

const sceneObject: ResolvedSceneItem = {
  instanceId: '0:counter:test-object',
  slotId: 'counter',
  layer: 'counter',
  prop: {
    id: 'test-object',
    kind: 'ticket',
    label: '测试回执',
    ariaLabel: '查看测试回执',
    printedLines: ['TEST'],
    copy: { summary: '一张回执。', style: '蓝灰复写纸。', firstVariants: ['细节。'] },
    counterStyle: 'operator-docket',
    appearance: { presetId: 'carbon-ticket' },
  },
  bounds: { x: 1, y: 1, width: 10, height: 10 },
  appearance: { presetId: 'carbon-ticket' },
  firstCopy: '细节。',
}

describe('BoothShelf interaction locks', () => {
  it('locks scene objects during calls without locking coins', () => {
    const onToggleCoin = vi.fn()
    const onToggleObject = vi.fn()
    render(<BoothShelf
      coins={[{ id: 'coin', x: 1, y: 1, rotation: 0, denomination: 'THREE PENCE' }]}
      heldItemId={null}
      coinCredit={0}
      objects={[sceneObject]}
      objectsDisabled
      onToggleCoin={onToggleCoin}
      onToggleObject={onToggleObject}
    />)

    const coin = screen.getByRole('button', { name: '拿起三便士硬币' })
    const object = screen.getByRole('button', { name: '拿起并查看测试回执' })
    expect((coin as HTMLButtonElement).disabled).toBe(false)
    expect((object as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(coin)
    fireEvent.click(object)
    expect(onToggleCoin).toHaveBeenCalledOnce()
    expect(onToggleObject).not.toHaveBeenCalled()
  })
})
