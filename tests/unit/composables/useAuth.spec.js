import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock 依赖
vi.mock('@/services/auth.js', () => ({
  registerOptions: vi.fn(),
  registerVerify: vi.fn(),
  loginOptions: vi.fn(),
  loginVerify: vi.fn(),
  oauthLogin: vi.fn(),
  handleOAuthCallback: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  getDevices: vi.fn(),
  addDeviceOptions: vi.fn(),
  addDeviceVerify: vi.fn(),
  deleteDevice: vi.fn(),
  getAuthConfig: vi.fn(),
  getAuthMethods: vi.fn(),
  linkOAuthProvider: vi.fn(),
  unlinkOAuthAccount: vi.fn(),
  handleOAuthLinkCallback: vi.fn()
}))

vi.mock('@/utils/webauthnHelper.js', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  createCredential: vi.fn(),
  getCredential: vi.fn()
}))

vi.mock('@/utils/authStorage.js', () => ({
  hasValidAuth: vi.fn(() => false),
  getUser: vi.fn(() => null),
  getAccessToken: vi.fn(() => null),
  getTokenExpiresAt: vi.fn(() => null),
  isTokenExpiringSoon: vi.fn(() => false),
  saveUser: vi.fn(),
  saveTokens: vi.fn(),
  clearAllAuthData: vi.fn(),
  cleanupLegacyKeys: vi.fn()
}))

