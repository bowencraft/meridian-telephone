import { describe, expect, it } from 'vitest'
import { defaultTelephoneStory } from './callEngine'
import { migrateTelephoneStory } from './storyMigration'

describe('Telephone story migration', () => {
  it('keeps v2 scene data and night-start lifecycle intact', () => {
    const story = defaultTelephoneStory()
    const migrated = migrateTelephoneStory(story)
    expect(migrated.formatVersion).toBe(2)
    expect(migrated.extensions.telephone.scene.refreshPolicy).toBe('nightStart')
    expect(migrated.globals.phone.directory[0].id).toBeTruthy()
  })

  it('upgrades a v1 hotspot and raw number into split scene and directory data', () => {
    const current = defaultTelephoneStory() as any
    current.formatVersion = 1
    current.globals.phone.validNumbers = current.globals.phone.directory.map((entry: any) => {
      const legacy = { ...entry }
      delete legacy.id
      delete legacy.initiallyKnown
      return legacy
    })
    delete current.globals.phone.directory
    current.extensions.telephone.sceneHotspots = [{
      id: 'old-note', label: '旧纸条', ariaLabel: '查看旧纸条', x: 10, y: 20, width: 12, height: 8,
      body: '纸上写着天气号码。', number: '9460264',
    }]
    delete current.extensions.telephone.scene

    const migrated = migrateTelephoneStory(current)
    expect(migrated.globals.phone.directory.find((entry) => entry.number === '9460264')?.id).toBe('weather-service')
    expect(migrated.extensions.telephone.scene.slots[0]).toMatchObject({ id: 'old-note', spawnChance: 1 })
    expect(migrated.extensions.telephone.scene.props[0].phoneRefs).toEqual(['weather-service'])
    expect(migrated.extensions.telephone.scene.refreshPolicy).toBe('nightStart')
  })
})
