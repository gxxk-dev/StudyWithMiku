import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { sampleUsersCamelCase } from '../../setup/fixtures/authData.js'

const TEST_USER = sampleUsersCamelCase[0]

describe('authStorage', () => {
  let authStorage

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
    const mod = await import('../../../src/utils/authStorage.js')
    authStorage = mod
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- saveTokens / getters ---
  describe('saveTokens', () => {
    it('should save token fields (access token in memory, expiresAt and tokenType to localStorage)', () => {
      authStorage.saveTokens('access-abc', 3600)
      expect(authStorage.getAccessToken()).toBe('access-abc')
      expect(localStorage.getItem('swm_token_type')).toBe('Bearer')
      expect(localStorage.getItem('swm_token_expires_at')).toBeDefined()
    })

    it('should compute expiresAt as Date.now() + expiresIn * 1000', () => {
      const now = Date.now()
      authStorage.saveTokens('a', 3600)
      const stored = Number(localStorage.getItem('swm_token_expires_at'))
      expect(stored).toBe(now + 3600 * 1000)
    })

    it('should accept a custom tokenType', () => {
      authStorage.saveTokens('a', 3600, 'DPoP')
      expect(localStorage.getItem('swm_token_type')).toBe('DPoP')
    })

    it('should default tokenType to Bearer', () => {
      authStorage.saveTokens('a', 3600)
      expect(authStorage.getTokenType()).toBe('Bearer')
    })
  })

  describe('getAccessToken', () => {
    it('should return the saved access token from memory', () => {
      authStorage.saveTokens('my-access', 1800)
      expect(authStorage.getAccessToken()).toBe('my-access')
    })

    it('should return null when no token is saved', () => {
      expect(authStorage.getAccessToken()).toBeNull()
    })
  })

  describe('getTokenType', () => {
    it('should return the saved token type', () => {
      authStorage.saveTokens('a', 1800, 'MAC')
      expect(authStorage.getTokenType()).toBe('MAC')
    })
  })

  describe('getTokenExpiresAt', () => {
    it('should return the numeric expiration timestamp', () => {
      const now = Date.now()
      authStorage.saveTokens('a', 7200)
      expect(authStorage.getTokenExpiresAt()).toBe(now + 7200 * 1000)
    })

    it('should return null when no expiration is stored', () => {
      expect(authStorage.getTokenExpiresAt()).toBeNull()
    })
  })

  // --- isTokenExpiringSoon ---
  describe('isTokenExpiringSoon', () => {
    it('should return false when token is far from expiring', () => {
      authStorage.saveTokens('a', 3600) // expires in 1 hour
      expect(authStorage.isTokenExpiringSoon(60)).toBe(false)
    })

    it('should return true when token expires within threshold', () => {
      authStorage.saveTokens('a', 30) // expires in 30 seconds
      expect(authStorage.isTokenExpiringSoon(60)).toBe(true)
    })

    it('should return true when token is exactly at threshold boundary', () => {
      authStorage.saveTokens('a', 60) // expires in exactly 60 seconds
      expect(authStorage.isTokenExpiringSoon(60)).toBe(true)
    })

    it('should return true when no expiresAt is stored', () => {
      expect(authStorage.isTokenExpiringSoon()).toBe(true)
    })

    it('should use default threshold of 60 seconds', () => {
      authStorage.saveTokens('a', 59)
      expect(authStorage.isTokenExpiringSoon()).toBe(true)
    })

    it('should support custom threshold values', () => {
      authStorage.saveTokens('a', 120) // expires in 120s
      expect(authStorage.isTokenExpiringSoon(300)).toBe(true) // 300s threshold → expiring soon
      expect(authStorage.isTokenExpiringSoon(60)).toBe(false) // 60s threshold → not yet
    })

    it('should return true when token is already expired', () => {
      authStorage.saveTokens('a', 10)
      vi.advanceTimersByTime(20 * 1000)
      expect(authStorage.isTokenExpiringSoon()).toBe(true)
    })
  })

  // --- isTokenExpired ---
  describe('isTokenExpired', () => {
    it('should return false when token is still valid', () => {
      authStorage.saveTokens('a', 3600)
      expect(authStorage.isTokenExpired()).toBe(false)
    })

    it('should return true when token has expired', () => {
      authStorage.saveTokens('a', 3600)
      vi.advanceTimersByTime(3600 * 1000) // advance to exact expiry
      expect(authStorage.isTokenExpired()).toBe(true)
    })

    it('should return true when token is past expiry', () => {
      authStorage.saveTokens('a', 100)
      vi.advanceTimersByTime(200 * 1000)
      expect(authStorage.isTokenExpired()).toBe(true)
    })

    it('should return true when no expiresAt is stored', () => {
      expect(authStorage.isTokenExpired()).toBe(true)
    })
  })

  // --- getTokens ---
  describe('getTokens', () => {
    it('should return token fields when all are present', () => {
      const now = Date.now()
      authStorage.saveTokens('access-1', 3600, 'Bearer')
      const tokens = authStorage.getTokens()
      expect(tokens).toEqual({
        accessToken: 'access-1',
        expiresAt: now + 3600 * 1000,
        tokenType: 'Bearer'
      })
    })

    it('should return null when accessToken is missing (memory cleared)', () => {
      // Without calling saveTokens, memory access token is null
      localStorage.setItem('swm_token_expires_at', String(Date.now() + 60000))
      expect(authStorage.getTokens()).toBeNull()
    })

    it('should return null when expiresAt is missing', () => {
      authStorage.saveTokens('a', 3600)
      localStorage.removeItem('swm_token_expires_at')
      expect(authStorage.getTokens()).toBeNull()
    })
  })

  // --- clearTokens ---
  describe('clearTokens', () => {
    it('should clear memory access token and localStorage token keys', () => {
      authStorage.saveTokens('a', 3600, 'Bearer')
      authStorage.clearTokens()
      expect(authStorage.getAccessToken()).toBeNull()
      expect(localStorage.getItem('swm_token_expires_at')).toBeNull()
      expect(localStorage.getItem('swm_token_type')).toBeNull()
    })
  })

  // --- user storage ---
  describe('saveUser / getUser / clearUser', () => {
    it('should save and retrieve a user object as JSON', () => {
      authStorage.saveUser(TEST_USER)
      expect(authStorage.getUser()).toEqual(TEST_USER)
    })

    it('should return undefined when no user is saved', () => {
      expect(authStorage.getUser()).toBeUndefined()
    })

    it('should clear the user from localStorage', () => {
      authStorage.saveUser(TEST_USER)
      authStorage.clearUser()
      expect(authStorage.getUser()).toBeUndefined()
      expect(localStorage.getItem('swm_user_info')).toBeNull()
    })
  })

  // --- device ID storage ---
  describe('saveDeviceId / getDeviceId / clearDeviceId', () => {
    it('should save and retrieve a device ID', () => {
      authStorage.saveDeviceId('device-abc-123')
      expect(authStorage.getDeviceId()).toBe('device-abc-123')
    })

    it('should return null when no device ID is saved', () => {
      expect(authStorage.getDeviceId()).toBeNull()
    })

    it('should clear the device ID from localStorage', () => {
      authStorage.saveDeviceId('device-abc-123')
      authStorage.clearDeviceId()
      expect(authStorage.getDeviceId()).toBeNull()
      expect(localStorage.getItem('swm_device_id')).toBeNull()
    })
  })

  // --- clearAllAuthData ---
  describe('clearAllAuthData', () => {
    it('should clear tokens, user, and device ID', () => {
      authStorage.saveTokens('a', 3600)
      authStorage.saveUser(TEST_USER)
      authStorage.saveDeviceId('dev-1')
      authStorage.clearAllAuthData()
      expect(authStorage.getAccessToken()).toBeNull()
      expect(authStorage.getTokenExpiresAt()).toBeNull()
      expect(authStorage.getUser()).toBeUndefined()
      expect(authStorage.getDeviceId()).toBeNull()
    })

    it('should not throw when nothing is stored', () => {
      expect(() => authStorage.clearAllAuthData()).not.toThrow()
    })
  })

  // --- hasValidAuth ---
  describe('hasValidAuth', () => {
    it('should return true when memory access token and user exist and token is not expired', () => {
      authStorage.saveTokens('a', 3600)
      authStorage.saveUser(TEST_USER)
      expect(authStorage.hasValidAuth()).toBe(true)
    })

    it('should return false when access token is missing (not in memory)', () => {
      authStorage.saveUser(TEST_USER)
      expect(authStorage.hasValidAuth()).toBe(false)
    })

    it('should return false when user is missing', () => {
      authStorage.saveTokens('a', 3600)
      expect(authStorage.hasValidAuth()).toBe(false)
    })

    it('should return false when token is expired', () => {
      authStorage.saveTokens('a', 100)
      authStorage.saveUser(TEST_USER)
      vi.advanceTimersByTime(100 * 1000)
      expect(authStorage.hasValidAuth()).toBe(false)
    })
  })

  // --- cleanupLegacyKeys ---
  describe('cleanupLegacyKeys', () => {
    it('should remove legacy localStorage keys', () => {
      localStorage.setItem('swm_access_token', 'old-at')
      localStorage.setItem('swm_refresh_token', 'old-rt')
      authStorage.cleanupLegacyKeys()
      expect(localStorage.getItem('swm_access_token')).toBeNull()
      expect(localStorage.getItem('swm_refresh_token')).toBeNull()
    })
  })
})
