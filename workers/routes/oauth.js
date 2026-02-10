/**
 * @module workers/routes/oauth
 * @description OAuth 认证路由 (GitHub/Google/Microsoft)
 */

import { Hono } from 'hono'
import { ERROR_CODES, JWT_CONFIG } from '../constants.js'
import { authRateLimit } from '../middleware/rateLimit.js'
import { createOrGetOAuthUser } from '../services/user.js'
import { generateTokenPair } from '../services/jwt.js'
import {
  generateOAuthState,
  buildGitHubAuthUrl,
  exchangeGitHubCode,
  getGitHubUser,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUser,
  buildMicrosoftAuthUrl,
  exchangeMicrosoftCode,
  getMicrosoftUser
} from '../services/oauth.js'

const oauth = new Hono()

/**
 * OAuth state 存储 (使用内存，每个 Worker 实例独立)
 * @type {Map<string, {createdAt: number, provider: string}>}
 */
const oauthStates = new Map()

/** OAuth state 有效期 (10 分钟) */
const OAUTH_STATE_TTL = 10 * 60 * 1000

/**
 * 验证并消费 OAuth state
 * @param {string} state
 * @param {string} expectedProvider
 * @returns {boolean}
 */
const validateState = (state, expectedProvider) => {
  const record = oauthStates.get(state)
  if (!record) return false

  oauthStates.delete(state)

  if (Date.now() - record.createdAt > OAUTH_STATE_TTL) return false
  if (record.provider !== expectedProvider) return false

  return true
}

/**
 * 生成带 Token 的重定向响应 (前端使用 fragment 接收)
 * @param {Object} c - Hono Context
 * @param {Object} tokens - Token 对
 * @param {boolean} isNew - 是否新用户
 * @param {Object} user - 用户信息
 * @returns {Response}
 */
const redirectWithTokens = (c, tokens, isNew, user) => {
  const baseUrl = c.env.OAUTH_CALLBACK_BASE
  const params = new URLSearchParams({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: String(JWT_CONFIG.ACCESS_TOKEN_TTL),
    is_new: String(isNew),
    user: JSON.stringify(user)
  })

  return c.redirect(`${baseUrl}/#${params.toString()}`)
}

/**
 * 生成错误重定向
 * @param {Object} c - Hono Context
 * @param {string} error - 错误消息
 * @returns {Response}
 */
const redirectWithError = (c, error) => {
  const baseUrl = c.env.OAUTH_CALLBACK_BASE
  return c.redirect(`${baseUrl}/?error=${encodeURIComponent(error)}`)
}

/**
 * 通用 OAuth 回调处理
 * @param {Object} c - Hono Context
 * @param {Object} oauthUser - OAuth 用户信息
 * @returns {Promise<Response>}
 */
const handleOAuthCallback = async (c, oauthUser) => {
  // 创建或获取用户
  const { user, isNew } = await createOrGetOAuthUser(c.env.DB, {
    provider: oauthUser.provider,
    providerId: oauthUser.providerId,
    preferredUsername: oauthUser.username,
    displayName: oauthUser.displayName,
    avatarUrl: oauthUser.avatarUrl
  })

  // 生成 Token
  const tokens = await generateTokenPair({
    userId: user.id,
    username: user.username,
    secret: c.env.JWT_SECRET
  })

  // 格式化用户信息用于返回
  const userForResponse = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider
  }

  return redirectWithTokens(c, tokens, isNew, userForResponse)
}

// ============================================================
// GitHub OAuth
// ============================================================

/**
 * GET /oauth/github
 * 发起 GitHub OAuth 授权
 */
oauth.get('/github', authRateLimit, (c) => {
  if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) {
    return c.json(
      {
        error: 'GitHub OAuth not configured',
        code: ERROR_CODES.NOT_IMPLEMENTED
      },
      501
    )
  }

  const state = generateOAuthState()
  oauthStates.set(state, { createdAt: Date.now(), provider: 'github' })

  const authUrl = buildGitHubAuthUrl({
    clientId: c.env.GITHUB_CLIENT_ID,
    redirectUri: `${c.env.OAUTH_CALLBACK_BASE}/oauth/github/callback`,
    state
  })

  return c.redirect(authUrl)
})

/**
 * GET /oauth/github/callback
 * GitHub OAuth 回调
 */
