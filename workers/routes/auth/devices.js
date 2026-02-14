/**
 * @module workers/routes/auth/devices
 * @description 设备管理路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { ERROR_CODES } from '../../constants.js'
import { requireAuth } from '../../middleware/auth.js'
import { addDeviceVerifySchema, mergeRequestSchema } from '../../schemas/auth.js'
import { findUserById, getTotalAuthMethodCount } from '../../services/user.js'
import {
  saveCredential,
  findCredentialById,
  findCredentialsByUserId,
  deleteCredential,
  formatCredentialForResponse,
  transferCredential
} from '../../services/credential.js'
import {
  createRegistrationOptions,
  verifyRegistration,
  generateDeviceName
} from '../../services/webauthn.js'
import { hasUserData } from '../../services/userData.js'
import { mergeUserData, cleanupSourceUser } from '../../services/merge.js'
import { generateOAuthState } from '../../services/oauth.js'
import {
  getChallengeStore,
  generateChallengeId,
  storeMergeToken,
  getMergeToken,
  deleteMergeToken
} from '../../utils/authHelpers.js'

const devices = new Hono()

/**
 * GET /devices
 * 获取当前用户的设备列表
 */
devices.get('/', requireAuth(), async (c) => {
  const { id } = c.get('user')

  const credentials = await findCredentialsByUserId(c.env.DB, id)

  return c.json({
    devices: credentials.map(formatCredentialForResponse)
  })
})

/**
 * POST /devices/add/options
 * 生成添加新设备的选项
 */
devices.post('/add/options', requireAuth(), async (c) => {
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
 * POST /devices/add/verify
 * 验证添加新设备
 */
devices.post('/add/verify', requireAuth(), zValidator('json', addDeviceVerifySchema), async (c) => {
  const { id } = c.get('user')
  const { challengeId, response, deviceName } = c.req.valid('json')

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

  // 检查凭据是否已存在（属于其他用户）
  const existingCred = await findCredentialById(c.env.DB, registrationInfo.credential.id)
  if (existingCred) {
    if (existingCred.userId === id) {
      return c.json(
        {
          error: 'This credential is already registered to your account',
          code: ERROR_CODES.CREDENTIAL_EXISTS
        },
        409
      )
    }
    // 属于其他用户 — 生成 mergeToken
    const otherHasData = await hasUserData(c.env.DB, existingCred.userId)
    const mergeToken = generateOAuthState()
    await storeMergeToken(c.env, mergeToken, {
      sourceUserId: existingCred.userId,
      targetUserId: id,
      credentialId: existingCred.id
    })
    return c.json(
      {
        error: 'This credential is already registered to another user',
        code: ERROR_CODES.CREDENTIAL_EXISTS,
        hasData: otherHasData,
        mergeToken
      },
      409
    )
  }

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
})

/**
 * POST /devices/merge
 * 合并 WebAuthn 凭证（将其他用户的凭证转移到当前用户）
 */
devices.post('/merge', requireAuth(), zValidator('json', mergeRequestSchema), async (c) => {
  const { id: currentUserId } = c.get('user')
  const { mergeToken, dataChoices } = c.req.valid('json')

  // 验证 mergeToken
  const tokenRecord = await getMergeToken(c.env, mergeToken)
  if (!tokenRecord) {
    return c.json({ error: 'Invalid or expired merge token', code: ERROR_CODES.INVALID_TOKEN }, 400)
  }

  // 验证当前用户是目标用户
  if (tokenRecord.targetUserId !== currentUserId) {
    return c.json(
      { error: 'Token does not belong to current user', code: ERROR_CODES.INVALID_TOKEN },
      403
    )
  }

  // 转移凭证
  await transferCredential(c.env.DB, tokenRecord.credentialId, currentUserId)

  // 合并数据
  await mergeUserData(c.env.DB, currentUserId, tokenRecord.sourceUserId, dataChoices)

  // 清理源用户
  await cleanupSourceUser(c.env.DB, tokenRecord.sourceUserId)

  // 合并成功后消费 token，防止重放
  await deleteMergeToken(c.env, mergeToken)

  return c.json({ success: true })
})

/**
 * DELETE /devices/:id
 * 删除设备
 */
devices.delete('/:id', requireAuth(), async (c) => {
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

export default devices
