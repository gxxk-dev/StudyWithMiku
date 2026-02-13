/**
 * @module workers/routes/oauth
 * @description OAuth 认证路由 (GitHub/Google/Microsoft)
 */

import { Hono } from 'hono'
import { ERROR_CODES, JWT_CONFIG } from '../constants.js'
import { authRateLimit } from '../middleware/rateLimit.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createUser,
  usernameExists,
  sanitizeUsername,
  findUserById,
  updateUser,
  formatUserForResponse
} from '../services/user.js'
import { generateTokenPair } from '../services/jwt.js'
import {
  findOAuthAccount,
  linkOAuthAccount,
  findOAuthAccountsByUserId
} from '../services/oauthAccount.js'
import { resolveAvatars } from '../utils/avatar.js'
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
 * @type {Map<string, {createdAt: number, provider: string, linkUserId?: string}>}
 */
const oauthStates = new Map()

/** OAuth state 有效期 (10 分钟) */
const OAUTH_STATE_TTL = 10 * 60 * 1000

/**
 * 验证并消费 OAuth state，返回完整 state 记录
 * @param {string} state
 * @param {string} expectedProvider
 * @returns {Object|null} state 记录或 null
 */
const validateState = (state, expectedProvider) => {
  const record = oauthStates.get(state)
  if (!record) return null

  oauthStates.delete(state)

  if (Date.now() - record.createdAt > OAUTH_STATE_TTL) return null
  if (record.provider !== expectedProvider) return null

  return record
}

/**
 * 生成带 Token 的重定向响应 (前端使用 fragment 接收)
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
 */
const redirectWithError = (c, error) => {
  const baseUrl = c.env.OAUTH_CALLBACK_BASE
  return c.redirect(`${baseUrl}/#error=${encodeURIComponent(error)}`)
}

/**
 * 生成 OAuth link 结果重定向
 */
const redirectWithLinkResult = (c, result) => {
  const baseUrl = c.env.OAUTH_CALLBACK_BASE
  return c.redirect(`${baseUrl}/#link_result=${encodeURIComponent(JSON.stringify(result))}`)
}

/**
 * 通用 OAuth 回调处理 — 使用 oauth_accounts 表
 */
