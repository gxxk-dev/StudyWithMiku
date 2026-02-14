/**
 * 中间件测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit } from '../../../../workers/middleware/rateLimit.js'
import { requireAuth, optionalAuth } from '../../../../workers/middleware/auth.js'
import { securityHeaders } from '../../../../workers/middleware/securityHeaders.js'
import { ERROR_CODES } from '../../../../workers/constants.js'
import { createMockContext, createMockEnv } from '../../../setup/fixtures/workerMocks.js'
import { generateAccessToken } from '../../../../workers/services/jwt.js'

describe('middleware', () => {
  describe('rateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该允许正常请求通过', async () => {
      const middleware = rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'test' })
      const c = createMockContext({
        headers: { 'CF-Connecting-IP': '1.2.3.4' }
      })
      const next = vi.fn()

      await middleware(c, next)

      expect(next).toHaveBeenCalled()
    })

    it('超过限制应该返回 429', async () => {
      const env = createMockEnv()
      const middleware = rateLimit({ windowMs: 60000, max: 2, keyPrefix: 'limit-test' })
      const next = vi.fn()

      // 发送多个请求
      for (let i = 0; i < 3; i++) {
        const c = createMockContext({
          env,
          headers: { 'CF-Connecting-IP': '1.2.3.4' }
        })
        const result = await middleware(c, next)

        if (i < 2) {
          expect(next).toHaveBeenCalledTimes(i + 1)
        } else {
          // 第三个请求应该被拒绝
          expect(result.status).toBe(429)
          const body = await result.json()
          expect(body.code).toBe(ERROR_CODES.RATE_LIMITED)
        }
      }
    })

    it('时间窗口过后应该重置计数', async () => {
      const env = createMockEnv()
      const middleware = rateLimit({ windowMs: 1000, max: 1, keyPrefix: 'reset-test' })

      const c1 = createMockContext({
        env,
        headers: { 'CF-Connecting-IP': '5.6.7.8' }
      })
      await middleware(c1, vi.fn())

      // 第二个请求应该被拒绝
      const c2 = createMockContext({
        env,
        headers: { 'CF-Connecting-IP': '5.6.7.8' }
      })
      const result2 = await middleware(c2, vi.fn())
      expect(result2.status).toBe(429)

      // 推进时间超过窗口
      vi.advanceTimersByTime(1500)

      // 新请求应该被允许
      const c3 = createMockContext({
        env,
        headers: { 'CF-Connecting-IP': '5.6.7.8' }
      })
      const next3 = vi.fn()
      await middleware(c3, next3)
      expect(next3).toHaveBeenCalled()
    })

    it('不同 IP 应该独立计数', async () => {
      const env = createMockEnv()
      const middleware = rateLimit({ windowMs: 60000, max: 1, keyPrefix: 'ip-test' })

      const c1 = createMockContext({
        env,
        headers: { 'CF-Connecting-IP': '1.1.1.1' }
      })
      const c2 = createMockContext({
        env,
        headers: { 'CF-Connecting-IP': '2.2.2.2' }
      })

      const next1 = vi.fn()
      const next2 = vi.fn()

      await middleware(c1, next1)
      await middleware(c2, next2)

      expect(next1).toHaveBeenCalled()
      expect(next2).toHaveBeenCalled()
    })

    it('应该添加 RateLimit 响应头', async () => {
      const env = createMockEnv()
      const middleware = rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'header-test' })
      const c = createMockContext({
        env,
        headers: { 'CF-Connecting-IP': '3.3.3.3' }
      })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.res.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(c.res.headers.get('X-RateLimit-Remaining')).toBe('9')
      expect(c.res.headers.get('X-RateLimit-Reset')).toBeDefined()
    })
  })

  describe('requireAuth', () => {
    const testSecret = 'test-jwt-secret-32-characters-long'

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('有效 Token 应该允许通过并设置 user', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      const env = createMockEnv({ JWT_SECRET: testSecret })
      const c = createMockContext({
        env,
        headers: { Authorization: `Bearer ${token}` }
      })
      const next = vi.fn()

      const middleware = requireAuth()
      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.get('user')).toMatchObject({
        id: 'user-123',
        username: 'testuser'
      })
    })

    it('没有 Authorization header 应该返回 401', async () => {
      const env = createMockEnv({ JWT_SECRET: testSecret })
      const c = createMockContext({ env })
      const next = vi.fn()

      const middleware = requireAuth()
      const result = await middleware(c, next)

      expect(next).not.toHaveBeenCalled()
      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body.code).toBe(ERROR_CODES.INVALID_TOKEN)
    })

    it('无效 Token 应该返回 401', async () => {
      const env = createMockEnv({ JWT_SECRET: testSecret })
      const c = createMockContext({
        env,
        headers: { Authorization: 'Bearer invalid.token.here' }
      })
      const next = vi.fn()

      const middleware = requireAuth()
      const result = await middleware(c, next)

      expect(next).not.toHaveBeenCalled()
      expect(result.status).toBe(401)
    })

    it('过期 Token 应该返回 TOKEN_EXPIRED', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      // 推进时间使 Token 过期
      vi.advanceTimersByTime(20 * 60 * 1000) // 20分钟

      const env = createMockEnv({ JWT_SECRET: testSecret })
      const c = createMockContext({
        env,
        headers: { Authorization: `Bearer ${token}` }
      })
      const next = vi.fn()

      const middleware = requireAuth()
      const result = await middleware(c, next)

      expect(next).not.toHaveBeenCalled()
      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body.code).toBe(ERROR_CODES.TOKEN_EXPIRED)
    })

    it('黑名单中的 Token 应该返回 TOKEN_REVOKED', async () => {
      const { token, jti, exp } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      const env = createMockEnv({ JWT_SECRET: testSecret })
      // 将 Token 加入黑名单
      await env.DB.prepare('INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)')
        .bind(jti, exp)
        .run()

      const c = createMockContext({
        env,
        headers: { Authorization: `Bearer ${token}` }
      })
      const next = vi.fn()

      const middleware = requireAuth()
      const result = await middleware(c, next)

      expect(next).not.toHaveBeenCalled()
      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body.code).toBe(ERROR_CODES.TOKEN_REVOKED)
    })

    it('JWT_SECRET 未配置应该返回 500', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      const env = createMockEnv({ JWT_SECRET: undefined })
      const c = createMockContext({
        env,
        headers: { Authorization: `Bearer ${token}` }
      })
      const next = vi.fn()

      const middleware = requireAuth()
      const result = await middleware(c, next)

      expect(next).not.toHaveBeenCalled()
      expect(result.status).toBe(500)
    })
  })

  describe('optionalAuth', () => {
    const testSecret = 'test-jwt-secret-32-characters-long'

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('有效 Token 应该设置 user 并继续', async () => {
      const { token } = await generateAccessToken({
        userId: 'user-123',
        username: 'testuser',
        secret: testSecret
      })

      const env = createMockEnv({ JWT_SECRET: testSecret })
      const c = createMockContext({
        env,
        headers: { Authorization: `Bearer ${token}` }
      })
      const next = vi.fn()

      const middleware = optionalAuth()
      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.get('user')).toBeDefined()
    })

    it('没有 Token 应该继续但不设置 user', async () => {
      const env = createMockEnv({ JWT_SECRET: testSecret })
      const c = createMockContext({ env })
      const next = vi.fn()

      const middleware = optionalAuth()
      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.get('user')).toBeUndefined()
    })

    it('无效 Token 应该继续但不设置 user', async () => {
      const env = createMockEnv({ JWT_SECRET: testSecret })
      const c = createMockContext({
        env,
        headers: { Authorization: 'Bearer invalid.token' }
      })
      const next = vi.fn()

      const middleware = optionalAuth()
      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.get('user')).toBeUndefined()
    })
  })

  describe('securityHeaders', () => {
    it('应该添加安全响应头', async () => {
      const c = createMockContext()
      const next = vi.fn()

      const middleware = securityHeaders()
      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(c.res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(c.res.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(c.res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
  })
})
