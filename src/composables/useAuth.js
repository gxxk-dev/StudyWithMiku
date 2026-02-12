/**
 * @fileoverview 认证状态管理
 * @module composables/useAuth
 *
 * 单例模式 Composable，管理全局认证状态
 * 包括登录/登出/Token 刷新/设备管理等功能
 */

import { ref, readonly, computed } from 'vue'
import * as authService from '../services/auth.js'
import * as authStorage from '../utils/authStorage.js'
import * as webauthnHelper from '../utils/webauthnHelper.js'
import { AUTH_CONFIG } from '../config/constants.js'

// 模块级状态（单例）
const user = ref(null)
const isAuthenticated = ref(false)
const isLoading = ref(false)
const error = ref(null)
const devices = ref([])
const authMethods = ref([])
const availableProviders = ref({
  webauthn: true,
  oauth: {
    github: false,
    google: false,
    microsoft: false
  }
})

// Token 刷新定时器
let tokenRefreshTimer = null

// 模块级函数引用（在 useAuth 中设置）
let scheduleTokenRefreshFn = null

/**
 * 清除错误状态
 */
const clearError = () => {
  error.value = null
}

/**
 * 设置错误状态
 * @param {Error|import('../types/auth.js').AuthError} err - 错误对象
 */
const setError = (err) => {
  error.value = {
    code: err.code || err.name || 'UNKNOWN_ERROR',
    message: err.message || '未知错误',
    type: err.type || 'UNKNOWN_ERROR',
    details: err.details || null
  }
}

/**
 * 清除所有认证状态
 */
const clearAuthState = () => {
  user.value = null
  isAuthenticated.value = false
  devices.value = []
  authMethods.value = []
  authStorage.clearAllAuthData()

  // 清除 Token 刷新定时器
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
    tokenRefreshTimer = null
  }
}

/**
 * 设置认证状态
 * @param {import('../types/auth.js').User} userData - 用户信息
 * @param {import('../types/auth.js').AuthTokens} tokens - 令牌信息
 */
const setAuthState = (userData, tokens) => {
  user.value = userData
  isAuthenticated.value = true

  // 保存到 localStorage
  authStorage.saveUser(userData)
  authStorage.saveTokens(
    tokens.accessToken,
    tokens.refreshToken,
    tokens.expiresIn || 3600,
    tokens.tokenType
  )

  // 启动 Token 刷新定时器
  if (scheduleTokenRefreshFn) {
    scheduleTokenRefreshFn()
  }
}

/**
 * 认证状态管理 Composable
 * @returns {Object} 认证相关的状态和方法
 */
