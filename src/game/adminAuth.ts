const ADMIN_SESSION_KEY = 'telephone-admin-unlocked-v1'

function configuredHash() {
  return import.meta.env.VITE_ADMIN_PASSWORD_HASH ?? ''
}

export function adminPasswordConfigured() {
  return configuredHash().length === 64
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function matchesAdminPassword(password: string, expectedHash: string) {
  if (!password || expectedHash.length !== 64) return false
  const actualHash = await sha256Hex(password)
  let difference = 0
  for (let index = 0; index < expectedHash.length; index += 1) {
    difference |= actualHash.charCodeAt(index) ^ expectedHash.charCodeAt(index)
  }
  return difference === 0
}

export function isAdminUnlocked() {
  const expectedHash = configuredHash()
  if (!expectedHash) return false
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === expectedHash
  } catch {
    return false
  }
}

export async function verifyAdminPassword(password: string) {
  return matchesAdminPassword(password, configuredHash())
}

export function rememberAdminUnlock() {
  const expectedHash = configuredHash()
  if (!expectedHash) return
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, expectedHash)
  } catch {
    // The panel remains available for this render when storage is unavailable.
  }
}

export function clearAdminUnlock() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    // Storage can be unavailable in privacy modes; a reload still resets access.
  }
}
