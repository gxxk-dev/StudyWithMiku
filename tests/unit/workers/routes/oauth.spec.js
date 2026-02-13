import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import oauthRoutes from '../../../../workers/routes/oauth.js'
import * as oauthService from '../../../../workers/services/oauth.js'
import * as userService from '../../../../workers/services/user.js'
import * as oauthAccountService from '../../../../workers/services/oauthAccount.js'
import * as jwtService from '../../../../workers/services/jwt.js'

vi.mock('../../../../workers/services/oauth.js', () => ({
  generateOAuthState: vi.fn(() => 'mock-state-123'),
  buildGitHubAuthUrl: vi.fn(() => 'https://github.com/login/oauth/authorize?mock=true'),
  exchangeGitHubCode: vi.fn(),
  getGitHubUser: vi.fn(),
  buildGoogleAuthUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth?mock=true'),
  exchangeGoogleCode: vi.fn(),
  getGoogleUser: vi.fn(),
  buildMicrosoftAuthUrl: vi.fn(
    () => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?mock=true'
  ),
  exchangeMicrosoftCode: vi.fn(),
  getMicrosoftUser: vi.fn(),
  buildLinuxDoAuthUrl: vi.fn(() => 'https://connect.linux.do/oauth2/authorize?mock=true'),
  exchangeLinuxDoCode: vi.fn(),
  getLinuxDoUser: vi.fn()
}))

vi.mock('../../../../workers/services/user.js', () => ({
  createUser: vi.fn(),
  usernameExists: vi.fn(),
  sanitizeUsername: vi.fn((input) => input.replace(/[^a-zA-Z0-9_]/g, '')),
  findUserById: vi.fn(),
  updateUser: vi.fn(),
  formatUserForResponse: vi.fn((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    email: user.email || null,
    qqNumber: user.qqNumber || null
  }))
}))

vi.mock('../../../../workers/services/oauthAccount.js', () => ({
  findOAuthAccount: vi.fn(),
  linkOAuthAccount: vi.fn(),
  findOAuthAccountsByUserId: vi.fn(() => [])
}))

vi.mock('../../../../workers/services/jwt.js', () => ({
  generateTokenPair: vi.fn()
}))

vi.mock('../../../../workers/utils/avatar.js', () => ({
  resolveAvatars: vi.fn(() => ({ gravatar: null, libravatar: null, qq: null, oauth: [] }))
}))

vi.mock('../../../../workers/middleware/rateLimit.js', () => ({
  authRateLimit: vi.fn(async (_c, next) => next())
}))

vi.mock('../../../../workers/middleware/auth.js', () => ({
  requireAuth: vi.fn(() => async (_c, next) => next())
}))

