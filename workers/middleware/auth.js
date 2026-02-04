/**
 * @module workers/middleware/auth
 * @description JWT 认证中间件
 */

import { ERROR_CODES, JWT_CONFIG } from '../constants.js'
import { verifyToken, extractBearerToken, isTokenBlacklisted } from '../services/jwt.js'

/**
 * JWT 认证中间件
 * 验证 Access Token 并将用户信息挂载到 context
 * @returns {Function} Hono 中间件
 */
export const requireAuth = () => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return c.json(
        {
          error: 'Authorization required',
          code: ERROR_CODES.INVALID_TOKEN
        },
        401
      )
    }

    const secret = c.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET not configured')
      return c.json(
        {
          error: 'Server configuration error',
          code: ERROR_CODES.INTERNAL_ERROR
        },
        500
      )
    }

    // 验证 Token
    const result = await verifyToken(token, secret, JWT_CONFIG.TOKEN_TYPE.ACCESS)

    if (!result.valid) {
      return c.json(
        {
          error: result.error,
          code: result.code
        },
        401
      )
    }

    // 检查黑名单
    const isBlacklisted = await isTokenBlacklisted(c.env.DB, result.payload.jti)
    if (isBlacklisted) {
      return c.json(
        {
          error: 'Token has been revoked',
          code: ERROR_CODES.TOKEN_REVOKED
        },
        401
      )
    }

    // 将用户信息挂载到 context
    c.set('user', {
      id: result.payload.sub,
      username: result.payload.username,
      jti: result.payload.jti,
      exp: result.payload.exp
    })

    await next()
  }
}

/**
 * 可选认证中间件
 * 如果提供了有效 Token 则解析，否则继续
 * @returns {Function} Hono 中间件
 */
export const optionalAuth = () => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')
    const token = extractBearerToken(authHeader)

    if (token) {
      const secret = c.env.JWT_SECRET
      if (secret) {
        const result = await verifyToken(token, secret, JWT_CONFIG.TOKEN_TYPE.ACCESS)

        if (result.valid) {
          const isBlacklisted = await isTokenBlacklisted(c.env.DB, result.payload.jti)
          if (!isBlacklisted) {
            c.set('user', {
              id: result.payload.sub,
              username: result.payload.username,
              jti: result.payload.jti,
              exp: result.payload.exp
            })
          }
        }
      }
    }

    await next()
  }
}
