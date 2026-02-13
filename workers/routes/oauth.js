/**
 * @module workers/routes/oauth
 * @description OAuth 认证路由 (GitHub/Google/Microsoft/LINUX DO)
 *
 * 使用 providerConfig 注册表驱动，新增 provider 只需添加一个配置条目。
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
  getMicrosoftUser,
  buildLinuxDoAuthUrl,
  exchangeLinuxDoCode,
  getLinuxDoUser
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
// Provider 配置注册表
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
  },
  linuxdo: {
    envCheck: (env) => env.LINUXDO_CLIENT_ID && env.LINUXDO_CLIENT_SECRET,
    buildAuthUrl: (env, state, redirectUri) =>
      buildLinuxDoAuthUrl({
        clientId: env.LINUXDO_CLIENT_ID,
        redirectUri,
        state
      }),
    exchangeCode: (env, code, redirectUri) =>
      exchangeLinuxDoCode({
        code,
        clientId: env.LINUXDO_CLIENT_ID,
        clientSecret: env.LINUXDO_CLIENT_SECRET,
        redirectUri
      }),
    getUser: (accessToken) => getLinuxDoUser(accessToken)
  }
}

// ============================================================
// OAuth Link (关联已有账号) — 必须在通用路由之前注册
// ============================================================

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

  const redirectUri = `${c.env.OAUTH_CALLBACK_BASE}/oauth/${provider}/callback`
  const authUrl = config.buildAuthUrl(c.env, state, redirectUri)

  return c.json({ authUrl })
})

// ============================================================
// 通用 OAuth 登录路由
// ============================================================

/**
 * GET /oauth/:provider
 * 发起 OAuth 授权（通用）
 */
oauth.get('/:provider', authRateLimit, (c) => {
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

  const state = generateOAuthState()
  oauthStates.set(state, { createdAt: Date.now(), provider })

  const redirectUri = `${c.env.OAUTH_CALLBACK_BASE}/oauth/${provider}/callback`
  const authUrl = config.buildAuthUrl(c.env, state, redirectUri)

  return c.redirect(authUrl)
})

/**
 * GET /oauth/:provider/callback
 * OAuth 回调（通用）
 */
oauth.get('/:provider/callback', authRateLimit, async (c) => {
  const provider = c.req.param('provider')
  const config = providerConfig[provider]

  if (!config) {
    return redirectWithError(c, 'Unsupported provider')
  }

  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')

  if (error) {
    console.error(`${provider} OAuth error:`, error)
    return redirectWithError(c, 'OAuth authorization failed')
  }

  if (!code || !state) {
    return redirectWithError(c, 'Missing authorization parameters')
  }

  const stateRecord = validateState(state, provider)
  if (!stateRecord) {
    return redirectWithError(c, 'Invalid or expired state')
  }

  const isLink = !!stateRecord.linkUserId
  const withError = isLink
    ? (msg) => redirectWithLinkResult(c, { success: false, error: msg })
    : (msg) => redirectWithError(c, msg)

  const redirectUri = `${c.env.OAUTH_CALLBACK_BASE}/oauth/${provider}/callback`

  // 交换授权码
  const tokenResult = await config.exchangeCode(c.env, code, redirectUri)
  if (tokenResult.error) {
    console.error(`${provider} token exchange error:`, tokenResult.error)
    return withError('Failed to exchange authorization code')
  }

  // 获取用户信息
  const userResult = await config.getUser(tokenResult.accessToken)
  if (userResult.error) {
    console.error(`${provider} user fetch error:`, userResult.error)
    return withError('Failed to fetch user information')
  }

  // 关联账号流程
  if (isLink) {
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

    await linkOAuthAccount(c.env.DB, {
      userId: stateRecord.linkUserId,
      provider: userResult.user.provider,
      providerId: userResult.user.providerId,
      displayName: userResult.user.displayName,
      avatarUrl: userResult.user.avatarUrl,
      email: userResult.user.email
    })

    return redirectWithLinkResult(c, { success: true })
  }

  // 登录/注册流程
  return handleOAuthCallback(c, userResult.user)
})

export default oauth