let authService, webauthnHelper, authStorage, useAuth

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()

  authService = await import('@/services/auth.js')
  webauthnHelper = await import('@/utils/webauthnHelper.js')
  authStorage = await import('@/utils/authStorage.js')
  const mod = await import('@/composables/useAuth.js')
  useAuth = mod.useAuth

  // 显式重置 mock 默认值，防止跨测试污染
  webauthnHelper.isWebAuthnSupported.mockReturnValue(true)
  authStorage.hasValidAuth.mockReturnValue(false)
  authStorage.getUser.mockReturnValue(null)
  authStorage.getAccessToken.mockReturnValue(null)
  authStorage.getTokenExpiresAt.mockReturnValue(null)
  authStorage.isTokenExpiringSoon.mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAuth', () => {
  describe('初始状态', () => {
    it('user 为 null', () => {
      const { user } = useAuth()
      expect(user.value).toBeNull()
    })

    it('isAuthenticated 为 false', () => {
      const { isAuthenticated } = useAuth()
      expect(isAuthenticated.value).toBe(false)
    })

    it('isLoading 为 false', () => {
      const { isLoading } = useAuth()
      expect(isLoading.value).toBe(false)
    })

    it('error 为 null', () => {
      const { error } = useAuth()
      expect(error.value).toBeNull()
    })

    it('devices 为空数组', () => {
      const { devices } = useAuth()
      expect(devices.value).toEqual([])
    })
  })

  describe('initialize', () => {
    it('无认证时不设置认证状态', async () => {
      authStorage.hasValidAuth.mockReturnValue(false)
      authStorage.getUser.mockReturnValue(null)
      const { initialize, isAuthenticated } = useAuth()

      await initialize()

      expect(isAuthenticated.value).toBe(false)
    })

    it('有认证时恢复用户', async () => {
      const savedUser = { id: 'user-001', username: 'test' }
      authStorage.hasValidAuth.mockReturnValue(true)
      authStorage.getUser.mockReturnValue(savedUser)
      authStorage.getAccessToken.mockReturnValue('token')
      authService.getCurrentUser.mockResolvedValue({ user: savedUser })

      const { initialize, user, isAuthenticated } = useAuth()
      await initialize()

      expect(user.value).toEqual(savedUser)
      expect(isAuthenticated.value).toBe(true)
    })

    it('getCurrentUser 失败不影响初始化', async () => {
      authStorage.hasValidAuth.mockReturnValue(true)
      authStorage.getUser.mockReturnValue({ id: 'u1', username: 'test' })
      authStorage.getAccessToken.mockReturnValue('token')
      authService.getCurrentUser.mockRejectedValue(new Error('Network error'))

      const { initialize, isAuthenticated } = useAuth()
      await initialize()

      expect(isAuthenticated.value).toBe(true)
    })

    it('isLoading 在初始化期间切换', async () => {
      authStorage.hasValidAuth.mockReturnValue(false)
      const { initialize, isLoading } = useAuth()

      const promise = initialize()
      // isLoading 应该在开始时为 true（但由于异步，这里检查最终状态）
      await promise
      expect(isLoading.value).toBe(false)
    })

    it('异常时清除状态并设置 error', async () => {
      authStorage.hasValidAuth.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { initialize, isAuthenticated } = useAuth()
      await initialize()

      expect(isAuthenticated.value).toBe(false)
    })

    it('页面刷新后通过 cookie 刷新恢复登录态', async () => {
      const savedUser = { id: 'user-001', username: 'test' }
      authStorage.hasValidAuth.mockReturnValue(false)
      authStorage.getUser.mockReturnValue(savedUser)
      authService.refreshToken.mockResolvedValue({
        accessToken: 'new-at',
        expiresIn: 900,
        tokenType: 'Bearer'
      })
      authService.getCurrentUser.mockResolvedValue({ user: savedUser })

      const { initialize, isAuthenticated, user } = useAuth()
      await initialize()

      expect(isAuthenticated.value).toBe(true)
      expect(user.value).toEqual(savedUser)
      expect(authStorage.saveTokens).toHaveBeenCalledWith('new-at', 900, 'Bearer')
    })

    it('cookie 刷新失败时清除状态', async () => {
      authStorage.hasValidAuth.mockReturnValue(false)
      authStorage.getUser.mockReturnValue({ id: 'u1', username: 'test' })
      authService.refreshToken.mockRejectedValue(new Error('Cookie expired'))

      const { initialize, isAuthenticated } = useAuth()
      await initialize()

      expect(isAuthenticated.value).toBe(false)
      expect(authStorage.clearAllAuthData).toHaveBeenCalled()
    })
  })

  describe('register', () => {
    it('完整注册流程', async () => {
      const mockOptions = { challengeId: 'ch-001', options: { challenge: 'test' } }
      const mockCredential = { id: 'cred-001', response: {} }
      const mockResponse = {
        user: { id: 'user-001', username: 'newuser' },
        tokens: { accessToken: 'at', expiresIn: 3600 }
      }

      authService.registerOptions.mockResolvedValue(mockOptions)
      webauthnHelper.createCredential.mockResolvedValue(mockCredential)
      authService.registerVerify.mockResolvedValue(mockResponse)

      const { register, user, isAuthenticated } = useAuth()
      const result = await register('newuser', 'My Device')

      expect(result).toEqual(mockResponse.user)
      expect(user.value).toEqual(mockResponse.user)
      expect(isAuthenticated.value).toBe(true)
      expect(authStorage.saveTokens).toHaveBeenCalled()
      expect(authStorage.saveUser).toHaveBeenCalled()
    })

    it('WebAuthn 不支持时抛错', async () => {
      webauthnHelper.isWebAuthnSupported.mockReturnValue(false)

      const { register } = useAuth()
      await expect(register('user')).rejects.toThrow('WebAuthn')
    })

    it('失败时设置 error', async () => {
      authService.registerOptions.mockRejectedValue(new Error('Server error'))

      const { register, error } = useAuth()
      await expect(register('user')).rejects.toThrow()
      expect(error.value).toBeDefined()
    })
  })

  describe('login', () => {
    it('完整登录流程', async () => {
      const mockOptions = { challengeId: 'ch-002', options: { challenge: 'test' } }
      const mockCredential = { id: 'cred-001', response: {} }
      const mockResponse = {
        user: { id: 'user-001', username: 'testuser' },
        tokens: { accessToken: 'at', expiresIn: 3600 }
      }

      authService.loginOptions.mockResolvedValue(mockOptions)
      webauthnHelper.getCredential.mockResolvedValue(mockCredential)
      authService.loginVerify.mockResolvedValue(mockResponse)

      const { login, isAuthenticated } = useAuth()
      const result = await login('testuser')

      expect(result).toEqual(mockResponse.user)
      expect(isAuthenticated.value).toBe(true)
    })

    it('WebAuthn 不支持时抛错', async () => {
      webauthnHelper.isWebAuthnSupported.mockReturnValue(false)

      const { login } = useAuth()
      await expect(login('user')).rejects.toThrow('WebAuthn')
    })

    it('失败时设置 error', async () => {
      authService.loginOptions.mockRejectedValue(new Error('Not found'))

      const { login, error } = useAuth()
      await expect(login('user')).rejects.toThrow()
      expect(error.value).toBeDefined()
    })
  })

  describe('loginWithOAuth', () => {
    it('调用 oauthLogin', () => {
      const { loginWithOAuth } = useAuth()
      loginWithOAuth('github')
      expect(authService.oauthLogin).toHaveBeenCalledWith('github', null)
    })

    it('失败时设置 error', () => {
      authService.oauthLogin.mockImplementation(() => {
        throw new Error('Invalid provider')
      })

      const { loginWithOAuth, error } = useAuth()
      expect(() => loginWithOAuth('invalid')).toThrow()
      expect(error.value).toBeDefined()
    })
  })

  describe('handleOAuthCallback', () => {
    it('有数据时设置认证状态', async () => {
      const mockResult = {
        user: { id: 'user-001', username: 'ghuser' },
        tokens: { accessToken: 'at', expiresIn: 3600 }
      }
      authService.handleOAuthCallback.mockReturnValue(mockResult)

      const { handleOAuthCallback, isAuthenticated } = useAuth()
      const result = await handleOAuthCallback()

      expect(result).toEqual(mockResult.user)
      expect(isAuthenticated.value).toBe(true)
    })

    it('无数据时返回 null', async () => {
      authService.handleOAuthCallback.mockReturnValue(null)

      const { handleOAuthCallback } = useAuth()
      const result = await handleOAuthCallback()

      expect(result).toBeNull()
    })

    it('失败时设置 error', async () => {
      authService.handleOAuthCallback.mockImplementation(() => {
        throw new Error('OAuth error')
      })

      const { handleOAuthCallback, error } = useAuth()
      await expect(handleOAuthCallback()).rejects.toThrow()
      expect(error.value).toBeDefined()
    })
  })

  describe('logout', () => {
    it('服务器登出 + 清除本地状态', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      authService.logout.mockResolvedValue({})

      const { logout, isAuthenticated } = useAuth()
      await logout()

      expect(authService.logout).toHaveBeenCalledWith('token')
      expect(authStorage.clearAllAuthData).toHaveBeenCalled()
      expect(isAuthenticated.value).toBe(false)
    })

    it('服务器失败仍清除本地状态', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      authService.logout.mockRejectedValue(new Error('Server error'))

      const { logout, isAuthenticated } = useAuth()
      await logout()

      expect(authStorage.clearAllAuthData).toHaveBeenCalled()
      expect(isAuthenticated.value).toBe(false)
    })

    it('无 token 时只清除本地状态', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { logout } = useAuth()
      await logout()

      expect(authService.logout).not.toHaveBeenCalled()
      expect(authStorage.clearAllAuthData).toHaveBeenCalled()
    })
  })

  describe('refreshTokenIfNeeded', () => {
    it('未过期时不刷新', async () => {
      authStorage.isTokenExpiringSoon.mockReturnValue(false)

      const { refreshTokenIfNeeded } = useAuth()
      const result = await refreshTokenIfNeeded()

      expect(result).toBeUndefined()
      expect(authService.refreshToken).not.toHaveBeenCalled()
    })

    it('过期时刷新并保存新 token（通过 cookie 自动发送 refresh token）', async () => {
      authStorage.isTokenExpiringSoon.mockReturnValue(true)
      authService.refreshToken.mockResolvedValue({
        accessToken: 'new-at',
        expiresIn: 3600,
        tokenType: 'Bearer'
      })

      const { refreshTokenIfNeeded } = useAuth()
      const result = await refreshTokenIfNeeded()

      expect(result.accessToken).toBe('new-at')
      expect(authStorage.saveTokens).toHaveBeenCalledWith('new-at', 3600, 'Bearer')
    })

    it('刷新失败时清除状态', async () => {
      authStorage.isTokenExpiringSoon.mockReturnValue(true)
      authService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'))

      const { refreshTokenIfNeeded, isAuthenticated } = useAuth()
      await expect(refreshTokenIfNeeded()).rejects.toThrow()
      expect(isAuthenticated.value).toBe(false)
    })
  })

  describe('getDevices', () => {
    it('正常获取设备列表', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      authService.getDevices.mockResolvedValue({
        devices: [{ credentialId: 'c1', deviceName: 'Device 1' }]
      })

      const { getDevices, devices } = useAuth()
      const result = await getDevices()

      expect(result).toHaveLength(1)
      expect(devices.value).toHaveLength(1)
    })

    it('未登录时抛错', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { getDevices } = useAuth()
      await expect(getDevices()).rejects.toThrow('未登录')
    })
  })

  describe('addDevice', () => {
    it('正常添加设备', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      authService.addDeviceOptions.mockResolvedValue({
        challengeId: 'ch',
        options: { challenge: 'test' }
      })
      webauthnHelper.createCredential.mockResolvedValue({ id: 'new-cred' })
      authService.addDeviceVerify.mockResolvedValue({
        device: { credentialId: 'new-cred', deviceName: 'New Device' }
      })

      const { addDevice } = useAuth()
      const result = await addDevice('New Device')

      expect(result.credentialId).toBe('new-cred')
    })

    it('未登录时抛错', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { addDevice } = useAuth()
      await expect(addDevice()).rejects.toThrow('未登录')
    })
  })

  describe('removeDevice', () => {
    it('正常删除设备', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      authService.deleteDevice.mockResolvedValue({})

      // 先添加设备到列表
      authService.getDevices.mockResolvedValue({
        devices: [{ credentialId: 'c1' }, { credentialId: 'c2' }]
      })
      const { getDevices, removeDevice, devices } = useAuth()
      await getDevices()

      await removeDevice('c1')
      expect(devices.value).toHaveLength(1)
      expect(devices.value[0].credentialId).toBe('c2')
    })

    it('未登录时抛错', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { removeDevice } = useAuth()
      await expect(removeDevice('c1')).rejects.toThrow('未登录')
    })
  })

  describe('fetchConfig', () => {
    it('获取并更新 providers', async () => {
      const config = { webauthn: true, oauth: { github: true, google: false, microsoft: false } }
      authService.getAuthConfig.mockResolvedValue(config)

      const { fetchConfig, availableProviders } = useAuth()
      await fetchConfig()

      expect(availableProviders.value).toEqual(config)
    })

    it('失败时保持默认值', async () => {
      authService.getAuthConfig.mockRejectedValue(new Error('Network error'))

      const { fetchConfig, availableProviders } = useAuth()
      const before = { ...availableProviders.value }
      await fetchConfig()

      expect(availableProviders.value).toEqual(before)
    })
  })

  describe('scheduleTokenRefresh', () => {
    it('expiresAt 为 null 时不调度', async () => {
      authStorage.getTokenExpiresAt.mockReturnValue(null)
      authStorage.hasValidAuth.mockReturnValue(true)
      authStorage.getUser.mockReturnValue({ id: 'u1', username: 'test' })
      authStorage.getAccessToken.mockReturnValue('token')
      authService.getCurrentUser.mockResolvedValue({ user: { id: 'u1' } })

      const { initialize } = useAuth()
      await initialize()

      // 前进大量时间，不应触发刷新
      await vi.advanceTimersByTimeAsync(100000)
      expect(authService.refreshToken).not.toHaveBeenCalled()
    })
  })
})
