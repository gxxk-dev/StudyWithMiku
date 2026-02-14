/**
 * @module workers/routes/auth/methods
 * @description 统一认证方法管理路由
 */

import { Hono } from 'hono'
import { ERROR_CODES } from '../../constants.js'
import { requireAuth } from '../../middleware/auth.js'
import { getTotalAuthMethodCount } from '../../services/user.js'
import { findCredentialsByUserId, formatCredentialAsAuthMethod } from '../../services/credential.js'
import {
  findOAuthAccountsByUserId,
  unlinkOAuthAccount,
  formatOAuthAccountForResponse
} from '../../services/oauthAccount.js'

const methods = new Hono()

/**
 * GET /methods
 * 获取当前用户所有认证方式
 */
methods.get('/', requireAuth(), async (c) => {
  const { id } = c.get('user')

  const [creds, oauthAccounts] = await Promise.all([
    findCredentialsByUserId(c.env.DB, id),
    findOAuthAccountsByUserId(c.env.DB, id)
  ])

  const allMethods = [
    ...creds.map(formatCredentialAsAuthMethod),
    ...oauthAccounts.map(formatOAuthAccountForResponse)
  ]

  return c.json({ methods: allMethods })
})

/**
 * DELETE /methods/oauth/:id
 * 解绑 OAuth 账号
 */
methods.delete('/oauth/:id', requireAuth(), async (c) => {
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

export default methods
