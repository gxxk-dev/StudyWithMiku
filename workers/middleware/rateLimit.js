/**
 * @module workers/middleware/rateLimit
 * @description 基于 Durable Object 的分布式速率限制中间件
 * 通过 RateLimiter DO 实现跨 Worker 实例的一致限流
 */

import { RATE_LIMIT_CONFIG, ERROR_CODES } from '../constants.js'

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

    const id = c.env.RATE_LIMITER.idFromName(key)
    const stub = c.env.RATE_LIMITER.get(id)

    const res = await stub.fetch('https://rate-limiter/check', {
      method: 'POST',
      body: JSON.stringify({ windowMs, max })
    })

    const { allowed, remaining, resetTime, retryAfter } = await res.json()

    if (!allowed) {
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

    await next()

    c.res.headers.set('X-RateLimit-Limit', String(max))
    c.res.headers.set('X-RateLimit-Remaining', String(remaining))
    c.res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)))
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