// 创建测试 app
const createApp = (envOverrides = {}) => {
  const app = new Hono()

  // 注入 env
  app.use('*', async (c, next) => {
    c.env = {
      GITHUB_CLIENT_ID: 'gh-id',
      GITHUB_CLIENT_SECRET: 'gh-secret',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      MICROSOFT_CLIENT_ID: 'ms-id',
      MICROSOFT_CLIENT_SECRET: 'ms-secret',
      MICROSOFT_TENANT_ID: 'common',
      LINUXDO_CLIENT_ID: 'linuxdo-id',
      LINUXDO_CLIENT_SECRET: 'linuxdo-secret',
      OAUTH_CALLBACK_BASE: 'http://localhost:3000',
      JWT_SECRET: 'test-secret',
      DB: {},
      ...envOverrides
    }
    await next()
  })

  app.route('/oauth', oauthRoutes)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workers/routes/oauth', () => {
  describe('GitHub OAuth', () => {
    describe('GET /oauth/github', () => {
      it('重定向到 GitHub 授权 URL', async () => {
        const app = createApp()
        const res = await app.request('/oauth/github')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('github.com')
        expect(oauthService.generateOAuthState).toHaveBeenCalled()
        expect(oauthService.buildGitHubAuthUrl).toHaveBeenCalled()
      })

      it('缺少配置返回 501', async () => {
        const app = createApp({
          GITHUB_CLIENT_ID: undefined,
          GITHUB_CLIENT_SECRET: undefined
        })
        const res = await app.request('/oauth/github')

        expect(res.status).toBe(501)
        const data = await res.json()
        expect(data.code).toBe('NOT_IMPLEMENTED')
      })
    })

    describe('GET /oauth/github/callback', () => {
      it('成功回调：交换 code → 获取用户 → 生成 token → 重定向', async () => {
        // 先发起 OAuth 获取 state
        const app = createApp()
        await app.request('/oauth/github')
        const state = 'mock-state-123'

        oauthService.exchangeGitHubCode.mockResolvedValue({ accessToken: 'gh-token' })
        oauthService.getGitHubUser.mockResolvedValue({
          user: {
            provider: 'github',
            providerId: '123',
            username: 'octocat',
            displayName: 'Octocat',
            avatarUrl: null
          }
        })
        // 已存在的 OAuth 账号
        oauthAccountService.findOAuthAccount.mockResolvedValue({
          id: 'oauth-001',
          userId: 'user-001',
          provider: 'github',
          providerId: '123'
        })
        userService.findUserById.mockResolvedValue({
          id: 'user-001',
          username: 'octocat',
          displayName: 'Octocat',
          avatarUrl: null
        })
        jwtService.generateTokenPair.mockResolvedValue({
          accessToken: 'jwt-access',
          refreshToken: 'jwt-refresh'
        })

        const res = await app.request(`/oauth/github/callback?code=auth-code&state=${state}`)

        expect(res.status).toBe(302)
        const location = res.headers.get('Location')
        expect(location).toContain('access_token=jwt-access')
        expect(location).toContain('refresh_token=jwt-refresh')
      })

      it('OAuth error 参数重定向到错误页', async () => {
        const app = createApp()
        const res = await app.request('/oauth/github/callback?error=access_denied')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })

      it('缺少 code 或 state 重定向到错误页', async () => {
        const app = createApp()
        const res = await app.request('/oauth/github/callback?code=abc')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })

      it('无效 state 重定向到错误页', async () => {
        const app = createApp()
        const res = await app.request('/oauth/github/callback?code=abc&state=invalid-state')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })

      it('code 交换失败重定向到错误页', async () => {
        const app = createApp()
        await app.request('/oauth/github')

        oauthService.exchangeGitHubCode.mockResolvedValue({ error: 'bad_code' })

        const res = await app.request('/oauth/github/callback?code=bad&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })

      it('获取用户失败重定向到错误页', async () => {
        const app = createApp()
        await app.request('/oauth/github')

        oauthService.exchangeGitHubCode.mockResolvedValue({ accessToken: 'token' })
        oauthService.getGitHubUser.mockResolvedValue({ error: 'API error' })

        const res = await app.request('/oauth/github/callback?code=code&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })
    })
  })

  describe('Google OAuth', () => {
    describe('GET /oauth/google', () => {
      it('重定向到 Google 授权 URL', async () => {
        const app = createApp()
        const res = await app.request('/oauth/google')

        expect(res.status).toBe(302)
        expect(oauthService.buildGoogleAuthUrl).toHaveBeenCalled()
      })

      it('缺少配置返回 501', async () => {
        const app = createApp({
          GOOGLE_CLIENT_ID: undefined,
          GOOGLE_CLIENT_SECRET: undefined
        })
        const res = await app.request('/oauth/google')

        expect(res.status).toBe(501)
      })
    })

    describe('GET /oauth/google/callback', () => {
      it('成功回调流程', async () => {
        const app = createApp()
        await app.request('/oauth/google')

        oauthService.exchangeGoogleCode.mockResolvedValue({ accessToken: 'google-token' })
        oauthService.getGoogleUser.mockResolvedValue({
          user: {
            provider: 'google',
            providerId: 'gid',
            username: 'user',
            displayName: 'User',
            avatarUrl: null
          }
        })
        // 新用户
        oauthAccountService.findOAuthAccount.mockResolvedValue(null)
        userService.usernameExists.mockResolvedValue(false)
        userService.createUser.mockResolvedValue({
          id: 'user-002',
          username: 'user',
          displayName: 'User',
          avatarUrl: null
        })
        oauthAccountService.linkOAuthAccount.mockResolvedValue({})
        jwtService.generateTokenPair.mockResolvedValue({
          accessToken: 'jwt-a',
          refreshToken: 'jwt-r'
        })

        const res = await app.request('/oauth/google/callback?code=code&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('access_token=')
      })

      it('无效 state 重定向到错误页', async () => {
        const app = createApp()
        const res = await app.request('/oauth/google/callback?code=code&state=bad-state')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })
    })
  })

  describe('Microsoft OAuth', () => {
    describe('GET /oauth/microsoft', () => {
      it('重定向到 Microsoft 授权 URL', async () => {
        const app = createApp()
        const res = await app.request('/oauth/microsoft')

        expect(res.status).toBe(302)
        expect(oauthService.buildMicrosoftAuthUrl).toHaveBeenCalled()
      })

      it('缺少配置返回 501', async () => {
        const app = createApp({
          MICROSOFT_CLIENT_ID: undefined,
          MICROSOFT_CLIENT_SECRET: undefined
        })
        const res = await app.request('/oauth/microsoft')

        expect(res.status).toBe(501)
      })
    })

    describe('GET /oauth/microsoft/callback', () => {
      it('成功回调流程', async () => {
        const app = createApp()
        await app.request('/oauth/microsoft')

        oauthService.exchangeMicrosoftCode.mockResolvedValue({ accessToken: 'ms-token' })
        oauthService.getMicrosoftUser.mockResolvedValue({
          user: {
            provider: 'microsoft',
            providerId: 'msid',
            username: 'msuser',
            displayName: 'MS User',
            avatarUrl: null
          }
        })
        // 已存在的 OAuth 账号
        oauthAccountService.findOAuthAccount.mockResolvedValue({
          id: 'oauth-003',
          userId: 'user-003',
          provider: 'microsoft',
          providerId: 'msid'
        })
        userService.findUserById.mockResolvedValue({
          id: 'user-003',
          username: 'msuser',
          displayName: 'MS User',
          avatarUrl: null
        })
        jwtService.generateTokenPair.mockResolvedValue({
          accessToken: 'jwt-a',
          refreshToken: 'jwt-r'
        })

        const res = await app.request('/oauth/microsoft/callback?code=code&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('access_token=')
      })

      it('code 交换失败重定向到错误页', async () => {
        const app = createApp()
        await app.request('/oauth/microsoft')

        oauthService.exchangeMicrosoftCode.mockResolvedValue({ error: 'invalid_grant' })

        const res = await app.request('/oauth/microsoft/callback?code=bad&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })
    })
  })

  describe('LINUX DO OAuth', () => {
    describe('GET /oauth/linuxdo', () => {
      it('重定向到 LINUX DO 授权 URL', async () => {
        const app = createApp()
        const res = await app.request('/oauth/linuxdo')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('connect.linux.do')
        expect(oauthService.generateOAuthState).toHaveBeenCalled()
        expect(oauthService.buildLinuxDoAuthUrl).toHaveBeenCalled()
      })

      it('缺少配置返回 501', async () => {
        const app = createApp({
          LINUXDO_CLIENT_ID: undefined,
          LINUXDO_CLIENT_SECRET: undefined
        })
        const res = await app.request('/oauth/linuxdo')

        expect(res.status).toBe(501)
        const data = await res.json()
        expect(data.code).toBe('NOT_IMPLEMENTED')
      })
    })

    describe('GET /oauth/linuxdo/callback', () => {
      it('成功回调流程', async () => {
        const app = createApp()
        await app.request('/oauth/linuxdo')

        oauthService.exchangeLinuxDoCode.mockResolvedValue({ accessToken: 'linuxdo-token' })
        oauthService.getLinuxDoUser.mockResolvedValue({
          user: {
            provider: 'linuxdo',
            providerId: '789',
            username: 'linuxdoer',
            displayName: 'Linux Do User',
            avatarUrl: null
          }
        })
        // 新用户
        oauthAccountService.findOAuthAccount.mockResolvedValue(null)
        userService.usernameExists.mockResolvedValue(false)
        userService.createUser.mockResolvedValue({
          id: 'user-004',
          username: 'linuxdoer',
          displayName: 'Linux Do User',
          avatarUrl: null
        })
        oauthAccountService.linkOAuthAccount.mockResolvedValue({})
        jwtService.generateTokenPair.mockResolvedValue({
          accessToken: 'jwt-a',
          refreshToken: 'jwt-r'
        })

        const res = await app.request('/oauth/linuxdo/callback?code=code&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('access_token=')
      })

      it('OAuth error 参数重定向到错误页', async () => {
        const app = createApp()
        const res = await app.request('/oauth/linuxdo/callback?error=access_denied')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })

      it('无效 state 重定向到错误页', async () => {
        const app = createApp()
        const res = await app.request('/oauth/linuxdo/callback?code=abc&state=invalid-state')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })

      it('code 交换失败重定向到错误页', async () => {
        const app = createApp()
        await app.request('/oauth/linuxdo')

        oauthService.exchangeLinuxDoCode.mockResolvedValue({ error: 'invalid_grant' })

        const res = await app.request('/oauth/linuxdo/callback?code=bad&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })

      it('获取用户失败重定向到错误页', async () => {
        const app = createApp()
        await app.request('/oauth/linuxdo')

        oauthService.exchangeLinuxDoCode.mockResolvedValue({ accessToken: 'token' })
        oauthService.getLinuxDoUser.mockResolvedValue({ error: 'API error' })

        const res = await app.request('/oauth/linuxdo/callback?code=code&state=mock-state-123')

        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toContain('error=')
      })
    })
  })
})