const handleOAuthCallback = async (c, oauthUser) => {
  // 查找已关联的 OAuth 账号
  const existingAccount = await findOAuthAccount(c.env.DB, oauthUser.provider, oauthUser.providerId)

  let user
  let isNew = false

  if (existingAccount) {
    // 已关联，直接获取用户
    user = await findUserById(c.env.DB, existingAccount.userId)
    if (!user) {
      return redirectWithError(c, 'User not found')
    }

    // 自动回填 email（用户无 email 但 OAuth 有）
    if (!user.email && oauthUser.email) {
      await updateUser(c.env.DB, user.id, { email: oauthUser.email })
      user = await findUserById(c.env.DB, user.id)
    }
  } else {
    // 新用户：创建用户 + 关联 OAuth 账号
    let username = sanitizeUsername(oauthUser.username)
    let suffix = 0
    while (await usernameExists(c.env.DB, username)) {
      suffix++
      username = `${sanitizeUsername(oauthUser.username)}${suffix}`
    }

    user = await createUser(c.env.DB, {
      username,
      displayName: oauthUser.displayName,
      avatarUrl: oauthUser.avatarUrl,
      email: oauthUser.email
    })

    await linkOAuthAccount(c.env.DB, {
      userId: user.id,
      provider: oauthUser.provider,
      providerId: oauthUser.providerId,
      displayName: oauthUser.displayName,
      avatarUrl: oauthUser.avatarUrl,
      email: oauthUser.email
    })

    isNew = true
  }

  // 查询 OAuth 账号并计算头像
  const oauthAccts = await findOAuthAccountsByUserId(c.env.DB, user.id)
  const emailForAvatar = user.email || oauthAccts.find((a) => a.email)?.email || null
  const avatars = await resolveAvatars({
    email: emailForAvatar,
    qqNumber: user.qqNumber,
    oauthAccounts: oauthAccts
  })

  // 生成 Token
  const tokens = await generateTokenPair({
    userId: user.id,
    username: user.username,
    secret: c.env.JWT_SECRET
  })

  return redirectWithTokens(c, tokens, isNew, formatUserForResponse(user, { avatars }))
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

  const stateRecord = validateState(state, 'github')
  if (!stateRecord) {
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

  const stateRecord = validateState(state, 'google')
  if (!stateRecord) {
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

  const stateRecord = validateState(state, 'microsoft')
  if (!stateRecord) {
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

// ============================================================
// OAuth Link (关联已有账号)
// ============================================================

/** Provider 配置映射 */
const providerConfig = {
  github: {
    envCheck: (env) => env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET,
    buildAuthUrl: (env, state, redirectUri) =>
      buildGitHubAuthUrl({
        clientId: env.GITHUB_CLIENT_ID,
        redirectUri,
        state
      }),
    exchangeCode: (env, code, redirectUri) =>
      exchangeGitHubCode({
        code,
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectUri
      }),
    getUser: (accessToken) => getGitHubUser(accessToken)
  },
  google: {
    envCheck: (env) => env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
    buildAuthUrl: (env, state, redirectUri) =>
      buildGoogleAuthUrl({
        clientId: env.GOOGLE_CLIENT_ID,
        redirectUri,
        state
      }),
    exchangeCode: (env, code, redirectUri) =>
      exchangeGoogleCode({
        code,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri
      }),
    getUser: (accessToken) => getGoogleUser(accessToken)
  },
  microsoft: {
    envCheck: (env) => env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET,
    buildAuthUrl: (env, state, redirectUri) => {
      const tenantId = env.MICROSOFT_TENANT_ID || 'common'
      return buildMicrosoftAuthUrl({
        clientId: env.MICROSOFT_CLIENT_ID,
        tenantId,
        redirectUri,
        state
      })
    },
    exchangeCode: (env, code, redirectUri) => {
      const tenantId = env.MICROSOFT_TENANT_ID || 'common'
      return exchangeMicrosoftCode({
        code,
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        tenantId,
        redirectUri
      })
    },
    getUser: (accessToken) => getMicrosoftUser(accessToken)
  }
}

/**
 * POST /oauth/link/:provider
 * 发起 OAuth 关联（需要登录）
 */
oauth.post('/link/:provider', requireAuth(), authRateLimit, (c) => {
  const provider = c.req.param('provider')
  const config = providerConfig[provider]

  if (!config) {
    return c.json({ error: 'Unsupported provider', code: ERROR_CODES.VALIDATION_FAILED }, 400)
  }

  if (!config.envCheck(c.env)) {
    return c.json(
      { error: `${provider} OAuth not configured`, code: ERROR_CODES.NOT_IMPLEMENTED },
      501
    )
  }

  const userId = c.get('user').id
  const state = generateOAuthState()
  oauthStates.set(state, { createdAt: Date.now(), provider, linkUserId: userId })

  const redirectUri = `${c.env.OAUTH_CALLBACK_BASE}/oauth/link/${provider}/callback`
  const authUrl = config.buildAuthUrl(c.env, state, redirectUri)

  return c.json({ authUrl })
})

/**
 * GET /oauth/link/:provider/callback
 * OAuth 关联回调
 */
oauth.get('/link/:provider/callback', authRateLimit, async (c) => {
  const provider = c.req.param('provider')
  const config = providerConfig[provider]

  if (!config) {
    return redirectWithLinkResult(c, { success: false, error: 'Unsupported provider' })
  }

  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')

  if (error) {
    return redirectWithLinkResult(c, { success: false, error: 'OAuth authorization failed' })
  }

  if (!code || !state) {
    return redirectWithLinkResult(c, { success: false, error: 'Missing authorization parameters' })
  }

  const stateRecord = validateState(state, provider)
  if (!stateRecord || !stateRecord.linkUserId) {
    return redirectWithLinkResult(c, { success: false, error: 'Invalid or expired state' })
  }

  const redirectUri = `${c.env.OAUTH_CALLBACK_BASE}/oauth/link/${provider}/callback`

  // 交换授权码
  const tokenResult = await config.exchangeCode(c.env, code, redirectUri)
  if (tokenResult.error) {
    console.error(`${provider} link token exchange error:`, tokenResult.error)
    return redirectWithLinkResult(c, {
      success: false,
      error: 'Failed to exchange authorization code'
    })
  }

  // 获取用户信息
  const userResult = await config.getUser(tokenResult.accessToken)
  if (userResult.error) {
    console.error(`${provider} link user fetch error:`, userResult.error)
    return redirectWithLinkResult(c, {
      success: false,
      error: 'Failed to fetch user information'
    })
  }

  // 检查该 OAuth 账号是否已关联其他用户
  const existingAccount = await findOAuthAccount(
    c.env.DB,
    userResult.user.provider,
    userResult.user.providerId
  )

  if (existingAccount) {
    return redirectWithLinkResult(c, {
      success: false,
      error: 'This account is already linked to another user',
      code: ERROR_CODES.OAUTH_ALREADY_LINKED
    })
  }

  // 创建关联
  await linkOAuthAccount(c.env.DB, {
    userId: stateRecord.linkUserId,
    provider: userResult.user.provider,
    providerId: userResult.user.providerId,
    displayName: userResult.user.displayName,
    avatarUrl: userResult.user.avatarUrl,
    email: userResult.user.email
  })

  return redirectWithLinkResult(c, { success: true })
})

export default oauth
