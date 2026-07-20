import { describe, expect, it } from 'vitest'
import { defaultTelephoneStory } from './callEngine'
import { validateStoryDefinition } from './storyValidation'

describe('Telephone graph validation', () => {
  it('accepts the shipped story and its seven endings', () => {
    const story = defaultTelephoneStory()
    expect(validateStoryDefinition(story)).toEqual([])
    expect(new Set(story.nodes.map((node) => node.telephone?.ending).filter(Boolean)).size).toBe(7)
    expect(story.globals.phone.directory.length).toBeGreaterThanOrEqual(5)
    expect(story.globals.phone.idleRingSchedule.length).toBeGreaterThanOrEqual(3)
  })

  it('detects dangling edges and missing entry nodes', () => {
    const story = defaultTelephoneStory()
    story.entryNodeId = 'missing'
    story.edges[0].to = 'also_missing'
    const issues = validateStoryDefinition(story)
    expect(issues.some((issue) => issue.path === 'entryNodeId')).toBe(true)
    expect(issues.some((issue) => issue.path === `edges.${story.edges[0].id}.to`)).toBe(true)
  })

  it('detects alias collisions and incoming-call metadata drift', () => {
    const story = defaultTelephoneStory()
    story.globals.phone.directory[1].aliases = [story.globals.phone.directory[0].number]
    story.globals.phone.idleRingSchedule[0].nodeId = 'busy_line'

    const issues = validateStoryDefinition(story)

    expect(issues.some((issue) => issue.message.includes('alias'))).toBe(true)
    expect(issues.some((issue) => issue.message.includes('incomingAnswer'))).toBe(true)
  })

  it('detects phone entries without routes, choice nodes without fallback, and orphan nodes', () => {
    const story = defaultTelephoneStory()
    const phone = story.globals.phone.directory.find((entry) => entry.id === 'road-status')!
    story.edges = story.edges.filter((edge) => !(edge.trigger.type === 'dialNumber' && edge.trigger.value === phone.number))
    const choiceNode = story.nodes.find((node) => node.id === 'ch1_maeve_alert')!
    delete choiceNode.body.fallbackVariants
    story.nodes.push({
      id: 'orphan_probe',
      label: '孤立节点',
      kind: 'call',
      position: { x: 0, y: 0 },
      body: { variants: ['不应可达。'] },
    })

    const issues = validateStoryDefinition(story)

    expect(issues.some((issue) => issue.path === 'globals.phone.directory.road-status')).toBe(true)
    expect(issues.some((issue) => issue.path === 'nodes.ch1_maeve_alert.body.fallbackVariants')).toBe(true)
    expect(issues.some((issue) => issue.path === 'nodes.orphan_probe')).toBe(true)
  })

  it('rejects a non-ending call node without a safe timeout to idle', () => {
    const story = defaultTelephoneStory()
    story.edges = story.edges.filter((edge) => !(edge.from === 'ch1_route_noted' && edge.trigger.type === 'timeout'))

    const issues = validateStoryDefinition(story)

    expect(issues.some((issue) => issue.path === 'nodes.ch1_route_noted.timeout')).toBe(true)
  })

  it('rejects a timeout that cannot unconditionally return a call to idle', () => {
    const story = defaultTelephoneStory()
    const timeout = story.edges.find((edge) => edge.from === 'ch1_route_noted' && edge.trigger.type === 'timeout')!
    timeout.trigger.value = 'never'

    const issues = validateStoryDefinition(story)

    expect(issues.some((issue) => issue.path === 'nodes.ch1_route_noted.timeout')).toBe(true)
  })
})
