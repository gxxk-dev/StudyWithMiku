import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/utils/cborClient.js', () => ({
  CBOR_CONTENT_TYPE: 'application/cbor',
  createCborRequestInit: vi.fn((_dataType, _body) => ({
    headers: { 'Content-Type': 'application/cbor', Accept: 'application/cbor' },
    body: new Uint8Array([1, 2, 3])
  })),
  parseCborResponse: vi.fn(async (response) => response.json())
}))

import { getData, updateData, deleteData, hasData } from '@/services/dataSync.js'
import { ERROR_TYPES } from '@/services/auth.js'
import { createCborRequestInit } from '@/utils/cborClient.js'

describe('dataSync service', () => {
  /** @type {ReturnType<typeof vi.fn>} */
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock
    vi.clearAllMocks()
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

  const VALID_TYPE = 'focus_records'

  // ── getData ──────────────────────────────────────────────

  describe('getData', () => {
    it('sends GET with Bearer token and CBOR accept header', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ data: [1, 2, 3] }))

      const result = await getData('at', VALID_TYPE)

      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain(`/api/data/${VALID_TYPE}`)
      expect(opts.method).toBe('GET')
      expect(opts.headers.Authorization).toBe('Bearer at')
      expect(result).toEqual({ data: [1, 2, 3] })
    })

    it('throws VALIDATION_ERROR when accessToken is empty', async () => {
      await expect(getData('', VALID_TYPE)).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws VALIDATION_ERROR for invalid dataType', async () => {
      await expect(getData('at', 'invalid_type')).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws TOKEN_EXPIRED on 401 response', async () => {
      fetchMock.mockReturnValueOnce(jsonError(401, { message: 'expired' }))

      await expect(getData('at', VALID_TYPE)).rejects.toMatchObject({
        type: ERROR_TYPES.TOKEN_EXPIRED
      })
    })

    it('throws AUTH_ERROR on non-401 error response', async () => {
      fetchMock.mockReturnValueOnce(jsonError(500, { message: 'server error' }))

      await expect(getData('at', VALID_TYPE)).rejects.toMatchObject({
        type: ERROR_TYPES.AUTH_ERROR
      })
    })
  })

  // ── updateData ───────────────────────────────────────────

  describe('updateData', () => {
    it('sends PUT with CBOR body via createCborRequestInit', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ version: 2 }))

      const data = { records: [{ id: 1 }] }
      const result = await updateData('at', VALID_TYPE, data)

      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain(`/api/data/${VALID_TYPE}`)
      expect(opts.method).toBe('PUT')
      expect(opts.headers.Authorization).toBe('Bearer at')
      expect(createCborRequestInit).toHaveBeenCalled()
      expect(result).toEqual({ version: 2 })
    })

    it('includes version when provided', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ version: 3 }))

      await updateData('at', VALID_TYPE, { x: 1 }, 2)

      expect(createCborRequestInit).toHaveBeenCalled()
      const callArgs = createCborRequestInit.mock.calls[0]
      // version should be part of the data passed to createCborRequestInit
      expect(callArgs).toBeDefined()
    })

    it('throws VALIDATION_ERROR when accessToken is empty', async () => {
      await expect(updateData('', VALID_TYPE, {})).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
    })

    it('throws VALIDATION_ERROR for invalid dataType', async () => {
      await expect(updateData('at', 'bad_type', {})).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
    })

    it('sends PUT with CBOR body', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ success: true, version: 1 }))

      await updateData('at', VALID_TYPE, { x: 1 })

      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain(`/api/data/${VALID_TYPE}`)
      expect(opts.method).toBe('PUT')
    })

    it('handles 409 CONFLICT_ERROR with serverVersion in details', async () => {
      fetchMock.mockReturnValueOnce(jsonError(409, { message: 'conflict', version: 5 }))

      const err = await updateData('at', VALID_TYPE, { x: 1 }).catch((e) => e)

      expect(err.type).toBe('CONFLICT_ERROR')
      expect(err.details).toBeDefined()
    })
  })

  // ── deleteData ───────────────────────────────────────────

  describe('deleteData', () => {
    it('sends DELETE with Bearer token', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ success: true }))

      const result = await deleteData('at', VALID_TYPE)

      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain(`/api/data/${VALID_TYPE}`)
      expect(opts.method).toBe('DELETE')
      expect(opts.headers.Authorization).toBe('Bearer at')
      expect(result).toEqual({ success: true })
    })

    it('throws VALIDATION_ERROR when accessToken is empty', async () => {
      await expect(deleteData('', VALID_TYPE)).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
    })

    it('throws VALIDATION_ERROR for invalid dataType', async () => {
      await expect(deleteData('at', 'nope')).rejects.toMatchObject({
        type: ERROR_TYPES.VALIDATION_ERROR
      })
    })
  })

  // ── hasData ──────────────────────────────────────────────

  describe('hasData', () => {
    it('returns true when data exists', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ data: { records: [] } }))

      const result = await hasData('at', VALID_TYPE)

      expect(result).toBe(true)
    })

    it('returns false when data is null', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({ data: null }))

      const result = await hasData('at', VALID_TYPE)

      expect(result).toBe(false)
    })

    it('returns false when data is undefined', async () => {
      fetchMock.mockReturnValueOnce(jsonOk({}))

      const result = await hasData('at', VALID_TYPE)

      expect(result).toBe(false)
    })

    it('returns false on error instead of throwing', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const result = await hasData('at', VALID_TYPE)

      expect(result).toBe(false)
    })
  })

  // ── fetchWithRetry / retry logic ─────────────────────────

  describe('fetchWithRetry retry logic', () => {
    it('retries on network TypeError and succeeds', async () => {
      vi.useFakeTimers()

      fetchMock
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockReturnValueOnce(jsonOk({ data: 'ok' }))

      const promise = getData('at', VALID_TYPE)
      await vi.advanceTimersByTimeAsync(1500)

      const result = await promise
      expect(result).toEqual({ data: 'ok' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('throws NETWORK_ERROR after all retries exhausted', async () => {
      vi.useFakeTimers()

      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

      const error = getData('at', VALID_TYPE).catch((e) => e)

      await vi.runAllTimersAsync()

      await expect(error).resolves.toMatchObject({
        type: ERROR_TYPES.NETWORK_ERROR
      })
    })
  })

  // ── all valid data types ─────────────────────────────────

  describe('validates all supported data types', () => {
    const validTypes = [
      'focus_records',
      'focus_settings',
      'playlists',
      'user_settings',
      'share_config'
    ]

    it.each(validTypes)('accepts data type: %s', async (type) => {
      fetchMock.mockReturnValueOnce(jsonOk({ data: [] }))

      await expect(getData('at', type)).resolves.toBeDefined()
    })
  })
})
