/**
 * @module workers/services/jwt
 * @description JWT Token 生成和验证服务，使用 hono/jwt
 */

import { sign, verify } from 'hono/jwt'
import { eq, lt } from 'drizzle-orm'
import { createDb, tokenBlacklist } from '../db/index.js'
import { JWT_CONFIG, ERROR_CODES, BLACKLIST_CLEANUP_PROBABILITY } from '../constants.js'

/**
 * 生成随机 JTI (JWT ID)
 * @returns {string}
 */
const generateJti = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 生成 Access Token
 * @param {Object} params
 * @param {string} params.userId - 用户 ID
 * @param {string} params.username - 用户名
 * @param {string} params.secret - JWT 密钥
 * @returns {Promise<{token: string, jti: string, exp: number}>}
 */
export const generateAccessToken = async ({ userId, username, secret }) => {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + JWT_CONFIG.ACCESS_TOKEN_TTL
  const jti = generateJti()

  const payload = {
    sub: userId,
    username,
    type: JWT_CONFIG.TOKEN_TYPE.ACCESS,
    iat: now,
    exp,
    jti
  }

  const token = await sign(payload, secret, JWT_CONFIG.ALGORITHM)
  return { token, jti, exp }
}

/**
 * 生成 Refresh Token
 * @param {Object} params
 * @param {string} params.userId - 用户 ID
 * @param {string} params.secret - JWT 密钥
 * @returns {Promise<{token: string, jti: string, exp: number}>}
 */
export const generateRefreshToken = async ({ userId, secret }) => {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + JWT_CONFIG.REFRESH_TOKEN_TTL
  const jti = generateJti()

  const payload = {
    sub: userId,
    type: JWT_CONFIG.TOKEN_TYPE.REFRESH,
    iat: now,
    exp,
    jti
  }

  const token = await sign(payload, secret, JWT_CONFIG.ALGORITHM)
  return { token, jti, exp }
}

/**
 * 生成 Token 对 (Access + Refresh)
 * @param {Object} params
 * @param {string} params.userId - 用户 ID
 * @param {string} params.username - 用户名
 * @param {string} params.secret - JWT 密钥
 * @returns {Promise<{accessToken: string, refreshToken: string, accessJti: string, refreshJti: string, accessExp: number, refreshExp: number}>}
 */
export const generateTokenPair = async ({ userId, username, secret }) => {
  const [access, refresh] = await Promise.all([
    generateAccessToken({ userId, username, secret }),
    generateRefreshToken({ userId, secret })
  ])

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    accessJti: access.jti,
    refreshJti: refresh.jti,
    accessExp: access.exp,
    refreshExp: refresh.exp
  }
}

/**
 * 验证 Token
 * @param {string} token - JWT Token
 * @param {string} secret - JWT 密钥
 * @param {string} expectedType - 期望的 Token 类型
 * @returns {Promise<{valid: boolean, payload?: Object, error?: string, code?: string}>}
 */
export const verifyToken = async (token, secret, expectedType = JWT_CONFIG.TOKEN_TYPE.ACCESS) => {
  try {
    const payload = await verify(token, secret, JWT_CONFIG.ALGORITHM)

    // 检查 Token 类型
    if (payload.type !== expectedType) {
      return {
        valid: false,
        error: 'Invalid token type',
        code: ERROR_CODES.INVALID_TOKEN
      }
    }

    return { valid: true, payload }
  } catch (error) {
    // hono/jwt 会抛出 JwtTokenExpired 等错误
    if (error.name === 'JwtTokenExpired') {
      return {
        valid: false,
        error: 'Token expired',
        code: ERROR_CODES.TOKEN_EXPIRED
      }
    }

    return {
      valid: false,
      error: 'Invalid token',
      code: ERROR_CODES.INVALID_TOKEN
    }
  }
}

/**
 * 检查 Token 是否在黑名单中
 * @param {Object} d1 - D1 数据库实例
 * @param {string} jti - JWT ID
 * @returns {Promise<boolean>}
 */
export const isTokenBlacklisted = async (d1, jti) => {
  const db = createDb(d1)
  const result = await db
    .select({ jti: tokenBlacklist.jti })
    .from(tokenBlacklist)
    .where(eq(tokenBlacklist.jti, jti))
    .get()
  return !!result
}

/**
 * 将 Token 加入黑名单
 * @param {Object} d1 - D1 数据库实例
 * @param {string} jti - JWT ID
 * @param {number} expiresAt - Token 原始过期时间 (Unix 时间戳)
 * @returns {Promise<void>}
 */
export const blacklistToken = async (d1, jti, expiresAt) => {
  const db = createDb(d1)
  await db
    .insert(tokenBlacklist)
    .values({ jti, expiresAt })
    .onConflictDoNothing({ target: tokenBlacklist.jti })

  // 概率性清理过期条目
  if (Math.random() < BLACKLIST_CLEANUP_PROBABILITY) {
    await cleanupBlacklist(d1)
  }
}

/**
 * 清理过期的黑名单条目
 * @param {Object} d1 - D1 数据库实例
 * @returns {Promise<void>}
 */
export const cleanupBlacklist = async (d1) => {
  const db = createDb(d1)
  const now = Math.floor(Date.now() / 1000)
  await db.delete(tokenBlacklist).where(lt(tokenBlacklist.expiresAt, now))
}

/**
 * 从 Authorization Header 提取 Token
 * @param {string|null} authHeader - Authorization 头
 * @returns {string|null}
 */
export const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}
