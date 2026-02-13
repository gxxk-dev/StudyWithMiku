/**
 * @module workers/routes/auth
 * @description WebAuthn 认证路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { ERROR_CODES, JWT_CONFIG } from '../constants.js'
import { authRateLimit } from '../middleware/rateLimit.js'
import { requireAuth } from '../middleware/auth.js'
import {
  registerOptionsSchema,
  registerVerifySchema,
  loginOptionsSchema,
  loginVerifySchema,
  refreshTokenSchema,
  addDeviceVerifySchema,
  updateProfileSchema
} from '../schemas/auth.js'
import {
  findUserByUsername,
  findUserById,
  usernameExists,
  isValidUsername,
  createWebAuthnUser,
  updateUser,
  formatUserForResponse,
  getTotalAuthMethodCount
} from '../services/user.js'
import {
  saveCredential,
  findCredentialsByUserId,
  updateCredentialCounter,
  deleteCredential,
  formatCredentialForResponse,
  formatCredentialAsAuthMethod
} from '../services/credential.js'
import {
  findOAuthAccountsByUserId,
  unlinkOAuthAccount,
  formatOAuthAccountForResponse
} from '../services/oauthAccount.js'
import { resolveAvatars } from '../utils/avatar.js'
import {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  generateDeviceName
} from '../services/webauthn.js'
import {
  generateTokenPair,
  verifyToken,
  blacklistToken,
  isTokenBlacklisted
} from '../services/jwt.js'

const auth = new Hono()

/**
 * 获取 AuthChallenge Durable Object 实例
 */
const getChallengeStore = (env) => {
  const id = env.AUTH_CHALLENGE.idFromName('global')
  return env.AUTH_CHALLENGE.get(id)
}

/**
 * 生成挑战 ID
 */
const generateChallengeId = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * GET /auth/config
 * 获取服务端认证配置
 */
auth.get('/config', (c) => {
  return c.json({
    webauthn: true,
    oauth: {
      github: !!c.env.GITHUB_CLIENT_ID && !!c.env.GITHUB_CLIENT_SECRET,
      google: !!c.env.GOOGLE_CLIENT_ID && !!c.env.GOOGLE_CLIENT_SECRET,
      microsoft: !!c.env.MICROSOFT_CLIENT_ID && !!c.env.MICROSOFT_CLIENT_SECRET,
      linuxdo: !!c.env.LINUXDO_CLIENT_ID && !!c.env.LINUXDO_CLIENT_SECRET
    }
  })
})

// ============================================================
// 注册流程
// ============================================================

/**
 * POST /auth/register/options
 * 生成 WebAuthn 注册选项
 */
auth.post(
  '/register/options',
  authRateLimit,
  zValidator('json', registerOptionsSchema),
  async (c) => {
    const { username, displayName } = c.req.valid('json')

    // 验证用户名格式
    if (!isValidUsername(username)) {
      return c.json(
        {
          error: 'Invalid username format',
          code: ERROR_CODES.VALIDATION_FAILED
        },
        400
      )
    }

    // 检查用户名是否已存在
    if (await usernameExists(c.env.DB, username)) {
      return c.json(
        {
          error: 'Username already exists',
          code: ERROR_CODES.USER_EXISTS
        },
        409
      )
    }

    // 生成临时用户 ID 用于注册
    const tempUserId = generateChallengeId()

    // 生成注册选项
    const options = await createRegistrationOptions({
      userId: tempUserId,
      username,
      displayName: displayName || username,
      rpId: c.env.WEBAUTHN_RP_ID,
      rpName: c.env.WEBAUTHN_RP_NAME,
      db: c.env.DB
    })

    // 存储挑战
    const challengeId = generateChallengeId()
    const challengeStore = getChallengeStore(c.env)

    await challengeStore.fetch(new URL('http://internal').href, {
      method: 'PUT',
      body: JSON.stringify({
        challengeId,
        challenge: options.challenge,
        userId: tempUserId,
        type: 'register',
        username,
        displayName: displayName || username
      })
    })

    return c.json({
      challengeId,
      options
    })
  }
)

/**
 * POST /auth/register/verify
 * 验证 WebAuthn 注册响应
 */
