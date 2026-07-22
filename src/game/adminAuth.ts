export interface AdminSessionState {
  available: boolean
  configured: boolean
  authenticated: boolean
  loginAllowed: boolean
}

export type AdminLoginResult = 'ok' | 'invalid' | 'rate-limited' | 'unconfigured' | 'insecure' | 'unavailable'

let csrfToken = ''

function unavailableSession(): AdminSessionState {
  return { available: false, configured: false, authenticated: false, loginAllowed: false }
}

export async function checkAdminSession(): Promise<AdminSessionState> {
  try {
    const response = await fetch('/api/admin/session', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return unavailableSession()
    const value = await response.json() as Partial<AdminSessionState> & { csrfToken?: string }
    csrfToken = value.authenticated && typeof value.csrfToken === 'string' ? value.csrfToken : ''
    return {
      available: value.available === true,
      configured: value.configured === true,
      authenticated: value.authenticated === true,
      loginAllowed: value.loginAllowed === true,
    }
  } catch {
    csrfToken = ''
    return unavailableSession()
  }
}

export async function loginAdmin(password: string): Promise<AdminLoginResult> {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (response.status === 401) return 'invalid'
    if (response.status === 429) return 'rate-limited'
    if (response.status === 503) return 'unconfigured'
    if (response.status === 426) return 'insecure'
    if (!response.ok) return 'unavailable'
    const value = await response.json() as { authenticated?: boolean; csrfToken?: string }
    if (value.authenticated !== true || typeof value.csrfToken !== 'string') return 'unavailable'
    csrfToken = value.csrfToken
    return 'ok'
  } catch {
    return 'unavailable'
  }
}

export function adminMutationHeaders(): Record<string, string> {
  return csrfToken ? { 'X-Telephone-CSRF': csrfToken } : {}
}

export async function logoutAdmin() {
  try {
    const response = await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...adminMutationHeaders() },
    })
    if (!response.ok) return false
    csrfToken = ''
    return true
  } catch {
    return false
  }
}
