/**
 * @module workers/middleware/securityHeaders
 * @description 安全响应头中间件
 */

/**
 * 安全响应头配置
 * @type {Object}
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

/**
 * 安全响应头中间件
 * @returns {Function} Hono 中间件
 */
export const securityHeaders = () => {
  return async (c, next) => {
    await next()

    // WebSocket 升级响应的 headers 是不可变的，跳过
    if (c.res.status === 101) {
      return
    }

    // 添加安全头
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      c.res.headers.set(key, value)
    }
  }
}
