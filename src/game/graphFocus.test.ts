import { describe, expect, it } from 'vitest'
import type { TelephoneEdge } from './types'
import { graphFocusSelection } from './graphFocus'

const edge = (id: string, from: string, to: string): TelephoneEdge => ({
  id,
  from,
  to,
  label: id,
  priority: 50,
  trigger: { type: 'auto' },
})

describe('graph focus selection', () => {
  const edges = [
    edge('incoming', 'upstream', 'selected'),
    edge('outgoing', 'selected', 'downstream'),
    edge('unrelated', 'elsewhere', 'another'),
  ]

  it('includes direct upstream and downstream nodes and their incident edges', () => {
    const focus = graphFocusSelection('selected', edges)

    expect([...focus!.nodeIds].sort()).toEqual(['downstream', 'selected', 'upstream'])
    expect([...focus!.edgeIds].sort()).toEqual(['incoming', 'outgoing'])
  })

  it('restores the complete graph when selection is cleared', () => {
    expect(graphFocusSelection(null, edges)).toBeNull()
  })
})
