export function elapsedSeconds(startedAt: number | null, now: number) {
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function timeoutStage(idleMs: number, warningAtMs: number, timeoutAtMs: number): 'active' | 'warning' | 'expired' {
  if (idleMs >= timeoutAtMs) return 'expired'
  if (idleMs >= warningAtMs) return 'warning'
  return 'active'
}