auth.post(
  '/register/verify',
  authRateLimit,
  zValidator('json', registerVerifySchema),
  async (c) => {
    const { challengeId, response, deviceName } = c.req.valid('json')

    // 获取挑战
    const challengeStore = getChallengeStore(c.env)
    const challengeRes = await challengeStore.fetch(
      new URL(`http://internal?id=${challengeId}`).href
    )

    if (!challengeRes.ok) {
      const error = await challengeRes.json()
      return c.json(
        {
          error: error.error || 'Invalid challenge',
          code:
            challengeRes.status === 410
              ? ERROR_CODES.CHALLENGE_EXPIRED
              : ERROR_CODES.CHALLENGE_INVALID
        },
        400
      )
    }

    const challengeData = await challengeRes.json()

    if (challengeData.type !== 'register') {
      return c.json(
        {
          error: 'Invalid challenge type',
          code: ERROR_CODES.CHALLENGE_INVALID
        },
        400
      )
    }

    // 删除已使用的挑战
    await challengeStore.fetch(new URL(`http://internal?id=${challengeId}`).href, {
      method: 'DELETE'
    })

    // 再次检查用户名是否已存在 (防止并发注册)
    if (await usernameExists(c.env.DB, challengeData.username)) {
      return c.json(
        {
          error: 'Username already exists',
          code: ERROR_CODES.USER_EXISTS
        },
        409
      )
    }

    // 验证注册响应
    const origin = c.req.header('Origin') || `https://${c.env.WEBAUTHN_RP_ID}`
    const verification = await verifyRegistration({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: c.env.WEBAUTHN_RP_ID
    })

    if (!verification.verified) {
      return c.json(
        {
          error: verification.error || 'Verification failed',
          code: ERROR_CODES.VERIFICATION_FAILED
        },
        400
      )
    }

    const { registrationInfo } = verification

    // 使用事务创建用户和凭证
    const user = await createWebAuthnUser(c.env.DB, {
      username: challengeData.username,
      displayName: challengeData.displayName
    })

    await saveCredential(c.env.DB, {
      credentialId: registrationInfo.credential.id,
      userId: user.id,
      publicKey: registrationInfo.credential.publicKey,
      counter: registrationInfo.credential.counter,
      transports: response.response.transports,
      deviceType: registrationInfo.credentialDeviceType,
      deviceName: deviceName || generateDeviceName(response.response.transports),
      backedUp: registrationInfo.credentialBackedUp
    })

    // 生成 Token
    const tokens = await generateTokenPair({
      userId: user.id,
      username: user.username,
      secret: c.env.JWT_SECRET
    })

    return c.json({
      user: formatUserForResponse(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_TTL,
        tokenType: 'Bearer'
      }
    })
  }
)

// ============================================================
// 登录流程
// ============================================================

/**
 * POST /auth/login/options
 * 生成 WebAuthn 认证选项
 */
auth.post('/login/options', authRateLimit, zValidator('json', loginOptionsSchema), async (c) => {
  const { username } = c.req.valid('json')

  // 查找用户
  const user = await findUserByUsername(c.env.DB, username)
  if (!user) {
    // 防止用户枚举攻击，返回通用错误
    return c.json(
      {
        error: 'Authentication failed',
        code: ERROR_CODES.INVALID_CREDENTIALS
      },
      400
    )
  }

  // 检查用户是否有 WebAuthn 凭证
  const userCredentials = await findCredentialsByUserId(c.env.DB, user.id)
  if (userCredentials.length === 0) {
    return c.json(
      {
        error: 'No WebAuthn credentials found, please login with your OAuth provider',
        code: ERROR_CODES.INVALID_CREDENTIALS
      },
      400
    )
  }

  // 生成认证选项
  const options = await createAuthenticationOptions({
    userId: user.id,
    rpId: c.env.WEBAUTHN_RP_ID,
    db: c.env.DB
  })

  // 存储挑战
  const challengeId = generateChallengeId()
  const challengeStore = getChallengeStore(c.env)

  await challengeStore.fetch(new URL('http://internal').href, {
    method: 'PUT',
    body: JSON.stringify({
      challengeId,
      challenge: options.challenge,
      userId: user.id,
      type: 'login'
    })
  })

  return c.json({
    challengeId,
    options
  })
})

