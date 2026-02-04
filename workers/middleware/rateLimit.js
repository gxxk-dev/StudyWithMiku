/**
 * @module workers/middleware/rateLimit
 * @description 基于 IP 的速率限制中间件
 * 使用内存存储，Workers 实例间不共享状态
 */

import { RATE_LIMIT_CONFIG, ERROR_CODES } from '../constants.js'

/**
 * 速率限制存储
 * @type {Map<string, {count: number, resetTime: number}>}
 */
const rateLimitStore = new Map()

/**
 * 清理过期的速率限制记录
 */
const cleanupExpiredEntries = () => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * 获取客户端 IP
 * @param {Object} c - Hono Context
 * @returns {string}
 */
const getClientIP = (c) => {
  return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
}

/**
 * 创建速率限制中间件
 * @param {Object} options
 * @param {number} options.windowMs - 时间窗口 (毫秒)
 * @param {number} options.max - 最大请求数
 * @param {string} [options.keyPrefix] - 键前缀 (用于区分不同端点)
 * @returns {Function} Hono 中间件
 */
export const rateLimit = ({ windowMs, max, keyPrefix = '' }) => {
  return async (c, next) => {
    const ip = getClientIP(c)
    const key = `${keyPrefix}:${ip}`
    const now = Date.now()

    // 定期清理 (每 100 次请求)
    if (Math.random() < 0.01) {
      cleanupExpiredEntries()
    }

    let record = rateLimitStore.get(key)

    if (!record || now > record.resetTime) {
      // 新记录或已过期
      record = {
        count: 1,
        resetTime: now + windowMs
      }
      rateLimitStore.set(key, record)
    } else {
      // 增加计数
      record.count++

      if (record.count > max) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000)

        return c.json(
          {
            error: 'Too many requests',
            code: ERROR_CODES.RATE_LIMITED,
            retryAfter
          },
          429,
          {
            'Retry-After': String(retryAfter)
          }
        )
      }
    }

    // 添加速率限制信息到响应头
    await next()

    c.res.headers.set('X-RateLimit-Limit', String(max))
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, max - record.count)))
    c.res.headers.set('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)))
  }
}

/**
 * 认证端点速率限制
 */
export const authRateLimit = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH.MAX_REQUESTS,
  keyPrefix: 'auth'
})

/**
 * 数据同步端点速率限制
 */
export const dataRateLimit = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.DATA.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.DATA.MAX_REQUESTS,
  keyPrefix: 'data'
})

/**
 * 通用 API 速率限制
 */
export const generalRateLimit = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.GENERAL.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.GENERAL.MAX_REQUESTS,
  keyPrefix: 'general'
})
