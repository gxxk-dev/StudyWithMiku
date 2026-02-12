import { describe, it, expect, beforeEach, vi } from 'vitest'
import { requireAuth, optionalAuth } from '../../../../workers/middleware/auth.js'
import {
  verifyToken,
  extractBearerToken,
  isTokenBlacklisted
} from '../../../../workers/services/jwt.js'

vi.mock('../../../../workers/services/jwt.js', () => ({
  verifyToken: vi.fn(),
  extractBearerToken: vi.fn(),
  isTokenBlacklisted: vi.fn()
}))

/**
 * 创建 mock Hono context
 */
const createMockContext = (options = {}) => {
  const { authHeader, jwtSecret = 'test-secret', db = {} } = options
  const contextData = new Map()
  return {
    req: {
      header: vi.fn((name) => (name === 'Authorization' ? authHeader : null))
    },
    env: { JWT_SECRET: jwtSecret, DB: db },
    json: vi.fn((data, status) => ({ data, status })),
    set: vi.fn((key, value) => contextData.set(key, value)),
    get: vi.fn((key) => contextData.get(key)),
    __getContextData: () => contextData
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workers/middleware/auth', () => {
  describe('requireAuth', () => {
    const middleware = requireAuth()

    it('无 token 返回 401', async () => {
      extractBearerToken.mockReturnValue(null)
      const c = createMockContext({})
      const next = vi.fn()

      await middleware(c, next)

      expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }), 401)
      expect(next).not.toHaveBeenCalled()
    })

    it('无 JWT_SECRET 返回 500', async () => {
      extractBearerToken.mockReturnValue('some-token')
      const c = createMockContext({ authHeader: 'Bearer some-token', jwtSecret: null })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INTERNAL_ERROR' }), 500)
      expect(next).not.toHaveBeenCalled()
    })

    it('token 无效返回 401', async () => {
      extractBearerToken.mockReturnValue('invalid-token')
      verifyToken.mockResolvedValue({
        valid: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      })
      const c = createMockContext({ authHeader: 'Bearer invalid-token' })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Token expired', code: 'TOKEN_EXPIRED' }),
        401
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('token 已黑名单返回 401', async () => {
      extractBearerToken.mockReturnValue('blacklisted-token')
      verifyToken.mockResolvedValue({
        valid: true,
        payload: { sub: 'user-001', username: 'test', jti: 'jti-001', exp: 9999999999 }
      })
      isTokenBlacklisted.mockResolvedValue(true)
      const c = createMockContext({ authHeader: 'Bearer blacklisted-token' })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_REVOKED' }), 401)
      expect(next).not.toHaveBeenCalled()
    })

    it('有效 token 设置 user context 并调用 next', async () => {
      const payload = { sub: 'user-001', username: 'testuser', jti: 'jti-001', exp: 9999999999 }
      extractBearerToken.mockReturnValue('valid-token')
      verifyToken.mockResolvedValue({ valid: true, payload })
      isTokenBlacklisted.mockResolvedValue(false)
      const c = createMockContext({ authHeader: 'Bearer valid-token' })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('user', {
        id: 'user-001',
        username: 'testuser',
        jti: 'jti-001',
        exp: 9999999999
      })
      expect(next).toHaveBeenCalled()
    })

    it('使用正确的 token 类型验证', async () => {
      extractBearerToken.mockReturnValue('token')
      verifyToken.mockResolvedValue({ valid: false, error: 'invalid', code: 'INVALID_TOKEN' })
      const c = createMockContext({ authHeader: 'Bearer token' })

      await middleware(c, vi.fn())

      expect(verifyToken).toHaveBeenCalledWith('token', 'test-secret', 'access')
    })
  })

  describe('optionalAuth', () => {
    const middleware = optionalAuth()

    it('无 token 继续且不设置 user', async () => {
      extractBearerToken.mockReturnValue(null)
      const c = createMockContext({})
      const next = vi.fn()

      await middleware(c, next)

      expect(c.set).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('无效 token 继续且不设置 user', async () => {
      extractBearerToken.mockReturnValue('invalid')
      verifyToken.mockResolvedValue({ valid: false })
      const c = createMockContext({ authHeader: 'Bearer invalid' })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.set).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('有效 token 设置 user context', async () => {
      const payload = { sub: 'user-001', username: 'test', jti: 'jti-001', exp: 9999999999 }
      extractBearerToken.mockReturnValue('valid')
      verifyToken.mockResolvedValue({ valid: true, payload })
      isTokenBlacklisted.mockResolvedValue(false)
      const c = createMockContext({ authHeader: 'Bearer valid' })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('user', {
        id: 'user-001',
        username: 'test',
        jti: 'jti-001',
        exp: 9999999999
      })
      expect(next).toHaveBeenCalled()
    })

    it('黑名单 token 继续但不设置 user', async () => {
      const payload = { sub: 'user-001', username: 'test', jti: 'jti-bl', exp: 9999999999 }
      extractBearerToken.mockReturnValue('blacklisted')
      verifyToken.mockResolvedValue({ valid: true, payload })
      isTokenBlacklisted.mockResolvedValue(true)
      const c = createMockContext({ authHeader: 'Bearer blacklisted' })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.set).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('无 JWT_SECRET 继续且不设置 user', async () => {
      extractBearerToken.mockReturnValue('token')
      const c = createMockContext({ authHeader: 'Bearer token', jwtSecret: null })
      const next = vi.fn()

      await middleware(c, next)

      expect(c.set).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })
  })
})
