/**
 * @module workers/utils/cookie
 * @description Refresh Token Cookie 工具函数
 */

const COOKIE_NAME = 'swm_refresh_token'

/**
 * 判断是否为开发环境
 * @param {Object} env - Worker 环境变量
 * @returns {boolean}
 */
const isDev = (env) => {
  if (env.ENVIRONMENT === 'development' || env.ENVIRONMENT === 'dev') return true
  if (env.OAUTH_CALLBACK_BASE && env.OAUTH_CALLBACK_BASE.startsWith('http://')) return true
  return false
}

/**
 * 构建 Set-Cookie 头值（设置 Refresh Token）
 * @param {string} token - Refresh Token
 * @param {number} maxAge - 有效期（秒）
 * @param {Object} env - Worker 环境变量
 * @returns {string} Set-Cookie 头值
 */
export const buildRefreshTokenCookie = (token, maxAge, env) => {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/auth',
    'HttpOnly',
    'SameSite=Strict'
  ]

  if (!isDev(env)) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * 构建清除 Refresh Token 的 Set-Cookie 头值
 * @param {Object} env - Worker 环境变量
 * @returns {string} Set-Cookie 头值
 */
export const buildClearRefreshTokenCookie = (env) => {
  const parts = [`${COOKIE_NAME}=`, 'Max-Age=0', 'Path=/auth', 'HttpOnly', 'SameSite=Strict']

  if (!isDev(env)) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * 从 Cookie 头字符串中解析指定 name 的 cookie 值
 * @param {string} cookieHeader - Cookie 头字符串
 * @param {string} name - Cookie 名称
 * @returns {string|null} Cookie 值
 */
export const parseCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=')
    if (key.trim() === name) {
      return rest.join('=').trim()
    }
  }

  return null
}
