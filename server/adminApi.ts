import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'

const DEV_COOKIE_NAME = 'telephone-admin-session'
const SECURE_COOKIE_NAME = '__Host-telephone-admin'
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8'

interface SessionRecord {
  csrfToken: string
  expiresAt: number
}

interface FailureRecord {
  count: number
  resetAt: number
}

export interface AdminApiOptions {
  adminPassword: string
  storyDefinitionPath: string
  allowStoryWrites: boolean
  secureCookies: boolean
  trustLoopbackProxy?: boolean
  sessionTtlMs?: number
  failureWindowMs?: number
  maxFailures?: number
  now?: () => number
}

type NextFunction = (error?: unknown) => void

class RequestBodyTooLarge extends Error {}
class InvalidJsonBody extends Error {}

function json(response: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string | string[]> = {}) {
  response.statusCode = status
  response.setHeader('Content-Type', JSON_CONTENT_TYPE)
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Vary', 'Cookie')
  Object.entries(extraHeaders).forEach(([name, value]) => response.setHeader(name, value))
  response.end(JSON.stringify(body))
}

function parseCookies(request: IncomingMessage) {
  return Object.fromEntries((request.headers.cookie ?? '').split(';').flatMap((item) => {
    const separator = item.indexOf('=')
    if (separator < 1) return []
    return [[item.slice(0, separator).trim(), item.slice(separator + 1).trim()]]
  }))
}

function isLoopback(address: string | undefined) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function forwardedHeader(request: IncomingMessage, name: string) {
  const value = request.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function effectiveProtocol(request: IncomingMessage, trustLoopbackProxy: boolean) {
  if (trustLoopbackProxy && isLoopback(request.socket.remoteAddress)) {
    const forwarded = forwardedHeader(request, 'x-forwarded-proto') ?? forwardedHeader(request, 'x-scheme')
    if (forwarded) return forwarded.split(',')[0].trim().toLowerCase()
  }
  return (request.socket as typeof request.socket & { encrypted?: boolean }).encrypted ? 'https' : 'http'
}

function clientAddress(request: IncomingMessage, trustLoopbackProxy: boolean) {
  if (trustLoopbackProxy && isLoopback(request.socket.remoteAddress)) {
    const forwarded = forwardedHeader(request, 'x-real-ip') ?? forwardedHeader(request, 'x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim().slice(0, 128)
  }
  return (request.socket.remoteAddress ?? 'unknown').slice(0, 128)
}

function isSameOrigin(request: IncomingMessage, trustLoopbackProxy: boolean) {
  const origin = request.headers.origin
  const host = request.headers.host
  if (!origin || Array.isArray(origin) || !host) return false
  try {
    const expected = new URL(`${effectiveProtocol(request, trustLoopbackProxy)}://${host}`).origin
    return new URL(origin).origin === expected
  } catch {
    return false
  }
}

function readBody(request: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    request.on('data', (chunk: Buffer | string) => {
      if (settled) return
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += value.length
      if (size > limit) {
        settled = true
        reject(new RequestBodyTooLarge())
        return
      }
      chunks.push(value)
    })
    request.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
  })
}

async function readJson(request: IncomingMessage, limit: number): Promise<unknown> {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new InvalidJsonBody()
  try {
    return JSON.parse(await readBody(request, limit)) as unknown
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) throw error
    throw new InvalidJsonBody()
  }
}

function passwordDigest(value: string) {
  return createHash('sha256').update(value).digest()
}

function hasStoryShape(value: unknown): value is { format: string; nodes: unknown[]; edges: unknown[] } {
  if (!value || typeof value !== 'object') return false
  const story = value as { format?: unknown; nodes?: unknown; edges?: unknown }
  return story.format === 'graph-content' && Array.isArray(story.nodes) && Array.isArray(story.edges)
}

function cookieHeader(name: string, value: string, maxAgeSeconds: number, secure: boolean) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`
}

function expiredCookie(name: string, secure: boolean) {
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`
}