export const useAuth = () => {
  /**
   * 计划 Token 刷新
   */
  const scheduleTokenRefresh = () => {
    // 清除现有定时器
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer)
    }

    const expiresAt = authStorage.getTokenExpiresAt()
    if (!expiresAt) return

    const now = Date.now()
    const refreshTime = expiresAt - AUTH_CONFIG.TOKEN_REFRESH_THRESHOLD * 1000
    const delay = Math.max(0, refreshTime - now)

    tokenRefreshTimer = setTimeout(async () => {
      try {
        await refreshTokenIfNeeded()
      } catch (error) {
        console.error('自动刷新 Token 失败:', error)
        // Token 刷新失败，清除认证状态
        await logout()
      }
    }, delay)
  }

  // 设置模块级函数引用
  scheduleTokenRefreshFn = scheduleTokenRefresh
  /**
   * 初始化认证状态
   * 从 localStorage 恢复 Token 和用户信息
   */
  const initialize = async () => {
    isLoading.value = true
    clearError()

    try {
      // 检查是否有有效的认证状态
      if (!authStorage.hasValidAuth()) {
        clearAuthState()
        return
      }

      // 恢复用户信息
      const savedUser = authStorage.getUser()
      if (savedUser) {
        user.value = savedUser
        isAuthenticated.value = true

        // 启动 Token 刷新定时器
        scheduleTokenRefresh()

        // 尝试获取最新用户信息
        try {
          const accessToken = authStorage.getAccessToken()
          if (accessToken) {
            const response = await authService.getCurrentUser(accessToken)
            user.value = response.user
            authStorage.saveUser(response.user)
          }
        } catch (error) {
          console.warn('获取最新用户信息失败:', error)
          // 不影响初始化流程
        }
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error)
      clearAuthState()
      setError(error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * WebAuthn 注册
   * @param {string} username - 用户名
   * @param {string} [deviceName] - 设备名称
   * @returns {Promise<import('../types/auth.js').User>} 注册成功的用户信息
   */
  const register = async (username, deviceName) => {
    if (!webauthnHelper.isWebAuthnSupported()) {
      throw new Error('浏览器不支持 WebAuthn')
    }

    isLoading.value = true
    clearError()

    try {
      // 获取注册选项
      const { challengeId, options } = await authService.registerOptions(username)

      // 创建凭据
      const credential = await webauthnHelper.createCredential(options)

      // 验证注册
      const response = await authService.registerVerify(challengeId, credential, deviceName)

      // 设置认证状态
      setAuthState(response.user, response.tokens)

      return response.user
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * WebAuthn 登录
   * @param {string} username - 用户名
   * @returns {Promise<import('../types/auth.js').User>} 登录成功的用户信息
   */
  const login = async (username) => {
    if (!webauthnHelper.isWebAuthnSupported()) {
      throw new Error('浏览器不支持 WebAuthn')
    }

    isLoading.value = true
    clearError()

    try {
      // 获取登录选项
      const { challengeId, options } = await authService.loginOptions(username)

      // 获取凭据
      const credential = await webauthnHelper.getCredential(options)

      // 验证登录
      const response = await authService.loginVerify(challengeId, credential)

      // 设置认证状态
      setAuthState(response.user, response.tokens)

      return response.user
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * OAuth 登录
   * @param {string} provider - OAuth 提供商
   * @param {string} [redirectUri] - 回调 URL
   */
  const loginWithOAuth = (provider, redirectUri = null) => {
    clearError()

    try {
      authService.oauthLogin(provider, redirectUri)
    } catch (error) {
      setError(error)
      throw error
    }
  }

  /**
   * 处理 OAuth 回调
   * 应在页面加载时调用，检查是否为 OAuth 回调
   */
  const handleOAuthCallback = async () => {
    try {
      const result = authService.handleOAuthCallback()

      if (result) {
        // 设置认证状态
        setAuthState(result.user, result.tokens)
        return result.user
      }

      return null
    } catch (error) {
      setError(error)
      throw error
    }
  }

  /**
   * 登出
   * @returns {Promise<void>}
   */
  const logout = async () => {
    isLoading.value = true
    clearError()

    try {
      const accessToken = authStorage.getAccessToken()

      // 尝试调用服务器登出 API
      if (accessToken) {
        try {
          const refreshToken = authStorage.getRefreshToken()
          await authService.logout(accessToken, refreshToken)
        } catch (error) {
          console.warn('服务器登出失败:', error)
          // 不影响本地登出流程
        }
      }

      // 清除本地状态
      clearAuthState()
    } catch (error) {
      setError(error)
      // 即使出错也要清除本地状态
      clearAuthState()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 刷新 Token（如果需要）
   * @returns {Promise<import('../types/auth.js').AuthTokens|undefined>} 刷新后的令牌信息，无需刷新时返回 undefined
   */
  const refreshTokenIfNeeded = async () => {
    const refreshToken = authStorage.getRefreshToken()

    if (!refreshToken) {
      throw new Error('没有刷新令牌')
    }

    if (!authStorage.isTokenExpiringSoon()) {
      return // 不需要刷新
    }

    try {
      const response = await authService.refreshToken(refreshToken)

      // 更新 Token
      authStorage.saveTokens(
        response.accessToken,
        response.refreshToken,
        response.expiresIn,
        response.tokenType
      )

      // 重新计划下次刷新
      scheduleTokenRefresh()

      return response
    } catch (error) {
      // Token 刷新失败，清除认证状态
      clearAuthState()
      throw error
    }
  }

  /**
   * 获取设备列表
   * @returns {Promise<Array>} 设备列表
   */
  const getDevices = async () => {
    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    isLoading.value = true
    clearError()

    try {
      const response = await authService.getDevices(accessToken)
      devices.value = response.devices
      return response.devices
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 添加新设备
   * @param {string} [deviceName] - 设备名称
   * @returns {Promise<Object>} 新添加的设备信息
   */
  const addDevice = async (deviceName) => {
    if (!webauthnHelper.isWebAuthnSupported()) {
      throw new Error('浏览器不支持 WebAuthn')
    }

    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    isLoading.value = true
    clearError()

    try {
      // 获取添加设备选项
      const { challengeId, options } = await authService.addDeviceOptions(accessToken)

      // 创建凭据
      const credential = await webauthnHelper.createCredential(options)

      // 验证添加设备
      const result = await authService.addDeviceVerify(
        accessToken,
        challengeId,
        credential,
        deviceName
      )

      // 更新设备列表
      devices.value.push(result.device)

      return result.device
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取认证配置
   * @returns {Promise<Object|undefined>} 认证配置，获取失败时返回 undefined
   */
  const fetchConfig = async () => {
    try {
      const config = await authService.getAuthConfig()
      availableProviders.value = config
      return config
    } catch (error) {
      console.warn('获取认证配置失败:', error)
      // 保持默认值
    }
  }

  /**
   * 删除设备
   * @param {string} credentialId - 凭据 ID
   * @returns {Promise<void>}
   */
  const removeDevice = async (credentialId) => {
    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    isLoading.value = true
    clearError()

    try {
      await authService.deleteDevice(accessToken, credentialId)

      // 从设备列表中移除
      devices.value = devices.value.filter((device) => device.credentialId !== credentialId)
      // 同步更新 authMethods
      authMethods.value = authMethods.value.filter((m) => m.id !== credentialId)
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取统一认证方法列表
   * @returns {Promise<Array>}
   */
  const getAuthMethods = async () => {
    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    isLoading.value = true
    clearError()

    try {
      const response = await authService.getAuthMethods(accessToken)
      authMethods.value = response.methods
      return response.methods
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 发起 OAuth 关联
   * @param {string} provider - OAuth 提供商
   */
  const linkOAuthProvider = async (provider) => {
    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    clearError()

    try {
      const { authUrl } = await authService.linkOAuthProvider(accessToken, provider)
      window.location.href = authUrl
    } catch (error) {
      setError(error)
      throw error
    }
  }

  /**
   * 处理 OAuth 关联回调
   * @returns {Promise<Object|null>} 关联结果
   */
  const handleOAuthLinkCallback = async () => {
    try {
      const result = authService.handleOAuthLinkCallback()

      if (result) {
        if (result.success) {
          // 刷新认证方法列表
          await getAuthMethods()
        }
        return result
      }

      return null
    } catch (error) {
      setError(error)
      throw error
    }
  }

  /**
   * 解绑 OAuth 账号
   * @param {string} accountId - OAuth 账号 ID
   * @returns {Promise<void>}
   */
  const unlinkOAuthAccount = async (accountId) => {
    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    isLoading.value = true
    clearError()

    try {
      await authService.unlinkOAuthAccount(accessToken, accountId)
      authMethods.value = authMethods.value.filter((m) => m.id !== accountId)
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 计算属性
  const isWebAuthnSupported = computed(() => webauthnHelper.isWebAuthnSupported())
  const hasDevices = computed(() => devices.value.length > 0)

  return {
    // 状态
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    error: readonly(error),
    devices: readonly(devices),
    authMethods: readonly(authMethods),
    availableProviders: readonly(availableProviders),

    // 计算属性
    isWebAuthnSupported,
    hasDevices,

    // 方法
    initialize,
    fetchConfig,
    register,
    login,
    loginWithOAuth,
    handleOAuthCallback,
    handleOAuthLinkCallback,
    logout,
    refreshTokenIfNeeded,
    getDevices,
    addDevice,
    removeDevice,
    getAuthMethods,
    linkOAuthProvider,
    unlinkOAuthAccount,
    clearError
  }
}
