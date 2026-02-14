/**
 * @module workers/routes/auth/register
 * @description WebAuthn 注册路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { ERROR_CODES, JWT_CONFIG } from '../../constants.js'
import { authRateLimit } from '../../middleware/rateLimit.js'
import { registerOptionsSchema, registerVerifySchema } from '../../schemas/auth.js'
import {
  usernameExists,
  isValidUsername,
  createWebAuthnUser,
  formatUserForResponse
} from '../../services/user.js'
import { saveCredential, findCredentialById } from '../../services/credential.js'
import {
  createRegistrationOptions,
  verifyRegistration,
  generateDeviceName
} from '../../services/webauthn.js'
import { generateTokenPair } from '../../services/jwt.js'
import { getChallengeStore, generateChallengeId } from '../../utils/authHelpers.js'

const register = new Hono()

/**
 * POST /register/options
 * 生成 WebAuthn 注册选项
 */
register.post('/options', authRateLimit, zValidator('json', registerOptionsSchema), async (c) => {
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
})

/**
 * POST /register/verify
 * 验证 WebAuthn 注册响应
 */
register.post('/verify', authRateLimit, zValidator('json', registerVerifySchema), async (c) => {
  const { challengeId, response, deviceName } = c.req.valid('json')

  // 获取挑战
  const challengeStore = getChallengeStore(c.env)
  const challengeRes = await challengeStore.fetch(new URL(`http://internal?id=${challengeId}`).href)

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

  // Defense-in-depth: 检查凭据是否已存在
  const existingCred = await findCredentialById(c.env.DB, registrationInfo.credential.id)
  if (existingCred) {
    return c.json(
      { error: 'This credential is already registered', code: ERROR_CODES.CREDENTIAL_EXISTS },
      409
    )
  }

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
})

export default register
