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
    const authModule = await import('../../../../workers/routes/auth/index.js')
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

    it('无凭证的 OAuth 用户不应该通过 WebAuthn 登录', async () => {
      const res = await jsonRequest('POST', '/auth/login/options', {
        username: 'google_user'
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.INVALID_CREDENTIALS)
    })

    it('有凭证的 OAuth 用户应该能获取登录选项', async () => {
      const res = await jsonRequest('POST', '/auth/login/options', {
        username: 'github_user'
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.challengeId).toBeDefined()
      expect(body.options).toBeDefined()
      expect(body.options.allowCredentials).toBeDefined()
    })
  })

  describe('POST /auth/refresh', () => {
    it('有效的 Refresh Token（通过 Cookie）应该返回新 Access Token', async () => {
      const tokens = await generateTokenPair({
        userId: 'user-001',
        username: 'testuser',
        secret: testSecret
      })

      const req = new Request('http://localhost/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      // 手动设置 Cookie 头（绕过 Request 构造函数可能的限制）
      req.headers.set('Cookie', `swm_refresh_token=${tokens.refreshToken}`)

      const res = await app.request(req, undefined, env)

      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.accessToken).toBeDefined()
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

      const req = new Request('http://localhost/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      req.headers.set('Cookie', `swm_refresh_token=${tokens.refreshToken}`)

      const res = await app.request(req, undefined, env)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.SESSION_EXPIRED)
    })

    it('缺少 refresh token Cookie 应该返回 401', async () => {
      const res = await jsonRequest('POST', '/auth/refresh')

      expect(res.status).toBe(401)
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
    it('应该返回当前用户信息（含 avatars）', async () => {
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
      expect(body.user.email).toBeDefined()
      expect(body.user.qqNumber).toBeDefined()
      expect(body.user.avatars).toBeDefined()
      expect(body.user.avatars).toHaveProperty('gravatar')
      expect(body.user.avatars).toHaveProperty('libravatar')
      expect(body.user.avatars).toHaveProperty('qq')
      expect(body.user.avatars).toHaveProperty('oauth')
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

  describe('PATCH /auth/me', () => {
    it('应该更新用户 email', async () => {
      const headers = await getAuthHeaders()

      const res = await jsonRequest('PATCH', '/auth/me', { email: 'new@example.com' }, headers)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.email).toBe('new@example.com')
      expect(body.user.avatars).toBeDefined()
      expect(body.user.avatars.gravatar).toBeTruthy()
    })

    it('应该更新用户 qqNumber', async () => {
      const headers = await getAuthHeaders()

      const res = await jsonRequest('PATCH', '/auth/me', { qqNumber: '12345' }, headers)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.qqNumber).toBe('12345')
      expect(body.user.avatars.qq).toBeTruthy()
    })

    it('无效 email 应该返回 400', async () => {
      const headers = await getAuthHeaders()

      const res = await jsonRequest('PATCH', '/auth/me', { email: 'not-an-email' }, headers)

      expect(res.status).toBe(400)
    })

    it('无效 QQ 号应该返回 400', async () => {
      const headers = await getAuthHeaders()

      const res = await jsonRequest('PATCH', '/auth/me', { qqNumber: '123' }, headers)

      expect(res.status).toBe(400)
    })

    it('未认证应该返回 401', async () => {
      const res = await jsonRequest('PATCH', '/auth/me', { email: 'test@example.com' })

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
      expect(body.code).toBe(ERROR_CODES.LAST_AUTH_METHOD)
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

  describe('POST /auth/devices/merge', () => {
    it('错误用户尝试后，正确用户仍可使用同一 mergeToken 完成合并', async () => {
      // 让 add/verify 走到“凭据已属于其他用户”的冲突分支
      env.DB.__setTable('credentials', [
        ...JSON.parse(JSON.stringify(sampleCredentials)),
        {
          ...JSON.parse(JSON.stringify(sampleCredentials[2])),
          id: 'new-credential-id',
          user_id: 'user-002'
        }
      ])

      const targetHeaders = await getAuthHeaders('user-001', 'testuser')

      const optionsRes = await jsonRequest('POST', '/auth/devices/add/options', {}, targetHeaders)
      expect(optionsRes.status).toBe(200)
      const { challengeId } = await optionsRes.json()

      const verifyRes = await jsonRequest(
        'POST',
        '/auth/devices/add/verify',
        {
          challengeId,
          response: {
            id: 'new-credential-id',
            rawId: 'new-credential-id',
            response: {
              clientDataJSON: 'mock-client-data',
              attestationObject: 'mock-attestation',
              transports: ['internal']
            },
            type: 'public-key'
          }
        },
        targetHeaders
      )

      expect(verifyRes.status).toBe(409)
      const conflict = await verifyRes.json()
      expect(conflict.code).toBe(ERROR_CODES.CREDENTIAL_EXISTS)
      expect(conflict.mergeToken).toBeDefined()

      const mergePayload = {
        mergeToken: conflict.mergeToken,
        dataChoices: {
          records: 'target',
          settings: 'source',
          playlists: 'target'
        }
      }

      const wrongHeaders = await getAuthHeaders('user-003', 'google_user')
      const wrongUserRes = await jsonRequest(
        'POST',
        '/auth/devices/merge',
        mergePayload,
        wrongHeaders
      )
      expect(wrongUserRes.status).toBe(403)

      const rightUserRes = await jsonRequest(
        'POST',
        '/auth/devices/merge',
        mergePayload,
        targetHeaders
      )
      expect(rightUserRes.status).toBe(200)
      const body = await rightUserRes.json()
      expect(body.success).toBe(true)
    })
  })
})
