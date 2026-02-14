/**
 * @module tests/integration/api/auth.spec
 * @description 认证 API 集成测试
 *
 * 通过 unstable_dev 启动真实 Worker，验证认证相关的 HTTP 契约。
 * WebAuthn 注册/登录需要浏览器 Credential API，此处不测。
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  startWorker,
  stopWorker,
  initDatabase,
  seedTestUser,
  resetDatabase,
  generateAccessToken,
  generateRefreshToken,
  generateExpiredToken,
  TEST_USER_ID,
  TEST_USERNAME
} from './setup.js'

import { getCurrentUser, logout, getAuthConfig, updateProfile } from '../../../src/services/auth.js'

describe('认证 API 集成测试', () => {
  let accessToken
  let refreshTokenStr

  beforeAll(async () => {
    await startWorker()
    await initDatabase()
  })

  afterAll(async () => {
    await stopWorker()
  })

  beforeEach(async () => {
    await resetDatabase()
    await seedTestUser()
    accessToken = await generateAccessToken()
    refreshTokenStr = await generateRefreshToken()
  })

  // ============================================================
  // getAuthConfig
  // ============================================================

  describe('getAuthConfig', () => {
    it('返回服务端认证配置', async () => {
      const config = await getAuthConfig()
      expect(config).toHaveProperty('webauthn', true)
      expect(config).toHaveProperty('oauth')
      expect(config.oauth).toHaveProperty('github')
      expect(config.oauth).toHaveProperty('google')
      expect(config.oauth).toHaveProperty('microsoft')
      expect(config.oauth).toHaveProperty('linuxdo')
    })
  })

  // ============================================================
  // getCurrentUser
  // ============================================================

  describe('getCurrentUser', () => {
    it('有效 token 返回用户信息（含 avatars）', async () => {
      const result = await getCurrentUser(accessToken)
      expect(result.user).toBeDefined()
      expect(result.user.id).toBe(TEST_USER_ID)
      expect(result.user.username).toBe(TEST_USERNAME)
      expect(result.user.avatars).toBeDefined()
      expect(result.user.avatars).toHaveProperty('gravatar')
      expect(result.user.avatars).toHaveProperty('libravatar')
      expect(result.user.avatars).toHaveProperty('qq')
      expect(result.user.avatars).toHaveProperty('oauth')
    })

    it('过期 token 抛出 TOKEN_EXPIRED', async () => {
      const expired = await generateExpiredToken()
      await expect(getCurrentUser(expired)).rejects.toMatchObject({
        type: 'TOKEN_EXPIRED'
      })
    })

    it('无效 token 抛出 TOKEN_EXPIRED', async () => {
      await expect(getCurrentUser('invalid.token.here')).rejects.toMatchObject({
        type: 'TOKEN_EXPIRED'
      })
    })
  })

  // ============================================================
  // refreshToken
  // ============================================================

  describe('refreshToken', () => {
    // refreshToken() 依赖浏览器 Cookie jar（credentials: 'include'），
    // Node.js 测试环境无 Cookie jar，需直接调 API 并手动传 Cookie 头
    const fetchRefresh = async (token) => {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: `swm_refresh_token=${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw data
      return data
    }

    it('有效 refresh token 返回新 token pair', async () => {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: `swm_refresh_token=${refreshTokenStr}` }
      })
      expect(res.ok).toBe(true)

      const data = await res.json()
      expect(data.accessToken).toBeDefined()
      expect(data.expiresIn).toBeGreaterThan(0)
      expect(data.tokenType).toBe('Bearer')

      // 新的 refresh token 通过 Set-Cookie 返回
      const setCookie = res.headers.get('Set-Cookie')
      expect(setCookie).toContain('swm_refresh_token=')
    })

    it('刷新后旧 refresh token 被加入黑名单', async () => {
      await fetchRefresh(refreshTokenStr)

      // 再次使用同一个 refresh token 应失败
      await expect(fetchRefresh(refreshTokenStr)).rejects.toMatchObject({
        code: expect.any(String)
      })
    })
  })

  // ============================================================
  // updateProfile (PATCH /auth/me)
  // ============================================================

  describe('updateProfile', () => {
    it('更新 email 后 avatars 包含 gravatar', async () => {
      const result = await updateProfile(accessToken, { email: 'test@example.com' })
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.avatars.gravatar).toBeTruthy()
      expect(result.user.avatars.libravatar).toBeTruthy()
    })

    it('更新 qqNumber 后 avatars 包含 qq', async () => {
      const result = await updateProfile(accessToken, { qqNumber: '12345' })
      expect(result.user.qqNumber).toBe('12345')
      expect(result.user.avatars.qq).toBeTruthy()
    })

    it('更新持久化 — 再次 GET 能看到新值', async () => {
      await updateProfile(accessToken, { email: 'persist@example.com' })
      const result = await getCurrentUser(accessToken)
      expect(result.user.email).toBe('persist@example.com')
    })

    it('清除字段 — 传 null 置空', async () => {
      await updateProfile(accessToken, { email: 'temp@example.com' })
      const result = await updateProfile(accessToken, { email: null })
      expect(result.user.email).toBeNull()
      expect(result.user.avatars.gravatar).toBeNull()
    })
  })

  // ============================================================
  // logout
  // ============================================================

  describe('logout', () => {
    it('登出成功', async () => {
      const result = await logout(accessToken, refreshTokenStr)
      expect(result.ok).toBe(true)
    })

    it('登出后 access token 被加入黑名单', async () => {
      await logout(accessToken, refreshTokenStr)

      await expect(getCurrentUser(accessToken)).rejects.toMatchObject({
        type: 'TOKEN_EXPIRED'
      })
    })
  })
})
