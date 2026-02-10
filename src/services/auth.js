/**
 * @fileoverview 认证服务
 * @module services/auth
 *
 * 封装所有认证相关的 API 调用，包括：
 * - WebAuthn 注册和登录
 * - OAuth 登录
 * - Token 管理
 * - 用户信息获取
 * - 设备管理
 */

import { AUTH_API, OAUTH_API, AUTH_CONFIG } from '../config/constants.js'

/**
 * 错误类型枚举
 */
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  WEBAUTHN_ERROR: 'WEBAUTHN_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

/**
 * 创建认证错误对象
 * @param {string} type - 错误类型
 * @param {string} message - 错误消息
 * @param {any} details - 错误详情
 * @returns {import('../types/auth.js').AuthError} 认证错误
 */
const createAuthError = (type, message, details = null) => {
  return {
    code: type,
    message,
    type,
    details
  }
}

/**
 * 发送 API 请求（带重试机制）
 * @param {string} url - 请求 URL
 * @param {Object} options - fetch 选项
 * @param {number} retries - 剩余重试次数
 * @returns {Promise<any>} 响应数据
 */
const fetchWithRetry = async (url, options = {}, retries = AUTH_CONFIG.MAX_RETRY_ATTEMPTS) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    // 解析响应
    const data = await response.json()

    // 检查 HTTP 状态码
    if (!response.ok) {
      // Token 过期
      if (response.status === 401) {
        throw createAuthError(ERROR_TYPES.TOKEN_EXPIRED, data.error || 'Token 已过期', data)
      }

      // 其他认证错误
      throw createAuthError(
        ERROR_TYPES.AUTH_ERROR,
        data.error || `请求失败: ${response.status}`,
        data
      )
    }

    return data
  } catch (error) {
    // 网络错误，尝试重试
    if (error.name === 'TypeError' && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, AUTH_CONFIG.RETRY_DELAY))
      return fetchWithRetry(url, options, retries - 1)
    }

    // 如果是已知错误，直接抛出
    if (error.type) {
      throw error
    }

    // 未知错误
    throw createAuthError(ERROR_TYPES.NETWORK_ERROR, error.message || '网络请求失败', error)
  }
}

/**
 * 获取 WebAuthn 注册选项
 * @param {string} username - 用户名
 * @returns {Promise<Object>} 注册选项
 */
export const registerOptions = async (username) => {
  if (!username || typeof username !== 'string') {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '用户名不能为空')
  }

  return fetchWithRetry(AUTH_API.REGISTER_OPTIONS, {
    method: 'POST',
    body: JSON.stringify({ username })
  })
}

/**
 * 验证 WebAuthn 注册
 * @param {string} challengeId - 挑战 ID
 * @param {Object} response - WebAuthn 响应
 * @param {string} [deviceName] - 设备名称
 * @returns {Promise<Object>} 认证响应（包含 tokens 和 user）
 */
export const registerVerify = async (challengeId, response, deviceName) => {
  if (!challengeId || !response) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '挑战 ID 和响应不能为空')
  }

  return fetchWithRetry(AUTH_API.REGISTER_VERIFY, {
    method: 'POST',
    body: JSON.stringify({ challengeId, response, deviceName })
  })
}

/**
 * 获取 WebAuthn 登录选项
 * @param {string} username - 用户名
 * @returns {Promise<Object>} 登录选项
 */
export const loginOptions = async (username) => {
  if (!username || typeof username !== 'string') {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '用户名不能为空')
  }

  return fetchWithRetry(AUTH_API.LOGIN_OPTIONS, {
    method: 'POST',
    body: JSON.stringify({ username })
  })
}

/**
 * 验证 WebAuthn 登录
 * @param {string} challengeId - 挑战 ID
 * @param {Object} response - WebAuthn 响应
 * @returns {Promise<Object>} 认证响应（包含 tokens 和 user）
 */
export const loginVerify = async (challengeId, response) => {
  if (!challengeId || !response) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '挑战 ID 和响应不能为空')
  }

  return fetchWithRetry(AUTH_API.LOGIN_VERIFY, {
    method: 'POST',
    body: JSON.stringify({ challengeId, response })
  })
}

/**
 * 重定向到 OAuth 登录页面
 * @param {string} provider - OAuth 提供商 (github|google|microsoft)
 * @param {string} [redirectUri] - 回调 URL（可选，默认使用当前页面）
 */
export const oauthLogin = (provider, redirectUri = null) => {
  if (!AUTH_CONFIG.OAUTH_PROVIDERS.includes(provider)) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, `不支持的 OAuth 提供商: ${provider}`)
  }

  // 构建回调 URL
  const callbackUrl = redirectUri || `${window.location.origin}${OAUTH_API.CALLBACK}`

  // 保存当前页面 URL，用于登录后跳转
  sessionStorage.setItem('swm_oauth_return_url', window.location.href)

  // 构建 OAuth URL
  const oauthUrl = `${OAUTH_API[provider.toUpperCase()]}?redirect_uri=${encodeURIComponent(callbackUrl)}`

  // 重定向到 OAuth 页面
  window.location.href = oauthUrl
}

