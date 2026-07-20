import type { CallRecordData, EndingType, ProgressData } from './types'

export const LAST_RECORD_KEY = 'telephone.seedline.lastRecord.v1'
export const RECORD_ARCHIVE_KEY = 'telephone.seedline.recordArchive.v1'
export const PROGRESS_KEY = 'telephone.seedline.progress.v1'

const EMPTY_PROGRESS: ProgressData = { discoveredNumbers: [], seenEndings: [], clues: [], facts: [], durableState: {}, attempts: 0 }

function readJson<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const value = storage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

export function createSessionId(storage: Storage = window.localStorage) {
  const progress = loadProgress(storage)
  const sequence = progress.attempts + 1
  return `MCE-${String(sequence).padStart(4, '0')}`
}

export function loadProgress(storage: Storage = window.localStorage): ProgressData {
  const stored = readJson<Partial<ProgressData>>(storage, PROGRESS_KEY, structuredClone(EMPTY_PROGRESS))
  return {
    discoveredNumbers: stored.discoveredNumbers ?? [],
    seenEndings: stored.seenEndings ?? [],
    clues: stored.clues ?? [],
    facts: stored.facts ?? [],
    durableState: stored.durableState ?? {},
    lastEnding: stored.lastEnding,
    attempts: stored.attempts ?? 0,
  }
}

export function saveRecord(record: CallRecordData, storage: Storage = window.localStorage) {
  storage.setItem(LAST_RECORD_KEY, JSON.stringify(record))
  const archive = loadRecordArchive(storage).filter((item) => item.sessionId !== record.sessionId)
  storage.setItem(RECORD_ARCHIVE_KEY, JSON.stringify([record, ...archive].slice(0, 16)))
  const previous = loadProgress(storage)
  const progress: ProgressData = {
    discoveredNumbers: [...new Set([...previous.discoveredNumbers, ...record.discoveredNumbers])],
    seenEndings: [...new Set<EndingType>([...previous.seenEndings, record.ending])],
    clues: [...new Set([...previous.clues, ...record.clues])],
    facts: [...new Set([...previous.facts, ...record.facts])],
    durableState: { ...previous.durableState, ...record.durableState },
    lastEnding: record.ending,
    attempts: Math.max(previous.attempts + 1, Number(record.sessionId.split('-')[1] ?? 1)),
  }
  storage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function loadLastRecord(storage: Storage = window.localStorage): CallRecordData | null {
  return readJson<CallRecordData | null>(storage, LAST_RECORD_KEY, null)
}

export function loadRecordArchive(storage: Storage = window.localStorage): CallRecordData[] {
  return readJson<CallRecordData[]>(storage, RECORD_ARCHIVE_KEY, [])
}

export function clearProgress(storage: Storage = window.localStorage) {
  storage.removeItem(LAST_RECORD_KEY)
  storage.removeItem(RECORD_ARCHIVE_KEY)
  storage.removeItem(PROGRESS_KEY)
}
