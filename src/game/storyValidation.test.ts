import { describe, expect, it } from 'vitest'
import { defaultTelephoneStory } from './callEngine'
import { validateStoryDefinition } from './storyValidation'

describe('Telephone graph validation', () => {
  it('accepts the remotely deployed story and its seven endings', () => {
    const story = defaultTelephoneStory()
    expect(validateStoryDefinition(story).filter((issue) => issue.level === 'error')).toEqual([])
    expect(new Set(story.nodes.map((node) => node.telephone?.ending).filter(Boolean)).size).toBe(7)
    expect(story.globals.phone.directory.length).toBe(8)
    expect(story.globals.phone.idleRingSchedule.length).toBe(3)
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

  it('detects phone entries without routes and orphan nodes', () => {
    const story = defaultTelephoneStory()
    const phone = story.globals.phone.directory.find((entry) => entry.id === 'weather-service')!
    story.edges = story.edges.filter((edge) => !(edge.trigger.type === 'dialNumber' && edge.trigger.value === phone.number))
    story.nodes.push({
      id: 'orphan_probe',
      label: '孤立节点',
      kind: 'call',
      position: { x: 0, y: 0 },
      body: { variants: ['不应可达。'] },
    })
    const issues = validateStoryDefinition(story)
    expect(issues.some((issue) => issue.path === 'globals.phone.directory.weather-service')).toBe(true)
    expect(issues.some((issue) => issue.path === 'nodes.orphan_probe')).toBe(true)
  })

  it('reports missing safe timeouts as compatibility warnings, not structural errors', () => {
    const story = defaultTelephoneStory()
    const issues = validateStoryDefinition(story).filter((issue) => issue.path === 'nodes.weather_intro.timeout')
    expect(issues).toEqual([{ level: 'warning', path: 'nodes.weather_intro.timeout', message: '建议为非结局通话节点增加回到待机入口的安全 timeout。' }])
  })
})
