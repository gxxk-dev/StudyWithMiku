import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateOAuthState,
  buildGitHubAuthUrl,
  buildGoogleAuthUrl,
  buildMicrosoftAuthUrl,
  exchangeGitHubCode,
  exchangeGoogleCode,
  exchangeMicrosoftCode,
  getGitHubUser,
  getGoogleUser,
  getMicrosoftUser
} from '../../../../workers/services/oauth.js'

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.fetch = vi.fn()
})

describe('workers/services/oauth', () => {
  describe('generateOAuthState', () => {
    it('返回 64 字符的 hex 字符串', () => {
      const state = generateOAuthState()
      expect(state).toMatch(/^[0-9a-f]{64}$/)
    })

    it('每次调用返回不同的值', () => {
      const state1 = generateOAuthState()
      const state2 = generateOAuthState()
      expect(state1).not.toBe(state2)
    })
  })

  describe('buildGitHubAuthUrl', () => {
    it('构建正确的 GitHub 授权 URL', () => {
      const url = buildGitHubAuthUrl({
        clientId: 'gh-client-id',
        redirectUri: 'http://localhost/callback',
        state: 'test-state'
      })

      expect(url).toContain('https://github.com/login/oauth/authorize')
      expect(url).toContain('client_id=gh-client-id')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('state=test-state')
      expect(url).toContain('scope=')
    })

    it('正确编码 redirectUri 参数', () => {
      const url = buildGitHubAuthUrl({
        clientId: 'id',
        redirectUri: 'http://localhost:3000/oauth/github/callback',
        state: 'state'
      })

      const parsed = new URL(url)
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/oauth/github/callback'
      )
    })
  })

  describe('buildGoogleAuthUrl', () => {
    it('构建正确的 Google 授权 URL', () => {
      const url = buildGoogleAuthUrl({
        clientId: 'google-client-id',
        redirectUri: 'http://localhost/callback',
        state: 'test-state'
      })

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(url).toContain('client_id=google-client-id')
      expect(url).toContain('response_type=code')
      expect(url).toContain('access_type=offline')
      expect(url).toContain('state=test-state')
    })
  })

  describe('buildMicrosoftAuthUrl', () => {
    it('构建正确的 Microsoft 授权 URL 并替换 tenant', () => {
      const url = buildMicrosoftAuthUrl({
        clientId: 'ms-client-id',
        tenantId: 'my-tenant',
        redirectUri: 'http://localhost/callback',
        state: 'test-state'
      })

      expect(url).toContain('https://login.microsoftonline.com/my-tenant/')
      expect(url).not.toContain('{tenant}')
      expect(url).toContain('client_id=ms-client-id')
      expect(url).toContain('response_mode=query')
    })

    it('使用 common 作为默认 tenant', () => {
      const url = buildMicrosoftAuthUrl({
        clientId: 'id',
        tenantId: 'common',
        redirectUri: 'http://localhost/callback',
        state: 'state'
      })

      expect(url).toContain('login.microsoftonline.com/common/')
    })
  })

  describe('exchangeGitHubCode', () => {
    it('正常交换授权码获取 token', async () => {
      globalThis.fetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ access_token: 'gh-token-123' })
      })

      const result = await exchangeGitHubCode({
        code: 'auth-code',
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'http://localhost/callback'
      })

      expect(result.accessToken).toBe('gh-token-123')
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('github.com'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('API 返回错误时返回 error', async () => {
      globalThis.fetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect'
        })
      })

      const result = await exchangeGitHubCode({
        code: 'bad-code',
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'http://localhost/callback'
      })

      expect(result.error).toBeDefined()
    })

    it('网络错误时返回 error', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Network failure'))

      const result = await exchangeGitHubCode({
        code: 'code',
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'http://localhost/callback'
      })

      expect(result.error).toBe('Network failure')
    })
  })

  describe('exchangeGoogleCode', () => {
    it('正常交换授权码', async () => {
      globalThis.fetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ access_token: 'google-token' })
      })

      const result = await exchangeGoogleCode({
        code: 'code',
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'http://localhost/callback'
      })

      expect(result.accessToken).toBe('google-token')
    })

    it('API 错误时返回 error', async () => {
      globalThis.fetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ error: 'invalid_grant' })
      })

      const result = await exchangeGoogleCode({
        code: 'bad',
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'http://localhost/callback'
      })

      expect(result.error).toBeDefined()
    })
  })

  describe('exchangeMicrosoftCode', () => {
    it('正常交换授权码并替换 tenant', async () => {
      globalThis.fetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ access_token: 'ms-token' })
      })

      const result = await exchangeMicrosoftCode({
        code: 'code',
        clientId: 'id',
        clientSecret: 'secret',
        tenantId: 'my-tenant',
        redirectUri: 'http://localhost/callback'
      })

      expect(result.accessToken).toBe('ms-token')
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('my-tenant'),
        expect.any(Object)
      )
    })
  })

  describe('getGitHubUser', () => {
    it('正常返回用户信息', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 12345,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          email: 'octocat@github.com'
        })
      })

      const result = await getGitHubUser('gh-token')

      expect(result.user).toEqual({
        provider: 'github',
        providerId: '12345',
        username: 'octocat',
        displayName: 'The Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        email: 'octocat@github.com'
      })
    })

    it('name 缺失时回退到 login', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 123,
          login: 'user',
          name: null,
          avatar_url: null,
          email: null
        })
      })

      const result = await getGitHubUser('token')
      expect(result.user.displayName).toBe('user')
    })

    it('API 错误时返回 error', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized')
      })

      const result = await getGitHubUser('bad-token')
      expect(result.error).toBeDefined()
    })
  })

  describe('getGoogleUser', () => {
    it('正常返回用户信息', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'google-id-123',
          email: 'user@gmail.com',
          name: 'Google User',
          picture: 'https://lh3.googleusercontent.com/photo'
        })
      })

      const result = await getGoogleUser('google-token')

      expect(result.user.provider).toBe('google')
      expect(result.user.username).toBe('user')
      expect(result.user.email).toBe('user@gmail.com')
    })

    it('email 缺失时使用 google_ 前缀', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gid',
          email: null,
          name: 'User',
          picture: null
        })
      })

      const result = await getGoogleUser('token')
      expect(result.user.username).toBe('google_gid')
    })

    it('API 错误时返回 error', async () => {
      globalThis.fetch.mockResolvedValue({ ok: false })

      const result = await getGoogleUser('bad-token')
      expect(result.error).toBeDefined()
    })
  })

  describe('getMicrosoftUser', () => {
    it('正常返回用户信息', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'ms-id-123',
          userPrincipalName: 'user@outlook.com',
          displayName: 'MS User',
          mail: 'user@outlook.com'
        })
      })

      const result = await getMicrosoftUser('ms-token')

      expect(result.user.provider).toBe('microsoft')
      expect(result.user.username).toBe('user')
      expect(result.user.avatarUrl).toBeNull()
    })

    it('userPrincipalName 缺失时使用 ms_ 前缀', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'msid',
          userPrincipalName: null,
          displayName: 'User',
          mail: null
        })
      })

      const result = await getMicrosoftUser('token')
      expect(result.user.username).toBe('ms_msid')
    })

    it('API 错误时返回 error', async () => {
      globalThis.fetch.mockResolvedValue({ ok: false })

      const result = await getMicrosoftUser('bad-token')
      expect(result.error).toBeDefined()
    })
  })
})
