import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import { createAdminApiMiddleware, type AdminApiOptions } from './adminApi'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

interface InvokeOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

interface CapturedResponse {
  status: number
  headers: Record<string, string | string[]>
  text: string
  json: () => unknown
}

async function fixture(overrides: Partial<AdminApiOptions> = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'telephone-admin-api-'))
  temporaryDirectories.push(directory)
  const storyDefinitionPath = path.join(directory, 'telephone.rules.json')
  await writeFile(storyDefinitionPath, `${JSON.stringify({ format: 'graph-content', nodes: [], edges: [] })}\n`)
  const middleware = createAdminApiMiddleware({
    adminPassword: 'correct horse battery staple',
    storyDefinitionPath,
    allowStoryWrites: true,
    secureCookies: false,
    ...overrides,
  })

  function invoke(options: InvokeOptions) {
    return new Promise<CapturedResponse>((resolve, reject) => {
      const request = Readable.from(options.body ? [Buffer.from(options.body)] : []) as IncomingMessage
      Object.assign(request, {
        url: options.url,
        method: options.method ?? 'GET',
        headers: Object.fromEntries(Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value])),
        socket: { remoteAddress: '127.0.0.1', encrypted: false },
      })
      const responseHeaders: Record<string, string | string[]> = {}
      const response = {
        statusCode: 200,
        setHeader(name: string, value: string | string[]) { responseHeaders[name.toLowerCase()] = value; return this },
        end(value?: string | Buffer) {
          const text = value ? value.toString() : ''
          resolve({
            status: response.statusCode,
            headers: responseHeaders,
            text,
            json: () => JSON.parse(text) as unknown,
          })
          return this
        },
      } as unknown as ServerResponse
      try {
        middleware(request, response, (error) => {
          if (error) reject(error)
          else resolve({ status: 404, headers: responseHeaders, text: '', json: () => undefined })
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  return { invoke, storyDefinitionPath }
}

function login(invoke: Awaited<ReturnType<typeof fixture>>['invoke'], password = 'correct horse battery staple', headers: Record<string, string> = {}) {
  return invoke({
    url: '/api/admin/login',
    method: 'POST',
    headers: { Host: 'telephone.test', Origin: 'http://telephone.test', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ password }),
  })
}

describe('server-side admin API', () => {
  it('keeps credentials on the server and rate-limits repeated failures', async () => {
    const { invoke } = await fixture({ maxFailures: 2, failureWindowMs: 60_000 })
    expect((await login(invoke, 'wrong-1')).status).toBe(401)
    expect((await login(invoke, 'wrong-2')).status).toBe(401)
    const limited = await login(invoke)
    expect(limited.status).toBe(429)
    expect(limited.headers['retry-after']).toBeTruthy()
    expect(limited.headers['set-cookie']).toBeUndefined()
  })

  it('uses an HttpOnly session and CSRF token for protected story access', async () => {
    const { invoke, storyDefinitionPath } = await fixture()
    expect((await invoke({ url: '/api/story-definition' })).status).toBe(401)

    const accepted = await login(invoke)
    expect(accepted.status).toBe(200)
    const cookie = accepted.headers['set-cookie'] as string
    expect(cookie).toContain('telephone-admin-session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).not.toContain('Secure')
    const loginBody = accepted.json() as { csrfToken: string }

    const session = await invoke({ url: '/api/admin/session', headers: { Cookie: cookie } })
    expect(session.json()).toMatchObject({ configured: true, authenticated: true, csrfToken: loginBody.csrfToken })

    const replacement = { format: 'graph-content', nodes: [{ id: 'entry' }], edges: [] }
    const missingCsrf = await invoke({
      url: '/api/story-definition',
      method: 'PUT',
      headers: { Cookie: cookie, Host: 'telephone.test', Origin: 'http://telephone.test', 'Content-Type': 'application/json' },
      body: JSON.stringify(replacement),
    })
    expect(missingCsrf.status).toBe(403)

    const saved = await invoke({
      url: '/api/story-definition',
      method: 'PUT',
      headers: {
        Cookie: cookie,
        Host: 'telephone.test',
        Origin: 'http://telephone.test',
        'Content-Type': 'application/json',
        'X-Telephone-CSRF': loginBody.csrfToken,
      },
      body: JSON.stringify(replacement),
    })
    expect(saved.status).toBe(200)
    expect(JSON.parse(await readFile(storyDefinitionPath, 'utf8'))).toEqual(replacement)

    const loggedOut = await invoke({
      url: '/api/admin/logout',
      method: 'POST',
      headers: { Cookie: cookie, Host: 'telephone.test', Origin: 'http://telephone.test', 'X-Telephone-CSRF': loginBody.csrfToken },
    })
    expect(loggedOut.status).toBe(200)
    const afterLogout = await invoke({ url: '/api/admin/session', headers: { Cookie: cookie } })
    expect(afterLogout.json()).toMatchObject({ authenticated: false })
  })

  it('rejects cross-origin mutations and oversized bodies', async () => {
    const { invoke } = await fixture()
    const crossOrigin = await login(invoke, undefined, { Origin: 'https://attacker.invalid' })
    expect(crossOrigin.status).toBe(403)
    const oversized = await login(invoke, 'x'.repeat(9 * 1024))
    expect(oversized.status).toBe(413)
  })

  it('requires forwarded HTTPS and sets a Secure __Host cookie in preview mode', async () => {
    const { invoke } = await fixture({ secureCookies: true, trustLoopbackProxy: true, allowStoryWrites: false })
    const insecureSession = await invoke({ url: '/api/admin/session', headers: { Host: 'telephone.test', 'X-Scheme': 'http' } })
    expect(insecureSession.json()).toMatchObject({ loginAllowed: false })
    expect((await login(invoke, undefined, { 'X-Scheme': 'http' })).status).toBe(426)

    const accepted = await login(invoke, undefined, { Origin: 'https://telephone.test', 'X-Scheme': 'https' })
    expect(accepted.status).toBe(200)
    expect(accepted.headers['set-cookie']).toMatch(/^__Host-telephone-admin=.*HttpOnly.*SameSite=Strict.*Secure/)
    const cookie = accepted.headers['set-cookie'] as string
    const body = accepted.json() as { csrfToken: string }
    const write = await invoke({
      url: '/api/story-definition',
      method: 'PUT',
      headers: {
        Cookie: cookie,
        Host: 'telephone.test',
        Origin: 'https://telephone.test',
        'X-Scheme': 'https',
        'Content-Type': 'application/json',
        'X-Telephone-CSRF': body.csrfToken,
      },
      body: JSON.stringify({ format: 'graph-content', nodes: [], edges: [] }),
    })
    expect(write.status).toBe(405)
  })
})
