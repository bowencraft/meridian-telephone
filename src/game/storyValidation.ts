import type { GraphCondition, GraphEffect, TelephoneStory } from './types'

export interface StoryValidationIssue { level: 'error' | 'warning'; path: string; message: string }

function duplicateValues(values: string[]) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
}

export function validateStoryDefinition(story: TelephoneStory): StoryValidationIssue[] {
  const issues: StoryValidationIssue[] = []
  const nodeIds = story.nodes.map((node) => node.id)
  const edgeIds = story.edges.map((edge) => edge.id)
  const nodeSet = new Set(nodeIds)
  const directory = story.globals.phone.directory
  const numbers = directory.map((entry) => entry.number)
  const dialNumbers = directory.flatMap((entry) => [entry.number, ...(entry.aliases ?? [])])
  const phoneIds = directory.map((entry) => entry.id)
  const scene = story.extensions.telephone.scene
  const propIds = scene.props.map((prop) => prop.id)
  const slotIds = scene.slots.map((slot) => slot.id)
  const presetIds = scene.stylePresets.map((preset) => preset.id)
  const ringIds = story.globals.phone.idleRingSchedule.map((ring) => ring.id)
  const globalNodeIds = new Set(story.nodes.filter((node) => node.kind === 'global').map((node) => node.id))

  function validateConditions(conditions: GraphCondition[] | undefined, path: string) {
    conditions?.forEach((condition, index) => {
      if (condition.type === 'phoneKnown' && !phoneIds.includes(condition.phoneId)) issues.push({ level: 'error', path: `${path}.${index}`, message: `条件引用的电话 ${condition.phoneId} 不存在。` })
      if (condition.type === 'hasNumber' && !dialNumbers.includes(condition.value.replace(/\D/g, ''))) issues.push({ level: 'error', path: `${path}.${index}`, message: `条件引用的号码 ${condition.value} 不存在。` })
      if (condition.type === 'hasFact' && !condition.value.trim()) issues.push({ level: 'error', path: `${path}.${index}`, message: '长期事实名称不能为空。' })
      if (condition.type === 'attemptsGte' && condition.value < 0) issues.push({ level: 'error', path: `${path}.${index}`, message: '周目条件不能小于0。' })
    })
  }

  function validateEffects(effects: GraphEffect[] | undefined, path: string) {
    effects?.forEach((effect, index) => {
      if (effect.type === 'discoverPhone' && !phoneIds.includes(effect.phoneId)) issues.push({ level: 'error', path: `${path}.${index}`, message: `效果引用的电话 ${effect.phoneId} 不存在。` })
      if (effect.type === 'discoverNumber' && !dialNumbers.includes(effect.number.replace(/\D/g, ''))) issues.push({ level: 'error', path: `${path}.${index}`, message: `效果发现的号码 ${effect.number} 不存在。` })
      if (effect.type === 'addFact' && !effect.fact.trim()) issues.push({ level: 'error', path: `${path}.${index}`, message: '长期事实名称不能为空。' })
    })
  }

  if (story.format !== 'graph-content') issues.push({ level: 'error', path: 'format', message: '格式必须为 graph-content。' })
  if (story.formatVersion !== 2) issues.push({ level: 'error', path: 'formatVersion', message: '后台仅保存迁移后的 v2 剧情格式。' })
  if (scene.refreshPolicy !== 'nightStart') issues.push({ level: 'error', path: 'extensions.telephone.scene.refreshPolicy', message: '场景只能在新夜班开始时刷新。' })
  if (!nodeSet.has(story.entryNodeId)) issues.push({ level: 'error', path: 'entryNodeId', message: '入口节点不存在。' })
  if (!nodeSet.has(story.globals.phone.wrongNumberNodeId)) issues.push({ level: 'error', path: 'globals.phone.wrongNumberNodeId', message: '空号节点不存在。' })
  if (!nodeSet.has(story.globals.phone.busyNumberNodeId)) issues.push({ level: 'error', path: 'globals.phone.busyNumberNodeId', message: '忙音节点不存在。' })
  duplicateValues(nodeIds).forEach((id) => issues.push({ level: 'error', path: `nodes.${id}`, message: `节点 ID ${id} 重复。` }))
  duplicateValues(edgeIds).forEach((id) => issues.push({ level: 'error', path: `edges.${id}`, message: `转场 ID ${id} 重复。` }))
  duplicateValues(numbers).forEach((number) => issues.push({ level: 'error', path: 'globals.phone.directory', message: `号码 ${number} 重复。` }))
  duplicateValues(dialNumbers).forEach((number) => issues.push({ level: 'error', path: 'globals.phone.directory', message: `号码或 alias ${number} 重复。` }))
  duplicateValues(phoneIds).forEach((id) => issues.push({ level: 'error', path: 'globals.phone.directory', message: `号码簿 ID ${id} 重复。` }))
  duplicateValues(propIds).forEach((id) => issues.push({ level: 'error', path: 'extensions.telephone.scene.props', message: `场景物品 ID ${id} 重复。` }))
  duplicateValues(slotIds).forEach((id) => issues.push({ level: 'error', path: 'extensions.telephone.scene.slots', message: `场景点位 ID ${id} 重复。` }))
  duplicateValues(presetIds).forEach((id) => issues.push({ level: 'error', path: 'extensions.telephone.scene.stylePresets', message: `外观预设 ID ${id} 重复。` }))
  duplicateValues(ringIds).forEach((id) => issues.push({ level: 'error', path: `globals.phone.idleRingSchedule.${id}`, message: `来电 ID ${id} 重复。` }))

  directory.forEach((entry, index) => {
    if (!entry.id.trim()) issues.push({ level: 'error', path: `globals.phone.directory.${index}.id`, message: '电话 ID 不能为空。' })
    if (!entry.number.trim()) issues.push({ level: 'error', path: `globals.phone.directory.${entry.id}.number`, message: '电话号码不能为空。' })
    if (!/^(\d{3}|\d{7})$/.test(entry.number)) issues.push({ level: 'error', path: `globals.phone.directory.${entry.id}.number`, message: '电话号码必须是三位紧急号或七位本地号。' })
    entry.aliases?.forEach((alias, aliasIndex) => {
      if (!/^(\d{3}|\d{7})$/.test(alias)) issues.push({ level: 'error', path: `globals.phone.directory.${entry.id}.aliases.${aliasIndex}`, message: '号码 alias 必须是三位紧急号或七位本地号。' })
    })
    if (!entry.label.trim()) issues.push({ level: 'error', path: `globals.phone.directory.${entry.id}.label`, message: '电话名称不能为空。' })
    if (!story.edges.some((edge) => globalNodeIds.has(edge.from) && edge.trigger.type === 'dialNumber' && edge.trigger.value === entry.number)) issues.push({ level: 'error', path: `globals.phone.directory.${entry.id}`, message: `号码 ${entry.number} 没有全局拨号转场。` })
  })

  scene.slots.forEach((slot) => {
    if (slot.spawnChance < 0 || slot.spawnChance > 1) issues.push({ level: 'error', path: `extensions.telephone.scene.slots.${slot.id}.spawnChance`, message: '生成概率必须在 0–1 之间。' })
    if (!slot.candidates.length) issues.push({ level: 'warning', path: `extensions.telephone.scene.slots.${slot.id}.candidates`, message: '点位没有候选物品，将始终为空。' })
    if (slot.bounds.width <= 0 || slot.bounds.height <= 0) issues.push({ level: 'error', path: `extensions.telephone.scene.slots.${slot.id}.bounds`, message: '点位宽高必须大于 0。' })
    if (slot.bounds.x < 0 || slot.bounds.y < 0 || slot.bounds.x + slot.bounds.width > 100 || slot.bounds.y + slot.bounds.height > 100) issues.push({ level: 'warning', path: `extensions.telephone.scene.slots.${slot.id}.bounds`, message: '点位超出场景边界。' })
    if (slot.mobileBounds && (slot.mobileBounds.width <= 0 || slot.mobileBounds.height <= 0)) issues.push({ level: 'error', path: `extensions.telephone.scene.slots.${slot.id}.mobileBounds`, message: '手机点位宽高必须大于 0。' })
    if (slot.mobileBounds && (slot.mobileBounds.x < 0 || slot.mobileBounds.y < 0 || slot.mobileBounds.x + slot.mobileBounds.width > 100 || slot.mobileBounds.y + slot.mobileBounds.height > 100)) issues.push({ level: 'warning', path: `extensions.telephone.scene.slots.${slot.id}.mobileBounds`, message: '手机点位超出场景边界。' })
    validateConditions(slot.requires, `extensions.telephone.scene.slots.${slot.id}.requires`)
    slot.candidates.forEach((candidate) => {
      if (!propIds.includes(candidate.propId)) issues.push({ level: 'error', path: `extensions.telephone.scene.slots.${slot.id}`, message: `候选物品 ${candidate.propId} 不存在。` })
      const candidateProp = scene.props.find((prop) => prop.id === candidate.propId)
      if (slot.layer === 'counter' && candidateProp && !candidateProp.counterStyle) issues.push({ level: 'warning', path: `extensions.telephone.scene.slots.${slot.id}.${candidate.propId}`, message: '柜台点位引用了没有柜台拟物造型的物品。' })
      if ((slot.layer ?? 'wall') === 'wall' && candidateProp?.counterStyle) issues.push({ level: 'warning', path: `extensions.telephone.scene.slots.${slot.id}.${candidate.propId}`, message: '墙面点位引用了柜台专用物品。' })
      if (candidate.weight <= 0) issues.push({ level: 'warning', path: `extensions.telephone.scene.slots.${slot.id}.${candidate.propId}.weight`, message: '候选权重应大于 0。' })
      if ((candidate.priority ?? 0) < 0) issues.push({ level: 'error', path: `extensions.telephone.scene.slots.${slot.id}.${candidate.propId}.priority`, message: '候选优先级不能小于0。' })
      if (candidate.appearanceOverrides?.presetId && !presetIds.includes(candidate.appearanceOverrides.presetId)) issues.push({ level: 'error', path: `extensions.telephone.scene.slots.${slot.id}.${candidate.propId}.appearanceOverrides`, message: `候选覆盖预设 ${candidate.appearanceOverrides.presetId} 不存在。` })
      validateConditions(candidate.requires, `extensions.telephone.scene.slots.${slot.id}.${candidate.propId}.requires`)
    })
  })
  scene.props.forEach((prop) => {
    if (!presetIds.includes(prop.appearance.presetId)) issues.push({ level: 'error', path: `extensions.telephone.scene.props.${prop.id}.appearance`, message: `外观预设 ${prop.appearance.presetId} 不存在。` })
    if (!prop.copy.firstVariants.length) issues.push({ level: 'warning', path: `extensions.telephone.scene.props.${prop.id}.copy`, message: '物品没有首次检查文案。' })
    if (!prop.copy.summary?.trim()) issues.push({ level: 'error', path: `extensions.telephone.scene.props.${prop.id}.copy.summary`, message: '物品必须提供粗略信息。' })
    if (!prop.copy.style?.trim()) issues.push({ level: 'error', path: `extensions.telephone.scene.props.${prop.id}.copy.style`, message: '物品必须提供可读的样式描述。' })
    prop.phoneRefs?.forEach((phoneId) => {
      if (!phoneIds.includes(phoneId)) issues.push({ level: 'error', path: `extensions.telephone.scene.props.${prop.id}.phoneRefs`, message: `号码引用 ${phoneId} 不存在。` })
    })
    validateEffects(prop.effects, `extensions.telephone.scene.props.${prop.id}.effects`)
    if (prop.sceneEvent && !story.edges.some((edge) => edge.trigger.type === 'sceneInspect' && edge.trigger.value === prop.sceneEvent)) issues.push({ level: 'warning', path: `extensions.telephone.scene.props.${prop.id}.sceneEvent`, message: `场景事件 ${prop.sceneEvent} 没有匹配转场。` })
  })

  story.nodes.forEach((node) => {
    if (!node.label.trim()) issues.push({ level: 'error', path: `nodes.${node.id}.label`, message: '节点名称不能为空。' })
    if (!node.body.variants.length && !node.body.fallbackVariants?.length) issues.push({ level: 'warning', path: `nodes.${node.id}.body`, message: '节点没有任何通话文本。' })
    const hasChoices = story.edges.some((edge) => edge.from === node.id && edge.trigger.type === 'choice')
    if (hasChoices && !node.body.fallbackVariants?.length) issues.push({ level: 'warning', path: `nodes.${node.id}.body.fallbackVariants`, message: '有选项的节点必须说明无效输入后如何继续。' })
    const isImplicitFallback = node.id === story.globals.phone.wrongNumberNodeId || node.id === story.globals.phone.busyNumberNodeId
    const hasIncomingEdge = story.edges.some((edge) => edge.to === node.id)
    if (node.id !== story.entryNodeId && node.kind !== 'global' && !isImplicitFallback && !hasIncomingEdge) issues.push({ level: 'warning', path: `nodes.${node.id}`, message: '节点没有任何入边，正常玩法无法进入。' })
    const needsSafeTimeout = node.id !== story.entryNodeId && node.kind !== 'global' && !node.telephone?.ending
    const hasSafeTimeout = story.edges.some((edge) => (
      edge.from === node.id
      && edge.trigger.type === 'timeout'
      && edge.trigger.value === 'call'
      && !edge.conditions?.length
      && edge.to === story.entryNodeId
    ))
    if (needsSafeTimeout && !hasSafeTimeout) issues.push({ level: 'error', path: `nodes.${node.id}.timeout`, message: '非结局通话节点必须有回到待机入口的安全 timeout。' })
  })
  story.edges.forEach((edge) => {
    if (!nodeSet.has(edge.from)) issues.push({ level: 'error', path: `edges.${edge.id}.from`, message: `来源节点 ${edge.from} 不存在。` })
    if (!nodeSet.has(edge.to)) issues.push({ level: 'error', path: `edges.${edge.id}.to`, message: `目标节点 ${edge.to} 不存在。` })
    if (edge.trigger.type === 'choice' && !edge.choice?.text) issues.push({ level: 'warning', path: `edges.${edge.id}.choice`, message: '选项转场缺少玩家可见文本。' })
    validateConditions(edge.conditions, `edges.${edge.id}.conditions`)
    validateEffects(edge.effects, `edges.${edge.id}.effects`)
  })
  const choiceGroups = new Map<string, TelephoneStory['edges']>()
  story.edges.filter((edge) => edge.trigger.type === 'choice').forEach((edge) => {
    const key = `${edge.from}:${edge.trigger.value ?? edge.id}`
    choiceGroups.set(key, [...(choiceGroups.get(key) ?? []), edge])
  })
  choiceGroups.forEach((edges, key) => {
    const texts = new Set(edges.map((edge) => edge.choice?.text).filter(Boolean))
    if (texts.size > 1) issues.push({ level: 'warning', path: `edges.${key}`, message: '同一 choice value 的条件分支使用了不同可见文案；前台只显示最高优先级分支。' })
  })
  story.globals.phone.idleRingSchedule.forEach((ring) => {
    validateConditions(ring.requires, `globals.phone.idleRingSchedule.${ring.id}.requires`)
    validateEffects(ring.missedEffects, `globals.phone.idleRingSchedule.${ring.id}.missedEffects`)
    if (!nodeSet.has(ring.nodeId)) issues.push({ level: 'error', path: `globals.phone.idleRingSchedule.${ring.id}.nodeId`, message: `来电目标 ${ring.nodeId} 不存在。` })
    const answerEdges = story.edges.filter((edge) => edge.trigger.type === 'incomingAnswer' && edge.trigger.value === ring.id)
    if (answerEdges.length !== 1) issues.push({ level: 'error', path: `globals.phone.idleRingSchedule.${ring.id}`, message: `来电 ${ring.id} 必须恰有一条 incomingAnswer 转场。` })
    if (answerEdges.length === 1 && answerEdges[0].to !== ring.nodeId) issues.push({ level: 'error', path: `globals.phone.idleRingSchedule.${ring.id}.nodeId`, message: `来电 ${ring.id} 的 nodeId 与 incomingAnswer 目标不一致。` })
    if (answerEdges.length === 1 && answerEdges[0].from !== story.entryNodeId && !globalNodeIds.has(answerEdges[0].from)) issues.push({ level: 'error', path: `globals.phone.idleRingSchedule.${ring.id}`, message: `来电 ${ring.id} 的接听转场必须来自global或入口节点。` })
  })
  if (!story.nodes.some((node) => node.telephone?.ending === 'disconnected')) issues.push({ level: 'error', path: 'nodes', message: '缺少“断线”成功结局。' })
  if (new Set(story.nodes.map((node) => node.telephone?.ending).filter(Boolean)).size < 5) issues.push({ level: 'warning', path: 'nodes', message: '建议至少提供五种不同结局。' })
  return issues
}