/**
 * POST /auth/login/verify
 * 验证 WebAuthn 认证响应
 */
auth.post('/login/verify', authRateLimit, zValidator('json', loginVerifySchema), async (c) => {
  const { challengeId, response } = c.req.valid('json')

  // 获取挑战
  const challengeStore = getChallengeStore(c.env)
  const challengeRes = await challengeStore.fetch(new URL(`http://internal?id=${challengeId}`).href)

  if (!challengeRes.ok) {
    return c.json(
      {
        error: 'Invalid or expired challenge',
        code: ERROR_CODES.CHALLENGE_INVALID
      },
      400
    )
  }

  const challengeData = await challengeRes.json()

  if (challengeData.type !== 'login') {
    return c.json(
      {
        error: 'Invalid challenge type',
        code: ERROR_CODES.CHALLENGE_INVALID
      },
      400
    )
  }

  // 删除已使用的挑战
  await challengeStore.fetch(new URL(`http://internal?id=${challengeId}`).href, {
    method: 'DELETE'
  })

  // 验证认证响应
  const origin = c.req.header('Origin') || `https://${c.env.WEBAUTHN_RP_ID}`
  const verification = await verifyAuthentication({
    response,
    expectedChallenge: challengeData.challenge,
    expectedOrigin: origin,
    expectedRPID: c.env.WEBAUTHN_RP_ID,
    db: c.env.DB
  })

  if (!verification.verified) {
    return c.json(
      {
        error: 'Authentication failed',
        code: ERROR_CODES.INVALID_CREDENTIALS
      },
      400
    )
  }

  // 更新计数器
  await updateCredentialCounter(c.env.DB, verification.credentialId, verification.newCounter)

  // 获取用户信息
  const user = await findUserById(c.env.DB, verification.userId)

  // 生成 Token
  const tokens = await generateTokenPair({
    userId: user.id,
    username: user.username,
    secret: c.env.JWT_SECRET
  })

  const result = {
    user: formatUserForResponse(user),
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_TTL,
      tokenType: 'Bearer'
    }
  }

  // 如果有计数器警告，添加到响应中
  if (verification.counterWarning) {
    result.warning = 'Credential may have been cloned'
  }

  return c.json(result)
})

// ============================================================
// Token 管理
// ============================================================

/**
 * POST /auth/refresh
 * 刷新 Access Token
 */
auth.post('/refresh', authRateLimit, zValidator('json', refreshTokenSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')

  // 验证 Refresh Token
  const result = await verifyToken(refreshToken, c.env.JWT_SECRET, JWT_CONFIG.TOKEN_TYPE.REFRESH)

  if (!result.valid) {
    const status = result.code === ERROR_CODES.TOKEN_EXPIRED ? 401 : 400
    return c.json(
      {
        error: result.error,
        code: result.code === ERROR_CODES.TOKEN_EXPIRED ? ERROR_CODES.SESSION_EXPIRED : result.code
      },
      status
    )
  }

  // 检查黑名单
  if (await isTokenBlacklisted(c.env.DB, result.payload.jti)) {
    return c.json(
      {
        error: 'Token has been revoked',
        code: ERROR_CODES.TOKEN_REVOKED
      },
      401
    )
  }

  // 获取用户信息
  const user = await findUserById(c.env.DB, result.payload.sub)
  if (!user) {
    return c.json(
      {
        error: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND
      },
      404
    )
  }

  // 生成新的 Token 对
  const tokens = await generateTokenPair({
    userId: user.id,
    username: user.username,
    secret: c.env.JWT_SECRET
  })

  // 将旧的 Refresh Token 加入黑名单
  await blacklistToken(c.env.DB, result.payload.jti, result.payload.exp)

  return c.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_TTL,
    tokenType: 'Bearer'
  })
})

/**
 * POST /auth/logout
 * 登出 (将当前 Token 加入黑名单)
 */