/**
 * 处理 OAuth 回调
 * 从 URL 中提取 Token 并返回
 * @returns {Object|null} 认证响应（包含 tokens 和 user），如果不是回调页面则返回 null
 */
export const handleOAuthCallback = () => {
  // 后端使用 URL fragment (#) 传递 token，需要解析 hash
  const hash = window.location.hash.substring(1) // 移除开头的 #
  const urlParams = new URLSearchParams(hash)

  // 检查是否有 Token
  const accessToken = urlParams.get('access_token')
  const refreshToken = urlParams.get('refresh_token')
  const expiresIn = urlParams.get('expires_in')
  const error = urlParams.get('error')

  // 如果有错误
  if (error) {
    throw createAuthError(
      ERROR_TYPES.AUTH_ERROR,
      urlParams.get('error_description') || 'OAuth 登录失败',
      { error }
    )
  }

  // 如果没有 Token，说明不是回调页面
  if (!accessToken || !refreshToken || !expiresIn) {
    return null
  }

  // 解析用户信息（从 URL 参数中）
  const userJson = urlParams.get('user')
  let user = null
  if (userJson) {
    try {
      user = JSON.parse(decodeURIComponent(userJson))
    } catch (error) {
      console.error('解析用户信息失败:', error)
    }
  }

  // 清理 URL（移除 hash fragment）
  const returnUrl = sessionStorage.getItem('swm_oauth_return_url') || '/'
  sessionStorage.removeItem('swm_oauth_return_url')
  window.history.replaceState({}, document.title, window.location.pathname)

  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: parseInt(expiresIn, 10),
      tokenType: 'Bearer'
    },
    user
  }
}

/**
 * 刷新访问令牌
 * @param {string} refreshToken - 刷新令牌
 * @returns {Promise<Object>} 新的令牌信息
 */
export const refreshToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '刷新令牌不能为空')
  }

  return fetchWithRetry(AUTH_API.REFRESH, {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  })
}

/**
 * 登出
 * @param {string} accessToken - 访问令牌
 * @param {string} [refreshToken] - 刷新令牌（可选，用于同时吊销）
 * @returns {Promise<void>}
 */
export const logout = async (accessToken, refreshToken = null) => {
  if (!accessToken) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }

  if (refreshToken) {
    options.body = JSON.stringify({ refreshToken })
  }

  return fetchWithRetry(AUTH_API.LOGOUT, options)
}

/**
 * 获取当前用户信息
 * @param {string} accessToken - 访问令牌
 * @returns {Promise<import('../types/auth.js').User>} 用户信息
 */
export const getCurrentUser = async (accessToken) => {
  if (!accessToken) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  return fetchWithRetry(AUTH_API.ME, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
}

/**
 * 获取用户设备列表
 * @param {string} accessToken - 访问令牌
 * @returns {Promise<Array<import('../types/auth.js').Device>>} 设备列表
 */
export const getDevices = async (accessToken) => {
  if (!accessToken) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  return fetchWithRetry(AUTH_API.DEVICES, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
}

/**
 * 获取添加设备的选项
 * @param {string} accessToken - 访问令牌
 * @returns {Promise<Object>} 添加设备选项
 */
export const addDeviceOptions = async (accessToken) => {
  if (!accessToken) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  return fetchWithRetry(AUTH_API.ADD_DEVICE_OPTIONS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
}

/**
 * 验证添加设备
 * @param {string} accessToken - 访问令牌
 * @param {string} challengeId - 挑战 ID
 * @param {Object} response - WebAuthn 响应
 * @param {string} [deviceName] - 设备名称
 * @returns {Promise<Object>} 设备信息
 */
export const addDeviceVerify = async (accessToken, challengeId, response, deviceName) => {
  if (!accessToken || !challengeId || !response) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌、挑战 ID 和响应不能为空')
  }

  return fetchWithRetry(AUTH_API.ADD_DEVICE_VERIFY, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ challengeId, response, deviceName })
  })
}

/**
 * 获取服务端认证配置
 * @returns {Promise<Object>} 认证配置
 */
export const getAuthConfig = async () => {
  return fetchWithRetry(AUTH_API.CONFIG, {
    method: 'GET'
  })
}

/**
 * 删除设备
 * @param {string} accessToken - 访问令牌
 * @param {string} credentialId - 凭据 ID
 * @returns {Promise<void>}
 */
export const deleteDevice = async (accessToken, credentialId) => {
  if (!accessToken || !credentialId) {
    throw createAuthError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌和凭据 ID 不能为空')
  }

  return fetchWithRetry(AUTH_API.DELETE_DEVICE(credentialId), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
}
