/**
 * WebAuthn 认证路由测试
 * 使用 Hono app.request() 进行路由级集成测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import { ERROR_CODES, JWT_CONFIG } from '../../../../workers/constants.js'
import { generateTokenPair, generateAccessToken } from '../../../../workers/services/jwt.js'
import { createMockEnv } from '../../../setup/fixtures/workerMocks.js'
import { sampleUsers, sampleCredentials } from '../../../setup/fixtures/authData.js'

// 需要 mock @simplewebauthn/server 模块
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(async (opts) => ({
    challenge: 'mock-challenge-base64',
    rp: { name: opts.rpName, id: opts.rpID },
    user: { name: opts.userName, displayName: opts.userDisplayName },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    timeout: 60000,
    attestation: 'none'
  })),
  verifyRegistrationResponse: vi.fn(async () => ({
    verified: true,
    registrationInfo: {
      credential: {
        id: 'new-credential-id',
        publicKey: new Uint8Array([1, 2, 3, 4, 5]),
        counter: 0
      },
      credentialDeviceType: 'platform',
      credentialBackedUp: false
    }
  })),
  generateAuthenticationOptions: vi.fn(async (opts) => ({
    challenge: 'mock-auth-challenge-base64',
    rpId: opts.rpID,
    allowCredentials: opts.allowCredentials,
    timeout: 60000
  })),
  verifyAuthenticationResponse: vi.fn(async () => ({
    verified: true,
    authenticationInfo: {
      newCounter: 1
    }
  }))
}))

describe('auth routes', () => {
  let app
  let env
  const testSecret = 'test-jwt-secret-32-characters-long'

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))

    env = createMockEnv({ JWT_SECRET: testSecret })

    // 预置用户和凭证数据（深拷贝以避免测试间干扰）
    env.DB.__setTable('users', JSON.parse(JSON.stringify(sampleUsers)))
    env.DB.__setTable('credentials', JSON.parse(JSON.stringify(sampleCredentials)))

    // 动态导入路由以使用 mock
    const authModule = await import('../../../../workers/routes/auth.js')
    app = new Hono()
    app.route('/auth', authModule.default)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * 辅助函数：发送 JSON 请求
   */
  const jsonRequest = (method, path, body, headers = {}) => {
    return app.request(
      path,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      },
      env
    )
  }

  /**
   * 辅助函数：获取带认证的请求头
   */
  const getAuthHeaders = async (userId = 'user-001', username = 'testuser') => {
    const { token } = await generateAccessToken({
      userId,
      username,
      secret: testSecret
    })
    return { Authorization: `Bearer ${token}` }
  }

  describe('POST /auth/register/options', () => {
    it('应该生成注册选项', async () => {
      const res = await jsonRequest('POST', '/auth/register/options', {
        username: 'newuser'
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.challengeId).toBeDefined()
      expect(body.options).toBeDefined()
      expect(body.options.challenge).toBe('mock-challenge-base64')
    })

    it('用户名已存在应该返回 409', async () => {
      const res = await jsonRequest('POST', '/auth/register/options', {
        username: 'testuser' // 已存在
      })

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.USER_EXISTS)
    })

    it('无效的用户名格式应该返回 400', async () => {
      const res = await jsonRequest('POST', '/auth/register/options', {
        username: 'ab' // 太短
      })

      expect(res.status).toBe(400)
    })

    it('缺少 username 应该返回 400', async () => {
      const res = await jsonRequest('POST', '/auth/register/options', {})

      expect(res.status).toBe(400)
    })
  })

  describe('POST /auth/register/verify', () => {
    it('无效的 challengeId 应该返回 400', async () => {
      const res = await jsonRequest('POST', '/auth/register/verify', {
        challengeId: 'nonexistent-challenge',
        response: {
          id: 'test-id',
          rawId: 'test-raw-id',
          response: {
            clientDataJSON: 'mock',
            attestationObject: 'mock'
          },
          type: 'public-key'
        }
      })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /auth/login/options', () => {
    it('应该为已知用户生成认证选项', async () => {
      const res = await jsonRequest('POST', '/auth/login/options', {
        username: 'testuser'
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.challengeId).toBeDefined()
      expect(body.options).toBeDefined()
    })

    it('不存在的用户应该返回通用错误', async () => {
      const res = await jsonRequest('POST', '/auth/login/options', {
        username: 'nonexistent_user'
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.INVALID_CREDENTIALS)
      // 不应该泄露用户是否存在
      expect(body.error).toBe('Authentication failed')
    })

    it('OAuth 用户不应该通过 WebAuthn 登录', async () => {
      const res = await jsonRequest('POST', '/auth/login/options', {
        username: 'github_user'
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.authProvider).toBe('github')
    })
  })

  describe('POST /auth/refresh', () => {
    it('有效的 Refresh Token 应该返回新 Token 对', async () => {
      const tokens = await generateTokenPair({
        userId: 'user-001',
        username: 'testuser',
        secret: testSecret
      })

      const res = await jsonRequest('POST', '/auth/refresh', {
        refreshToken: tokens.refreshToken
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.accessToken).toBeDefined()
      expect(body.refreshToken).toBeDefined()
      expect(body.expiresIn).toBe(JWT_CONFIG.ACCESS_TOKEN_TTL)
    })

    it('过期的 Refresh Token 应该返回 SESSION_EXPIRED', async () => {
      const tokens = await generateTokenPair({
        userId: 'user-001',
        username: 'testuser',
        secret: testSecret
      })

      // 推进时间超过 Refresh Token 有效期
      vi.advanceTimersByTime((JWT_CONFIG.REFRESH_TOKEN_TTL + 60) * 1000)

      const res = await jsonRequest('POST', '/auth/refresh', {
        refreshToken: tokens.refreshToken
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.SESSION_EXPIRED)
    })

    it('缺少 refreshToken 应该返回 400', async () => {
      const res = await jsonRequest('POST', '/auth/refresh', {})

      expect(res.status).toBe(400)
    })
  })

  describe('POST /auth/logout', () => {
    it('应该成功登出', async () => {
      const headers = await getAuthHeaders()

      const res = await jsonRequest('POST', '/auth/logout', {}, headers)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    })

    it('未认证应该返回 401', async () => {
      const res = await jsonRequest('POST', '/auth/logout', {})

      expect(res.status).toBe(401)
    })
  })

  describe('GET /auth/me', () => {
    it('应该返回当前用户信息', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/auth/me',
        {
          method: 'GET',
          headers
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user).toBeDefined()
      expect(body.user.username).toBe('testuser')
      expect(body.user.id).toBe('user-001')
    })

    it('未认证应该返回 401', async () => {
      const res = await app.request(
        '/auth/me',
        {
          method: 'GET'
        },
        env
      )

      expect(res.status).toBe(401)
    })
  })

  describe('GET /auth/devices', () => {
    it('应该返回用户的设备列表', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/auth/devices',
        {
          method: 'GET',
          headers
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.devices).toBeDefined()
      expect(body.devices.length).toBeGreaterThan(0)
      // 确保不返回敏感信息
      body.devices.forEach((device) => {
        expect(device.public_key).toBeUndefined()
        expect(device.counter).toBeUndefined()
      })
    })
  })

  describe('DELETE /auth/devices/:id', () => {
    it('不能删除最后一个凭证', async () => {
      // 先删除一个，使得只剩一个
      env.DB.__setTable('credentials', [sampleCredentials[0]])

      const headers = await getAuthHeaders()

      const res = await app.request(
        '/auth/devices/credential-001',
        {
          method: 'DELETE',
          headers
        },
        env
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.LAST_CREDENTIAL)
    })

    it('可以删除非最后一个凭证', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/auth/devices/credential-001',
        {
          method: 'DELETE',
          headers
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    })

    it('删除不存在的凭证应该返回 404', async () => {
      // 确保有多个凭证，这样不会触发 LAST_CREDENTIAL 错误
      env.DB.__setTable('credentials', JSON.parse(JSON.stringify(sampleCredentials)))
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/auth/devices/nonexistent',
        {
          method: 'DELETE',
          headers
        },
        env
      )

      expect(res.status).toBe(404)
    })
  })
})
