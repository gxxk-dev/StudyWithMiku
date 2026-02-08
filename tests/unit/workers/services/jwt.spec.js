/**
 * JWT 服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  isTokenBlacklisted,
  blacklistToken,
  cleanupBlacklist,
  extractBearerToken
} from '../../../../workers/services/jwt.js'
import { JWT_CONFIG, ERROR_CODES } from '../../../../workers/constants.js'
import { createMockD1 } from '../../../setup/fixtures/workerMocks.js'

describe('jwt.js', () => {
  const testSecret = 'test-jwt-secret-32-characters-long'
  let mockDB

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    mockDB = createMockD1()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateAccessToken', () => {
    it('应该生成有效的 Access Token', async () => {
      const result = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      expect(result.token).toBeDefined()
      expect(result.token.split('.')).toHaveLength(3)
      expect(result.jti).toBeDefined()
      expect(result.jti).toHaveLength(32) // 16 bytes = 32 hex chars
      expect(result.exp).toBeDefined()
    })

    it('应该包含正确的过期时间', async () => {
      const now = Math.floor(Date.now() / 1000)
      const result = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      expect(result.exp).toBe(now + JWT_CONFIG.ACCESS_TOKEN_TTL)
    })
  })

  describe('generateRefreshToken', () => {
    it('应该生成有效的 Refresh Token', async () => {
      const result = await generateRefreshToken({
        userId: 'user-123',
        secret: testSecret
      })

      expect(result.token).toBeDefined()
      expect(result.jti).toBeDefined()
      expect(result.exp).toBeDefined()
    })

    it('应该有更长的过期时间', async () => {
      const now = Math.floor(Date.now() / 1000)
      const result = await generateRefreshToken({
        userId: 'user-123',
        secret: testSecret
      })

      expect(result.exp).toBe(now + JWT_CONFIG.REFRESH_TOKEN_TTL)
    })
  })

  describe('generateTokenPair', () => {
    it('应该同时生成 Access 和 Refresh Token', async () => {
      const result = await generateTokenPair({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.accessJti).toBeDefined()
      expect(result.refreshJti).toBeDefined()
      expect(result.accessExp).toBeDefined()
      expect(result.refreshExp).toBeDefined()
    })

    it('两个 Token 应该有不同的 JTI', async () => {
      const result = await generateTokenPair({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      expect(result.accessJti).not.toBe(result.refreshJti)
    })
  })

  describe('verifyToken', () => {
    it('应该验证有效的 Access Token', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      const result = await verifyToken(token, testSecret, JWT_CONFIG.TOKEN_TYPE.ACCESS)

      expect(result.valid).toBe(true)
      expect(result.payload.sub).toBe('user-123')
      expect(result.payload.username).toBe('testuser')
      expect(result.payload.type).toBe(JWT_CONFIG.TOKEN_TYPE.ACCESS)
    })

    it('应该验证有效的 Refresh Token', async () => {
      const { token } = await generateRefreshToken({
        userId: 'user-123',
        secret: testSecret
      })

      const result = await verifyToken(token, testSecret, JWT_CONFIG.TOKEN_TYPE.REFRESH)

      expect(result.valid).toBe(true)
      expect(result.payload.sub).toBe('user-123')
      expect(result.payload.type).toBe(JWT_CONFIG.TOKEN_TYPE.REFRESH)
    })

    it('Token 类型不匹配时应该返回无效', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      const result = await verifyToken(token, testSecret, JWT_CONFIG.TOKEN_TYPE.REFRESH)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(ERROR_CODES.INVALID_TOKEN)
    })

    it('过期 Token 应该返回 TOKEN_EXPIRED', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      // 推进时间超过 Access Token 有效期
      vi.advanceTimersByTime((JWT_CONFIG.ACCESS_TOKEN_TTL + 60) * 1000)

      const result = await verifyToken(token, testSecret, JWT_CONFIG.TOKEN_TYPE.ACCESS)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(ERROR_CODES.TOKEN_EXPIRED)
    })

    it('无效签名应该返回 INVALID_TOKEN', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      const result = await verifyToken(token, 'wrong-secret-key-here', JWT_CONFIG.TOKEN_TYPE.ACCESS)

      expect(result.valid).toBe(false)
      expect(result.code).toBe(ERROR_CODES.INVALID_TOKEN)
    })

    it('畸形 Token 应该返回 INVALID_TOKEN', async () => {
      const result = await verifyToken(
        'not.a.valid.token',
        testSecret,
        JWT_CONFIG.TOKEN_TYPE.ACCESS
      )

      expect(result.valid).toBe(false)
      expect(result.code).toBe(ERROR_CODES.INVALID_TOKEN)
    })
  })

  describe('isTokenBlacklisted', () => {
    it('不在黑名单中的 Token 应该返回 false', async () => {
      const result = await isTokenBlacklisted(mockDB, 'non-existent-jti')
      expect(result).toBe(false)
    })

    it('在黑名单中的 Token 应该返回 true', async () => {
      // 先加入黑名单
      await mockDB
        .prepare('INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)')
        .bind('blacklisted-jti', Math.floor(Date.now() / 1000) + 3600)
        .run()

      const result = await isTokenBlacklisted(mockDB, 'blacklisted-jti')
      expect(result).toBe(true)
    })
  })

  describe('blacklistToken', () => {
    it('应该将 Token 加入黑名单', async () => {
      const jti = 'test-jti-001'
      const expiresAt = Math.floor(Date.now() / 1000) + 3600

      await blacklistToken(mockDB, jti, expiresAt)

      const isBlacklisted = await isTokenBlacklisted(mockDB, jti)
      expect(isBlacklisted).toBe(true)
    })

    it('重复加入应该不报错 (ON CONFLICT)', async () => {
      const jti = 'test-jti-002'
      const expiresAt = Math.floor(Date.now() / 1000) + 3600

      await blacklistToken(mockDB, jti, expiresAt)
      await expect(blacklistToken(mockDB, jti, expiresAt)).resolves.not.toThrow()
    })
  })

  describe('cleanupBlacklist', () => {
    it('应该清理过期的黑名单条目', async () => {
      const now = Math.floor(Date.now() / 1000)

      // 添加一个已过期的条目
      await mockDB
        .prepare('INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)')
        .bind('expired-jti', now - 3600)
        .run()

      // 添加一个未过期的条目
      await mockDB
        .prepare('INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)')
        .bind('valid-jti', now + 3600)
        .run()

      await cleanupBlacklist(mockDB)

      // 过期的应该被删除
      const expiredExists = await isTokenBlacklisted(mockDB, 'expired-jti')
      expect(expiredExists).toBe(false)

      // 未过期的应该保留
      const validExists = await isTokenBlacklisted(mockDB, 'valid-jti')
      expect(validExists).toBe(true)
    })
  })

  describe('extractBearerToken', () => {
    it('应该从 Bearer header 提取 Token', () => {
      const token = extractBearerToken('Bearer my-jwt-token')
      expect(token).toBe('my-jwt-token')
    })

    it('没有 Bearer 前缀应该返回 null', () => {
      const token = extractBearerToken('my-jwt-token')
      expect(token).toBeNull()
    })

    it('空 header 应该返回 null', () => {
      expect(extractBearerToken(null)).toBeNull()
      expect(extractBearerToken('')).toBeNull()
      expect(extractBearerToken(undefined)).toBeNull()
    })

    it('Basic auth 应该返回 null', () => {
      const token = extractBearerToken('Basic dXNlcjpwYXNz')
      expect(token).toBeNull()
    })
  })
})
