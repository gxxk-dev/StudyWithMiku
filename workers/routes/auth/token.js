/**
 * @module workers/routes/auth/token
 * @description Token 管理路由（刷新、登出）
 */

import { Hono } from 'hono'
import { ERROR_CODES, JWT_CONFIG } from '../../constants.js'
import { authRateLimit } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/auth.js'
import { findUserById } from '../../services/user.js'
import {
  generateTokenPair,
  verifyToken,
  blacklistToken,
  isTokenBlacklisted
} from '../../services/jwt.js'
import {
  parseCookie,
  buildRefreshTokenCookie,
  buildClearRefreshTokenCookie
} from '../../utils/cookie.js'

const token = new Hono()

/**
 * POST /refresh
 * 刷新 Access Token（从 Cookie 读取 Refresh Token）
 */
token.post('/refresh', authRateLimit, async (c) => {
  const cookieHeader = c.req.header('Cookie')
  const refreshToken = parseCookie(cookieHeader, 'swm_refresh_token')

  if (!refreshToken) {
    return c.json(
      {
        error: 'Missing refresh token',
        code: ERROR_CODES.INVALID_TOKEN
      },
      401
    )
  }

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

  c.header(
    'Set-Cookie',
    buildRefreshTokenCookie(tokens.refreshToken, JWT_CONFIG.REFRESH_TOKEN_TTL, c.env)
  )

  return c.json({
    accessToken: tokens.accessToken,
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_TTL,
    tokenType: 'Bearer'
  })
})

/**
 * POST /logout
 * 登出 (将当前 Token 加入黑名单，清除 Refresh Token Cookie)
 */
token.post('/logout', requireAuth(), async (c) => {
  const user = c.get('user')

  // 将 Access Token 加入黑名单
  await blacklistToken(c.env.DB, user.jti, user.exp)

  // 从 Cookie 读取 Refresh Token 并加入黑名单
  const cookieHeader = c.req.header('Cookie')
  const refreshToken = parseCookie(cookieHeader, 'swm_refresh_token')
  if (refreshToken) {
    try {
      const result = await verifyToken(
        refreshToken,
        c.env.JWT_SECRET,
        JWT_CONFIG.TOKEN_TYPE.REFRESH
      )
      if (result.valid) {
        await blacklistToken(c.env.DB, result.payload.jti, result.payload.exp)
      }
    } catch {
      // 忽略解析错误
    }
  }

  // 清除 Refresh Token Cookie
  c.header('Set-Cookie', buildClearRefreshTokenCookie(c.env))

  return c.json({ ok: true })
})

export default token