export function createAdminApiMiddleware(options: AdminApiOptions) {
  const now = options.now ?? Date.now
  const sessionTtlMs = options.sessionTtlMs ?? 8 * 60 * 60 * 1000
  const failureWindowMs = options.failureWindowMs ?? 15 * 60 * 1000
  const maxFailures = options.maxFailures ?? 5
  const trustLoopbackProxy = options.trustLoopbackProxy ?? false
  const cookieName = options.secureCookies ? SECURE_COOKIE_NAME : DEV_COOKIE_NAME
  const configuredDigest = options.adminPassword ? passwordDigest(options.adminPassword) : null
  const sessions = new Map<string, SessionRecord>()
  const failures = new Map<string, FailureRecord>()

  function prune(currentTime: number) {
    sessions.forEach((session, token) => {
      if (session.expiresAt <= currentTime) sessions.delete(token)
    })
    failures.forEach((failure, address) => {
      if (failure.resetAt <= currentTime) failures.delete(address)
    })
  }

  function sessionFor(request: IncomingMessage, currentTime: number) {
    const token = parseCookies(request)[cookieName]
    if (!token) return undefined
    const session = sessions.get(token)
    if (!session || session.expiresAt <= currentTime) {
      sessions.delete(token)
      return undefined
    }
    return { token, session }
  }

  function requireSession(request: IncomingMessage, response: ServerResponse, currentTime: number) {
    const authenticated = sessionFor(request, currentTime)
    if (!authenticated) json(response, 401, { error: 'Authentication required.' })
    return authenticated
  }

  function requireMutation(request: IncomingMessage, response: ServerResponse, currentTime: number) {
    const authenticated = requireSession(request, response, currentTime)
    if (!authenticated) return undefined
    if (!isSameOrigin(request, trustLoopbackProxy) || request.headers['x-telephone-csrf'] !== authenticated.session.csrfToken) {
      json(response, 403, { error: 'Request verification failed.' })
      return undefined
    }
    return authenticated
  }

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const pathname = new URL(request.url ?? '/', 'http://telephone.local').pathname
    const currentTime = now()
    prune(currentTime)

    if (pathname === '/api/admin/session' && request.method === 'GET') {
      const authenticated = sessionFor(request, currentTime)
      json(response, 200, {
        available: true,
        configured: Boolean(configuredDigest),
        authenticated: Boolean(authenticated),
        loginAllowed: !options.secureCookies || effectiveProtocol(request, trustLoopbackProxy) === 'https',
        ...(authenticated ? { csrfToken: authenticated.session.csrfToken } : {}),
      })
      return true
    }

    if (pathname === '/api/admin/login' && request.method === 'POST') {
      if (options.secureCookies && effectiveProtocol(request, trustLoopbackProxy) !== 'https') {
        json(response, 426, { error: 'HTTPS is required.' })
        return true
      }
      if (!isSameOrigin(request, trustLoopbackProxy)) {
        json(response, 403, { error: 'Request verification failed.' })
        return true
      }
      if (!configuredDigest) {
        json(response, 503, { error: 'Admin access is not configured.' })
        return true
      }
      const address = clientAddress(request, trustLoopbackProxy)
      const failure = failures.get(address)
      if (failure && failure.resetAt > currentTime && failure.count >= maxFailures) {
        const retryAfter = Math.max(1, Math.ceil((failure.resetAt - currentTime) / 1000))
        json(response, 429, { error: 'Too many attempts.' }, { 'Retry-After': String(retryAfter) })
        return true
      }
      const body = await readJson(request, 8 * 1024)
      const suppliedPassword = typeof body === 'object' && body && 'password' in body
        ? String((body as { password: unknown }).password)
        : ''
      const suppliedDigest = passwordDigest(suppliedPassword)
      if (!suppliedPassword || !timingSafeEqual(suppliedDigest, configuredDigest)) {
        const active = failure && failure.resetAt > currentTime ? failure : { count: 0, resetAt: currentTime + failureWindowMs }
        active.count += 1
        failures.set(address, active)
        json(response, 401, { error: 'Invalid credentials.' })
        return true
      }

      failures.delete(address)
      const token = randomBytes(32).toString('base64url')
      const csrfToken = randomBytes(32).toString('base64url')
      sessions.set(token, { csrfToken, expiresAt: currentTime + sessionTtlMs })
      json(response, 200, { authenticated: true, csrfToken }, {
        'Set-Cookie': cookieHeader(cookieName, token, Math.floor(sessionTtlMs / 1000), options.secureCookies),
      })
      return true
    }

    if (pathname === '/api/admin/logout' && request.method === 'POST') {
      const authenticated = requireMutation(request, response, currentTime)
      if (!authenticated) return true
      sessions.delete(authenticated.token)
      json(response, 200, { authenticated: false }, {
        'Set-Cookie': [expiredCookie(cookieName, options.secureCookies), expiredCookie(options.secureCookies ? DEV_COOKIE_NAME : SECURE_COOKIE_NAME, options.secureCookies)],
      })
      return true
    }

    if (pathname === '/api/story-definition' && request.method === 'GET') {
      if (!requireSession(request, response, currentTime)) return true
      response.statusCode = 200
      response.setHeader('Content-Type', JSON_CONTENT_TYPE)
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Vary', 'Cookie')
      response.end(await readFile(options.storyDefinitionPath, 'utf8'))
      return true
    }

    if (pathname === '/api/story-definition' && request.method === 'PUT') {
      if (!requireMutation(request, response, currentTime)) return true
      if (!options.allowStoryWrites) {
        json(response, 405, { error: 'Server-side story writes are disabled in preview.' })
        return true
      }
      const parsed = await readJson(request, 2 * 1024 * 1024)
      if (!hasStoryShape(parsed)) {
        json(response, 400, { error: 'Invalid Telephone graph document.' })
        return true
      }
      const temporaryPath = `${options.storyDefinitionPath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
      try {
        await writeFile(temporaryPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 })
        await rename(temporaryPath, options.storyDefinitionPath)
      } finally {
        await unlink(temporaryPath).catch(() => undefined)
      }
      json(response, 200, { ok: true })
      return true
    }

    if (pathname.startsWith('/api/admin/') || pathname === '/api/story-definition') {
      json(response, 405, { error: 'Method not allowed.' })
      return true
    }
    return false
  }

  return (request: IncomingMessage, response: ServerResponse, next: NextFunction) => {
    void handle(request, response).then((handled) => {
      if (!handled) next()
    }).catch((error: unknown) => {
      if (error instanceof RequestBodyTooLarge) json(response, 413, { error: 'Request body is too large.' })
      else if (error instanceof InvalidJsonBody) json(response, 400, { error: 'Invalid JSON request.' })
      else json(response, 500, { error: 'Server request failed.' })
    })
  }
}
