import type { TelephoneEdge } from './types'

export interface GraphFocusSelection {
  nodeIds: Set<string>
  edgeIds: Set<string>
}

/**
 * Returns the selected node, its direct upstream/downstream neighbours, and
 * every incident edge. A null selection means the full graph should be shown.
 */
export function graphFocusSelection(selectedNodeId: string | null, edges: TelephoneEdge[]): GraphFocusSelection | null {
  if (!selectedNodeId) return null

  const nodeIds = new Set([selectedNodeId])
  const edgeIds = new Set<string>()

  for (const edge of edges) {
    if (edge.from !== selectedNodeId && edge.to !== selectedNodeId) continue
    nodeIds.add(edge.from)
    nodeIds.add(edge.to)
    edgeIds.add(edge.id)
  }

  return { nodeIds, edgeIds }
}
