import { describe, expect, it } from 'vitest'
import { clearProgress, createSessionId, loadProgress, loadRecordArchive, saveRecord } from './record'
import type { CallRecordData } from './types'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('call archive persistence', () => {
  it('merges discoveries and endings across attempts', () => {
    const storage = new MemoryStorage()
    expect(createSessionId(storage)).toBe('MCE-0001')
    const record: CallRecordData = {
      sessionId: 'MCE-0001', startedAt: 1, completedAt: 2,
      ending: 'disconnected', endingTitle: '断线', transcript: [], dialLog: [],
      discoveredNumbers: ['8714127'], clues: ['总机号码'], facts: ['vale-safety-signature-revoked'], durableState: { safetySignature: 'revoked' }, flags: {},
    }
    saveRecord(record, storage)
    expect(loadProgress(storage)).toMatchObject({ attempts: 1, lastEnding: 'disconnected', seenEndings: ['disconnected'], discoveredNumbers: ['8714127'], facts: ['vale-safety-signature-revoked'], durableState: { safetySignature: 'revoked' } })
    expect(loadRecordArchive(storage)).toHaveLength(1)
    expect(createSessionId(storage)).toBe('MCE-0002')
    clearProgress(storage)
    expect(loadProgress(storage).attempts).toBe(0)
  })

  it('migrates progress written before durable facts existed', () => {
    const storage = new MemoryStorage()
    storage.setItem('telephone.progress.v1', JSON.stringify({ discoveredNumbers: [], seenEndings: [], clues: [], attempts: 2 }))
    expect(loadProgress(storage)).toMatchObject({ attempts: 2, facts: [], durableState: {} })
  })
})
