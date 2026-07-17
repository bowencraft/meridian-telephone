import type { TelephoneStory } from './types'

export interface StoryValidationIssue { level: 'error' | 'warning'; path: string; message: string }

function duplicateValues(values: string[]) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
}

export function validateStoryDefinition(story: TelephoneStory): StoryValidationIssue[] {
  const issues: StoryValidationIssue[] = []
  const nodeIds = story.nodes.map((node) => node.id)
  const edgeIds = story.edges.map((edge) => edge.id)
  const nodeSet = new Set(nodeIds)
  const numbers = story.globals.phone.validNumbers.map((entry) => entry.number)

  if (story.format !== 'graph-content') issues.push({ level: 'error', path: 'format', message: '格式必须为 graph-content。' })
  if (!nodeSet.has(story.entryNodeId)) issues.push({ level: 'error', path: 'entryNodeId', message: '入口节点不存在。' })
  if (!nodeSet.has(story.globals.phone.wrongNumberNodeId)) issues.push({ level: 'error', path: 'globals.phone.wrongNumberNodeId', message: '空号节点不存在。' })
  if (!nodeSet.has(story.globals.phone.busyNumberNodeId)) issues.push({ level: 'error', path: 'globals.phone.busyNumberNodeId', message: '忙音节点不存在。' })
  duplicateValues(nodeIds).forEach((id) => issues.push({ level: 'error', path: `nodes.${id}`, message: `节点 ID ${id} 重复。` }))
  duplicateValues(edgeIds).forEach((id) => issues.push({ level: 'error', path: `edges.${id}`, message: `转场 ID ${id} 重复。` }))
  duplicateValues(numbers).forEach((number) => issues.push({ level: 'error', path: 'globals.phone.validNumbers', message: `号码 ${number} 重复。` }))

  story.nodes.forEach((node) => {
    if (!node.label.trim()) issues.push({ level: 'error', path: `nodes.${node.id}.label`, message: '节点名称不能为空。' })
    if (!node.body.variants.length && !node.body.fallbackVariants?.length) issues.push({ level: 'warning', path: `nodes.${node.id}.body`, message: '节点没有任何通话文本。' })
  })
  story.edges.forEach((edge) => {
    if (!nodeSet.has(edge.from)) issues.push({ level: 'error', path: `edges.${edge.id}.from`, message: `来源节点 ${edge.from} 不存在。` })
    if (!nodeSet.has(edge.to)) issues.push({ level: 'error', path: `edges.${edge.id}.to`, message: `目标节点 ${edge.to} 不存在。` })
    if (edge.trigger.type === 'choice' && !edge.choice?.text) issues.push({ level: 'warning', path: `edges.${edge.id}.choice`, message: '选项转场缺少玩家可见文本。' })
  })
  if (!story.nodes.some((node) => node.telephone?.ending === 'disconnected')) issues.push({ level: 'error', path: 'nodes', message: '缺少“断线”成功结局。' })
  if (new Set(story.nodes.map((node) => node.telephone?.ending).filter(Boolean)).size < 5) issues.push({ level: 'warning', path: 'nodes', message: '建议至少提供五种不同结局。' })
  return issues
}
