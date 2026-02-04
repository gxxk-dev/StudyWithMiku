/**
 * @module workers/middleware/envDefaults
 * @description 自动检测和设置环境变量默认值
 */

/**
 * 从请求中提取 RP ID（域名）
 * @param {Request} request - 请求对象
 * @returns {string}
 */
const extractRpId = (request) => {
  const url = new URL(request.url)
  return url.hostname
}

/**
 * 从请求中提取回调基础 URL
 * @param {Request} request - 请求对象
 * @returns {string}
 */
const extractCallbackBase = (request) => {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

/**
 * 环境变量默认值中间件
 * 自动检测 WEBAUTHN_RP_ID 和 OAUTH_CALLBACK_BASE
 * @returns {Function} Hono 中间件
 */
export const envDefaults = () => {
  return async (c, next) => {
    // 自动设置 WEBAUTHN_RP_ID
    if (!c.env.WEBAUTHN_RP_ID) {
      c.env.WEBAUTHN_RP_ID = extractRpId(c.req.raw)
    }

    // 自动设置 WEBAUTHN_RP_NAME
    if (!c.env.WEBAUTHN_RP_NAME) {
      c.env.WEBAUTHN_RP_NAME = 'Study with Miku'
    }

    // 自动设置 OAUTH_CALLBACK_BASE
    if (!c.env.OAUTH_CALLBACK_BASE) {
      c.env.OAUTH_CALLBACK_BASE = extractCallbackBase(c.req.raw)
    }

    await next()
  }
}
