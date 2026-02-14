/**
 * @module workers/routes/auth/login
 * @description WebAuthn 登录路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { ERROR_CODES, JWT_CONFIG } from '../../constants.js'
import { authRateLimit } from '../../middleware/rateLimit.js'
import { loginOptionsSchema, loginVerifySchema } from '../../schemas/auth.js'
import { findUserByUsername, findUserById, formatUserForResponse } from '../../services/user.js'
import { findCredentialsByUserId, updateCredentialCounter } from '../../services/credential.js'
import { createAuthenticationOptions, verifyAuthentication } from '../../services/webauthn.js'
import { generateTokenPair } from '../../services/jwt.js'
import { getChallengeStore, generateChallengeId } from '../../utils/authHelpers.js'
import { buildRefreshTokenCookie } from '../../utils/cookie.js'

const login = new Hono()

/**
 * POST /login/options
 * 生成 WebAuthn 认证选项
 */
login.post('/options', authRateLimit, zValidator('json', loginOptionsSchema), async (c) => {
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
 * POST /login/verify
 * 验证 WebAuthn 认证响应
 */
login.post('/verify', authRateLimit, zValidator('json', loginVerifySchema), async (c) => {
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

  c.header(
    'Set-Cookie',
    buildRefreshTokenCookie(tokens.refreshToken, JWT_CONFIG.REFRESH_TOKEN_TTL, c.env)
  )

  const result = {
    user: formatUserForResponse(user),
    tokens: {
      accessToken: tokens.accessToken,
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

export default login