oauth.get('/github/callback', authRateLimit, async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')

  if (error) {
    console.error('GitHub OAuth error:', error)
    return redirectWithError(c, 'OAuth authorization failed')
  }

  if (!code || !state) {
    return redirectWithError(c, 'Missing authorization parameters')
  }

  if (!validateState(state, 'github')) {
    return redirectWithError(c, 'Invalid or expired state')
  }

  // 交换授权码
  const tokenResult = await exchangeGitHubCode({
    code,
    clientId: c.env.GITHUB_CLIENT_ID,
    clientSecret: c.env.GITHUB_CLIENT_SECRET,
    redirectUri: `${c.env.OAUTH_CALLBACK_BASE}/oauth/github/callback`
  })

  if (tokenResult.error) {
    console.error('GitHub token exchange error:', tokenResult.error)
    return redirectWithError(c, 'Failed to exchange authorization code')
  }

  // 获取用户信息
  const userResult = await getGitHubUser(tokenResult.accessToken)

  if (userResult.error) {
    console.error('GitHub user fetch error:', userResult.error)
    return redirectWithError(c, 'Failed to fetch user information')
  }

  return handleOAuthCallback(c, userResult.user)
})

// ============================================================
// Google OAuth
// ============================================================

/**
 * GET /oauth/google
 * 发起 Google OAuth 授权
 */
oauth.get('/google', authRateLimit, (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.json(
      {
        error: 'Google OAuth not configured',
        code: ERROR_CODES.NOT_IMPLEMENTED
      },
      501
    )
  }

  const state = generateOAuthState()
  oauthStates.set(state, { createdAt: Date.now(), provider: 'google' })

  const authUrl = buildGoogleAuthUrl({
    clientId: c.env.GOOGLE_CLIENT_ID,
    redirectUri: `${c.env.OAUTH_CALLBACK_BASE}/oauth/google/callback`,
    state
  })

  return c.redirect(authUrl)
})

/**
 * GET /oauth/google/callback
 * Google OAuth 回调
 */
oauth.get('/google/callback', authRateLimit, async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')

  if (error) {
    console.error('Google OAuth error:', error)
    return redirectWithError(c, 'OAuth authorization failed')
  }

  if (!code || !state) {
    return redirectWithError(c, 'Missing authorization parameters')
  }

  if (!validateState(state, 'google')) {
    return redirectWithError(c, 'Invalid or expired state')
  }

  const tokenResult = await exchangeGoogleCode({
    code,
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${c.env.OAUTH_CALLBACK_BASE}/oauth/google/callback`
  })

  if (tokenResult.error) {
    console.error('Google token exchange error:', tokenResult.error)
    return redirectWithError(c, 'Failed to exchange authorization code')
  }

  const userResult = await getGoogleUser(tokenResult.accessToken)

  if (userResult.error) {
    console.error('Google user fetch error:', userResult.error)
    return redirectWithError(c, 'Failed to fetch user information')
  }

  return handleOAuthCallback(c, userResult.user)
})

// ============================================================
// Microsoft OAuth
// ============================================================

/**
 * GET /oauth/microsoft
 * 发起 Microsoft OAuth 授权
 */
oauth.get('/microsoft', authRateLimit, (c) => {
  if (!c.env.MICROSOFT_CLIENT_ID || !c.env.MICROSOFT_CLIENT_SECRET) {
    return c.json(
      {
        error: 'Microsoft OAuth not configured',
        code: ERROR_CODES.NOT_IMPLEMENTED
      },
      501
    )
  }

  const state = generateOAuthState()
  oauthStates.set(state, { createdAt: Date.now(), provider: 'microsoft' })

  const tenantId = c.env.MICROSOFT_TENANT_ID || 'common'
  const authUrl = buildMicrosoftAuthUrl({
    clientId: c.env.MICROSOFT_CLIENT_ID,
    tenantId,
    redirectUri: `${c.env.OAUTH_CALLBACK_BASE}/oauth/microsoft/callback`,
    state
  })

  return c.redirect(authUrl)
})

/**
 * GET /oauth/microsoft/callback
 * Microsoft OAuth 回调
 */
oauth.get('/microsoft/callback', authRateLimit, async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')

  if (error) {
    console.error('Microsoft OAuth error:', error, c.req.query('error_description'))
    return redirectWithError(c, 'OAuth authorization failed')
  }

  if (!code || !state) {
    return redirectWithError(c, 'Missing authorization parameters')
  }

  if (!validateState(state, 'microsoft')) {
    return redirectWithError(c, 'Invalid or expired state')
  }

  const tenantId = c.env.MICROSOFT_TENANT_ID || 'common'
  const tokenResult = await exchangeMicrosoftCode({
    code,
    clientId: c.env.MICROSOFT_CLIENT_ID,
    clientSecret: c.env.MICROSOFT_CLIENT_SECRET,
    tenantId,
    redirectUri: `${c.env.OAUTH_CALLBACK_BASE}/oauth/microsoft/callback`
  })

  if (tokenResult.error) {
    console.error('Microsoft token exchange error:', tokenResult.error)
    return redirectWithError(c, 'Failed to exchange authorization code')
  }

  const userResult = await getMicrosoftUser(tokenResult.accessToken)

  if (userResult.error) {
    console.error('Microsoft user fetch error:', userResult.error)
    return redirectWithError(c, 'Failed to fetch user information')
  }

  return handleOAuthCallback(c, userResult.user)
})

export default oauth
