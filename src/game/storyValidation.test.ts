import { describe, expect, it } from 'vitest'
import { defaultTelephoneStory } from './callEngine'
import { validateStoryDefinition } from './storyValidation'

describe('Telephone graph validation', () => {
  it('accepts the shipped story and its seven endings', () => {
    const story = defaultTelephoneStory()
    expect(validateStoryDefinition(story).filter((issue) => issue.level === 'error')).toEqual([])
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
})
