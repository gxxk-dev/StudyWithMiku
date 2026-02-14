import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ERROR_TYPES,
  registerOptions,
  registerVerify,
  loginOptions,
  loginVerify,
  oauthLogin,
  handleOAuthCallback,
  refreshToken,
  logout,
  getCurrentUser,
  getDevices,
  addDeviceOptions,
  addDeviceVerify,
  getAuthConfig,
  deleteDevice
} from '@/services/auth.js'

describe('auth service', () => {
  /** @type {ReturnType<typeof vi.fn>} */
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ── helpers ──────────────────────────────────────────────

  const jsonOk = (body) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body)
    })

  const jsonError = (status, body) =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve(body)
    })

  // ── registerOptions ──────────────────────────────────────

  describe('registerOptions', () => {
    it('sends POST with username and returns data', async () => {
      const payload = { challengeId: 'abc', options: {} }
      fetchMock.mockReturnValueOnce(jsonOk(payload))

      const result = await registerOptions('miku')

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain('/auth/register/options')
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body)).toEqual({ username: 'miku' })
      expect(result).toEqual(payload)
    })

    it('throws VALIDATION_ERROR when username is empty', async () => {
      await expect(registerOptions('')).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  // ── registerVerify ───────────────────────────────────────

  describe('registerVerify', () => {
    it('sends POST with challengeId, response, and deviceName', async () => {
      const payload = { success: true }
      fetchMock.mockReturnValueOnce(jsonOk(payload))

      const result = await registerVerify('cid', { data: 1 }, 'My Key')

      const [, opts] = fetchMock.mock.calls[0]
      const body = JSON.parse(opts.body)
      expect(body.challengeId).toBe('cid')
      expect(body.response).toEqual({ data: 1 })
      expect(body.deviceName).toBe('My Key')
      expect(result).toEqual(payload)
    })

    it('throws VALIDATION_ERROR when params are missing', async () => {
      await expect(registerVerify('', {}, 'name')).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
    })
  })

  // ── loginOptions ─────────────────────────────────────────

  describe('loginOptions', () => {
    it('sends POST with username', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ challengeId: 'x' }))

      await loginOptions('miku')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body).toEqual({ username: 'miku' })
    })

    it('throws VALIDATION_ERROR for empty username', async () => {
      await expect(loginOptions('')).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
    })
  })

  // ── loginVerify ──────────────────────────────────────────

  describe('loginVerify', () => {
    it('sends POST with challengeId and response', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ token: 'tok' }))

      const result = await loginVerify('cid', { sig: 'abc' })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.challengeId).toBe('cid')
      expect(body.response).toEqual({ sig: 'abc' })
      expect(result).toEqual({ token: 'tok' })
    })

    it('throws VALIDATION_ERROR when challengeId is missing', async () => {
      await expect(loginVerify('', {})).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
    })
  })

  // ── oauthLogin ───────────────────────────────────────────

  describe('oauthLogin', () => {
    let originalLocation

    beforeEach(() => {
      originalLocation = window.location
      delete window.location
      window.location = { href: 'http://localhost:3000' }
    })

    afterEach(() => {
      window.location = originalLocation
    })

    it('sets location.href to the provider OAuth URL', () => {
      oauthLogin('github')

      expect(window.location.href).toContain('/oauth/github')
    })

    it('saves return URL to sessionStorage', () => {
      oauthLogin('google')

      expect(sessionStorage.getItem('swm_oauth_return_url')).toBe('http://localhost:3000')
    })

    it('throws VALIDATION_ERROR for unsupported provider', () => {
      expect(() => oauthLogin('twitter')).toThrow()
    })
  })

  // ── handleOAuthCallback ──────────────────────────────────

  describe('handleOAuthCallback', () => {
    let originalLocation

    beforeEach(() => {
      originalLocation = window.location
      delete window.location
      window.location = { hash: '', href: '' }
    })

    afterEach(() => {
      window.location = originalLocation
    })

    it('parses tokens and user from location hash (refresh token via HttpOnly Cookie)', () => {
      window.location.hash =
        '#access_token=at&expires_in=3600&user=' +
        encodeURIComponent(JSON.stringify({ id: '1', displayName: 'miku' }))
      window.location.pathname = '/callback'
      window.history = { replaceState: vi.fn() }

      const result = handleOAuthCallback()

      expect(result.tokens.accessToken).toBe('at')
      expect(result.tokens.expiresIn).toBe(3600)
      expect(result.user.displayName).toBe('miku')
    })

    it('returns null when hash has no tokens', () => {
      window.location.hash = ''

      const result = handleOAuthCallback()

      expect(result).toBeNull()
    })

    it('throws on error param in hash', () => {
      window.location.hash = '#error=access_denied'

      expect(() => handleOAuthCallback()).toThrow()
    })
  })

  // ── refreshToken ─────────────────────────────────────────

  describe('refreshToken', () => {
    it('sends POST with credentials: include (cookie-based refresh)', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ accessToken: 'new' }))

      const result = await refreshToken()

      const [, opts] = fetchMock.mock.calls[0]
      expect(opts.method).toBe('POST')
      expect(opts.credentials).toBe('include')
      expect(opts.body).toBeUndefined()
      expect(result.accessToken).toBe('new')
    })
  })

  // ── logout ───────────────────────────────────────────────

  describe('logout', () => {
    it('sends POST with Bearer token and credentials: include', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ success: true }))

      await logout('at123')

      const [, opts] = fetchMock.mock.calls[0]
      expect(opts.headers.Authorization).toBe('Bearer at123')
      expect(opts.credentials).toBe('include')
    })
  })

  // ── getCurrentUser ───────────────────────────────────────

  describe('getCurrentUser', () => {
    it('sends GET with Bearer token to /auth/me', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ id: '1', name: 'miku' }))

      const result = await getCurrentUser('at')

      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain('/auth/me')
      expect(opts.headers.Authorization).toBe('Bearer at')
      expect(result.name).toBe('miku')
    })
  })

  // ── getDevices / deleteDevice ────────────────────────────

  describe('getDevices', () => {
    it('sends GET with Bearer token to /auth/devices', async () => {
      fetchMock.mockReturnValueOnce(jsonOk([{ id: 'd1' }]))

      const result = await getDevices('at')

      expect(fetchMock.mock.calls[0][0]).toContain('/auth/devices')
      expect(result).toEqual([{ id: 'd1' }])
    })
  })

  describe('deleteDevice', () => {
    it('sends DELETE with credential id in URL', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ success: true }))

      await deleteDevice('at', 'cred-42')

      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain('/auth/devices/cred-42')
      expect(opts.method).toBe('DELETE')
    })
  })

  // ── addDeviceOptions / addDeviceVerify ───────────────────

  describe('addDeviceOptions', () => {
    it('sends POST with Bearer token', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ challengeId: 'c' }))

      await addDeviceOptions('at')

      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain('/auth/devices/add/options')
      expect(opts.headers.Authorization).toBe('Bearer at')
    })
  })

  describe('addDeviceVerify', () => {
    it('sends POST with challengeId, response, deviceName', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ success: true }))

      await addDeviceVerify('at', 'cid', { sig: 1 }, 'Key')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.challengeId).toBe('cid')
      expect(body.deviceName).toBe('Key')
    })
  })

  // ── getAuthConfig ────────────────────────────────────────

  describe('getAuthConfig', () => {
    it('sends GET to /auth/config', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ webauthn: true }))

      const result = await getAuthConfig()

      expect(fetchMock.mock.calls[0][0]).toContain('/auth/config')
      expect(result.webauthn).toBe(true)
    })
  })

  // ── fetchWithRetry / error handling ──────────────────────

  describe('fetchWithRetry error handling', () => {
    it('throws TOKEN_EXPIRED on 401 response', async () => {
      fetchMock.mockReturnValueOnce(jsonError(401, { message: 'expired' }))

      await expect(getCurrentUser('at')).rejects.toMatchObject({
        type: ERROR_TYPES.TOKEN_EXPIRED
      })
    })

    it('throws AUTH_ERROR on non-401 error response', async () => {
      fetchMock.mockReturnValueOnce(jsonError(500, { message: 'server error' }))

      await expect(getCurrentUser('at')).rejects.toMatchObject({
        type: ERROR_TYPES.AUTH_ERROR
      })
    })

    it('retries on network TypeError and eventually succeeds', async () => {
      vi.useFakeTimers()

      fetchMock
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockReturnValueOnce(jsonOk({ id: '1' }))

      const promise = getCurrentUser('at')
      await vi.advanceTimersByTimeAsync(1500)

      const result = await promise
      expect(result.id).toBe('1')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('throws NETWORK_ERROR after all retries exhausted', async () => {
      vi.useFakeTimers()

      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

      const error = getCurrentUser('at').catch((e) => e)

      await vi.runAllTimersAsync()

      await expect(error).resolves.toMatchObject({
        type: ERROR_TYPES.NETWORK_ERROR
      })
    })

    it('wraps unknown errors in NETWORK_ERROR', async () => {
      fetchMock.mockRejectedValueOnce(new Error('something weird'))

      await expect(getCurrentUser('at')).rejects.toMatchObject({
        type: ERROR_TYPES.NETWORK_ERROR
      })
    })
  })
})