auth.post('/logout', requireAuth(), async (c) => {
  const user = c.get('user')

  // 将 Access Token 加入黑名单
  await blacklistToken(c.env.DB, user.jti, user.exp)

  // 如果请求体中有 Refresh Token，也加入黑名单
  try {
    const body = await c.req.json()
    if (body.refreshToken) {
      const result = await verifyToken(
        body.refreshToken,
        c.env.JWT_SECRET,
        JWT_CONFIG.TOKEN_TYPE.REFRESH
      )
      if (result.valid) {
        await blacklistToken(c.env.DB, result.payload.jti, result.payload.exp)
      }
    }
  } catch {
    // 忽略解析错误
  }

  return c.json({ ok: true })
})

// ============================================================
// 用户信息
// ============================================================

/**
 * GET /auth/me
 * 获取当前用户信息（含头像源）
 */
auth.get('/me', requireAuth(), async (c) => {
  const { id } = c.get('user')

  const [user, oauthAccts] = await Promise.all([
    findUserById(c.env.DB, id),
    findOAuthAccountsByUserId(c.env.DB, id)
  ])

  if (!user) {
    return c.json(
      {
        error: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND
      },
      404
    )
  }

  const emailForAvatar = user.email || oauthAccts.find((a) => a.email)?.email || null
  const avatars = await resolveAvatars({
    email: emailForAvatar,
    qqNumber: user.qqNumber,
    oauthAccounts: oauthAccts
  })

  return c.json({
    user: formatUserForResponse(user, { avatars })
  })
})

/**
 * PATCH /auth/me
 * 更新当前用户资料
 */
auth.patch('/me', requireAuth(), zValidator('json', updateProfileSchema), async (c) => {
  const { id } = c.get('user')
  const updates = c.req.valid('json')

  await updateUser(c.env.DB, id, updates)

  const [user, oauthAccts] = await Promise.all([
    findUserById(c.env.DB, id),
    findOAuthAccountsByUserId(c.env.DB, id)
  ])

  const emailForAvatar = user.email || oauthAccts.find((a) => a.email)?.email || null
  const avatars = await resolveAvatars({
    email: emailForAvatar,
    qqNumber: user.qqNumber,
    oauthAccounts: oauthAccts
  })

  return c.json({
    user: formatUserForResponse(user, { avatars })
  })
})

// ============================================================
// 设备管理
// ============================================================

/**
 * GET /auth/devices
 * 获取当前用户的设备列表
 */
auth.get('/devices', requireAuth(), async (c) => {
  const { id } = c.get('user')

  const credentials = await findCredentialsByUserId(c.env.DB, id)

  return c.json({
    devices: credentials.map(formatCredentialForResponse)
  })
})

/**
 * POST /auth/devices/add/options
 * 生成添加新设备的选项
 */
auth.post('/devices/add/options', requireAuth(), async (c) => {
  const { id, username } = c.get('user')

  const user = await findUserById(c.env.DB, id)

  // 生成注册选项
  const options = await createRegistrationOptions({
    userId: id,
    username,
    displayName: user.displayName,
    rpId: c.env.WEBAUTHN_RP_ID,
    rpName: c.env.WEBAUTHN_RP_NAME,
    db: c.env.DB
  })

  // 存储挑战
  const challengeId = generateChallengeId()
  const challengeStore = getChallengeStore(c.env)

  await challengeStore.fetch(new URL('http://internal').href, {
    method: 'PUT',
    body: JSON.stringify({
      challengeId,
      challenge: options.challenge,
      userId: id,
      type: 'add-device'
    })
  })

  return c.json({
    challengeId,
    options
  })
})

/**
 * POST /auth/devices/add/verify
 * 验证添加新设备
 */
