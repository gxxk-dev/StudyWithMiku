/**
 * @fileoverview 认证数据存储工具
 * @module utils/authStorage
 */

import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  safeLocalStorageGetJSON,
  safeLocalStorageSetJSON
} from './storage.js'

/**
 * 存储键名
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'swm_access_token',
  REFRESH_TOKEN: 'swm_refresh_token',
  TOKEN_EXPIRES_AT: 'swm_token_expires_at',
  TOKEN_TYPE: 'swm_token_type',
  USER_INFO: 'swm_user_info',
  DEVICE_ID: 'swm_device_id'
}

/**
 * 保存认证令牌
 * @param {string} accessToken - 访问令牌
 * @param {string} refreshToken - 刷新令牌
 * @param {number} expiresIn - 过期时间（秒）
 * @param {string} [tokenType='Bearer'] - 令牌类型
 */
export const saveTokens = (accessToken, refreshToken, expiresIn, tokenType = 'Bearer') => {
  const expiresAt = Date.now() + expiresIn * 1000

  safeLocalStorageSet(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
  safeLocalStorageSet(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
  safeLocalStorageSet(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString())
  safeLocalStorageSet(STORAGE_KEYS.TOKEN_TYPE, tokenType)
}

/**
 * 获取访问令牌
 * @returns {string|null} 访问令牌
 */
export const getAccessToken = () => {
  return safeLocalStorageGet(STORAGE_KEYS.ACCESS_TOKEN)
}

/**
 * 获取刷新令牌
 * @returns {string|null} 刷新令牌
 */
export const getRefreshToken = () => {
  return safeLocalStorageGet(STORAGE_KEYS.REFRESH_TOKEN)
}

/**
 * 获取令牌类型
 * @returns {string} 令牌类型
 */
export const getTokenType = () => {
  return safeLocalStorageGet(STORAGE_KEYS.TOKEN_TYPE) || 'Bearer'
}

/**
 * 获取令牌过期时间
 * @returns {number|null} 过期时间戳
 */
export const getTokenExpiresAt = () => {
  const expiresAt = safeLocalStorageGet(STORAGE_KEYS.TOKEN_EXPIRES_AT)
  return expiresAt ? parseInt(expiresAt, 10) : null
}

/**
 * 检查令牌是否即将过期
 * @param {number} [threshold=60] - 提前刷新阈值（秒）
 * @returns {boolean} 是否即将过期
 */
export const isTokenExpiringSoon = (threshold = 60) => {
  const expiresAt = getTokenExpiresAt()
  if (!expiresAt) return true

  const now = Date.now()
  const thresholdMs = threshold * 1000

  return expiresAt - now <= thresholdMs
}

/**
 * 检查令牌是否已过期
 * @returns {boolean} 是否已过期
 */
export const isTokenExpired = () => {
  const expiresAt = getTokenExpiresAt()
  if (!expiresAt) return true

  return Date.now() >= expiresAt
}

/**
 * 获取完整的令牌信息
 * @returns {import('../types/auth.js').AuthTokens|null} 令牌信息
 */
export const getTokens = () => {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()
  const expiresAt = getTokenExpiresAt()
  const tokenType = getTokenType()

  if (!accessToken || !refreshToken || !expiresAt) {
    return null
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    tokenType
  }
}

/**
 * 清除所有令牌
 */
export const clearTokens = () => {
  safeLocalStorageRemove(STORAGE_KEYS.ACCESS_TOKEN)
  safeLocalStorageRemove(STORAGE_KEYS.REFRESH_TOKEN)
  safeLocalStorageRemove(STORAGE_KEYS.TOKEN_EXPIRES_AT)
  safeLocalStorageRemove(STORAGE_KEYS.TOKEN_TYPE)
}

/**
 * 保存用户信息
 * @param {import('../types/auth.js').User} user - 用户信息
 */
export const saveUser = (user) => {
  safeLocalStorageSetJSON(STORAGE_KEYS.USER_INFO, user)
}

/**
 * 获取用户信息
 * @returns {import('../types/auth.js').User|null} 用户信息
 */
export const getUser = () => {
  return safeLocalStorageGetJSON(STORAGE_KEYS.USER_INFO)
}

/**
 * 清除用户信息
 */
export const clearUser = () => {
  safeLocalStorageRemove(STORAGE_KEYS.USER_INFO)
}

/**
 * 保存设备 ID
 * @param {string} deviceId - 设备 ID
 */
export const saveDeviceId = (deviceId) => {
  safeLocalStorageSet(STORAGE_KEYS.DEVICE_ID, deviceId)
}

/**
 * 获取设备 ID
 * @returns {string|null} 设备 ID
 */
export const getDeviceId = () => {
  return safeLocalStorageGet(STORAGE_KEYS.DEVICE_ID)
}

/**
 * 清除设备 ID
 */
export const clearDeviceId = () => {
  safeLocalStorageRemove(STORAGE_KEYS.DEVICE_ID)
}

/**
 * 清除所有认证数据
 */
export const clearAllAuthData = () => {
  clearTokens()
  clearUser()
  clearDeviceId()
}

/**
 * 检查是否有有效的认证状态
 * @returns {boolean} 是否已认证
 */
export const hasValidAuth = () => {
  const tokens = getTokens()
  const user = getUser()

  return !!(tokens && user && !isTokenExpired())
}
