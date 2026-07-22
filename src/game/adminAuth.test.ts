import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminMutationHeaders, checkAdminSession, loginAdmin, logoutAdmin } from './adminAuth'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('admin browser session client', () => {
  it('accepts only a server-issued session and keeps its CSRF token in memory', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      available: true,
      configured: true,
      authenticated: true,
      loginAllowed: true,
      csrfToken: 'server-csrf-token',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await checkAdminSession()).toEqual({ available: true, configured: true, authenticated: true, loginAllowed: true })
    expect(adminMutationHeaders()).toEqual({ 'X-Telephone-CSRF': 'server-csrf-token' })
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/session', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('maps server responses without performing browser-side password hashing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, csrfToken: 'csrf' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await loginAdmin('wrong')).toBe('invalid')
    expect(await loginAdmin('still-wrong')).toBe('rate-limited')
    expect(await loginAdmin('server-checks-this')).toBe('ok')
  })

  it('clears the in-memory CSRF token after server logout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await logoutAdmin()).toBe(true)
    expect(adminMutationHeaders()).toEqual({})
  })

  it('keeps the current session state when the server does not confirm logout', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        available: true,
        configured: true,
        authenticated: true,
        loginAllowed: true,
        csrfToken: 'still-active',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await checkAdminSession()
    expect(await logoutAdmin()).toBe(false)
    expect(adminMutationHeaders()).toEqual({ 'X-Telephone-CSRF': 'still-active' })
    expect(await logoutAdmin()).toBe(true)
  })
})