auth.post(
  '/devices/add/verify',
  requireAuth(),
  zValidator('json', addDeviceVerifySchema),
  async (c) => {
    const { id } = c.get('user')
    const { challengeId, response, deviceName } = c.req.valid('json')

    // 获取挑战
    const challengeStore = getChallengeStore(c.env)
    const challengeRes = await challengeStore.fetch(
      new URL(`http://internal?id=${challengeId}`).href
    )

    if (!challengeRes.ok) {
      return c.json(
        {
          error: 'Invalid or expired challenge',
          code: ERROR_CODES.CHALLENGE_INVALID
        },
        400
      )
    }

    const challengeData = await challengeRes.json()

    if (challengeData.type !== 'add-device' || challengeData.userId !== id) {
      return c.json(
        {
          error: 'Invalid challenge',
          code: ERROR_CODES.CHALLENGE_INVALID
        },
        400
      )
    }

    // 删除已使用的挑战
    await challengeStore.fetch(new URL(`http://internal?id=${challengeId}`).href, {
      method: 'DELETE'
    })

    // 验证注册响应
    const origin = c.req.header('Origin') || `https://${c.env.WEBAUTHN_RP_ID}`
    const verification = await verifyRegistration({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: c.env.WEBAUTHN_RP_ID
    })

    if (!verification.verified) {
      return c.json(
        {
          error: verification.error || 'Verification failed',
          code: ERROR_CODES.VERIFICATION_FAILED
        },
        400
      )
    }

    const { registrationInfo } = verification

    // 保存新凭证
    await saveCredential(c.env.DB, {
      credentialId: registrationInfo.credential.id,
      userId: id,
      publicKey: registrationInfo.credential.publicKey,
      counter: registrationInfo.credential.counter,
      transports: response.response.transports,
      deviceType: registrationInfo.credentialDeviceType,
      deviceName: deviceName || generateDeviceName(response.response.transports),
      backedUp: registrationInfo.credentialBackedUp
    })

    return c.json({
      device: {
        id: registrationInfo.credential.id,
        credentialId: registrationInfo.credential.id,
        deviceType: registrationInfo.credentialDeviceType,
        deviceName: deviceName || generateDeviceName(response.response.transports),
        transports: response.response.transports,
        backedUp: registrationInfo.credentialBackedUp
      }
    })
  }
)

/**
 * DELETE /auth/devices/:id
 * 删除设备
 */
auth.delete('/devices/:id', requireAuth(), async (c) => {
  const userId = c.get('user').id
  const credentialId = c.req.param('id')

  // 检查是否是最后一个认证方式
  const totalCount = await getTotalAuthMethodCount(c.env.DB, userId)
  if (totalCount <= 1) {
    return c.json(
      {
        error: 'Cannot delete the last auth method',
        code: ERROR_CODES.LAST_AUTH_METHOD
      },
      400
    )
  }

  // 删除凭证
  const deleted = await deleteCredential(c.env.DB, credentialId, userId)

  if (!deleted) {
    return c.json(
      {
        error: 'Device not found',
        code: ERROR_CODES.USER_NOT_FOUND
      },
      404
    )
  }

  return c.json({ ok: true })
})

// ============================================================
// 统一认证方法管理
// ============================================================

/**
 * GET /auth/methods
 * 获取当前用户所有认证方式
 */
auth.get('/methods', requireAuth(), async (c) => {
  const { id } = c.get('user')

  const [creds, oauthAccounts] = await Promise.all([
    findCredentialsByUserId(c.env.DB, id),
    findOAuthAccountsByUserId(c.env.DB, id)
  ])

  const methods = [
    ...creds.map(formatCredentialAsAuthMethod),
    ...oauthAccounts.map(formatOAuthAccountForResponse)
  ]

  return c.json({ methods })
})

/**
 * DELETE /auth/methods/oauth/:id
 * 解绑 OAuth 账号
 */
auth.delete('/methods/oauth/:id', requireAuth(), async (c) => {
  const userId = c.get('user').id
  const accountId = c.req.param('id')

  // 检查是否是最后一个认证方式
  const totalCount = await getTotalAuthMethodCount(c.env.DB, userId)
  if (totalCount <= 1) {
    return c.json(
      {
        error: 'Cannot remove the last auth method',
        code: ERROR_CODES.LAST_AUTH_METHOD
      },
      400
    )
  }

  const deleted = await unlinkOAuthAccount(c.env.DB, accountId, userId)

  if (!deleted) {
    return c.json(
      {
        error: 'OAuth account not found',
        code: ERROR_CODES.OAUTH_ACCOUNT_NOT_FOUND
      },
      404
    )
  }

  return c.json({ ok: true })
})

export default auth
