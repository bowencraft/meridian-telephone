import { describe, expect, it } from 'vitest'
import { matchesAdminPassword, sha256Hex } from './adminAuth'

const HELLO_SHA256 = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'

describe('admin access key', () => {
  it('creates a stable SHA-256 digest without exposing the source value', async () => {
    expect(await sha256Hex('hello')).toBe(HELLO_SHA256)
  })

  it('accepts only an exact password match', async () => {
    expect(await matchesAdminPassword('hello', HELLO_SHA256)).toBe(true)
    expect(await matchesAdminPassword('Hello', HELLO_SHA256)).toBe(false)
    expect(await matchesAdminPassword('', HELLO_SHA256)).toBe(false)
  })
})
