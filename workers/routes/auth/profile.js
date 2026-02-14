/**
 * @module workers/routes/auth/profile
 * @description 用户信息路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { ERROR_CODES } from '../../constants.js'
import { requireAuth } from '../../middleware/auth.js'
import { updateProfileSchema } from '../../schemas/auth.js'
import { findUserById, updateUser, formatUserForResponse } from '../../services/user.js'
import { findOAuthAccountsByUserId } from '../../services/oauthAccount.js'
import { resolveAvatars } from '../../utils/avatar.js'

const profile = new Hono()

/**
 * GET /me
 * 获取当前用户信息（含头像源）
 */
profile.get('/me', requireAuth(), async (c) => {
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
 * PATCH /me
 * 更新当前用户资料
 */
profile.patch('/me', requireAuth(), zValidator('json', updateProfileSchema), async (c) => {
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

export default profile
