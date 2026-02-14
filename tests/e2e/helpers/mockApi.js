/**
 * E2E 测试 API Mock 工具
 * 使用 page.route() 拦截并 mock 所有后端 API 调用
 */

/**
 * Mock 数据常量
 */
export const MOCK_USER = {
  id: 'test-user-id-123',
  username: 'testuser',
  displayName: 'Test User',
  authProvider: 'webauthn',
  createdAt: '2026-01-01T00:00:00.000Z'
}

export const MOCK_OAUTH_USER = {
  id: 'oauth-user-id-456',
  username: 'oauthuser',
  displayName: 'OAuth User',
  authProvider: 'github',
  createdAt: '2026-01-01T00:00:00.000Z'
}

export const MOCK_TOKENS = {
  accessToken: 'mock-access-token-abc123',
  refreshToken: 'mock-refresh-token-xyz789',
  expiresIn: 3600,
  tokenType: 'Bearer'
}

export const MOCK_DEVICE = {
  id: 'device-id-001',
  credentialId: 'credential-id-base64url',
  deviceName: 'Test Device',
  transports: ['internal'],
  lastUsedAt: '2026-02-12T00:00:00.000Z',
  createdAt: '2026-02-12T00:00:00.000Z'
}

/**
 * 生成合法的 base64url 字符串（用于 challenge/user.id）
 */
const generateBase64URL = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Mock GET /auth/config
 */
export const mockAuthConfig = async (page) => {
  await page.route('**/auth/config', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        webauthn: true,
        oauth: {
          github: true,
          google: true,
          microsoft: true,
          linuxdo: true
        }
      })
    })
  })
}

/**
 * Mock WebAuthn 注册流程（两步）
 * @param {import('@playwright/test').Page} page
 * @param {Object} user - 用户信息
 * @param {Object} tokens - Token 信息
 */
export const mockRegisterFlow = async (page, user = MOCK_USER, tokens = MOCK_TOKENS) => {
  // Step 1: POST /auth/register/options
  await page.route('**/auth/register/options', (route) => {
    const request = route.request()
    const postData = JSON.parse(request.postData())

    if (postData.username === 'existinguser') {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: '用户名已存在'
        })
      })
      return
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        challengeId: 'challenge-id-register-123',
        options: {
          challenge: generateBase64URL(32),
          rp: {
            name: 'Study with Miku',
            id: 'localhost'
          },
          user: {
            id: generateBase64URL(16),
            name: postData.username,
            displayName: postData.username
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 }
          ],
          timeout: 60000,
          attestation: 'none',
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            requireResidentKey: true,
            residentKey: 'required',
            userVerification: 'required'
          },
          excludeCredentials: []
        }
      })
    })
  })

  // Step 2: POST /auth/register/verify
  await page.route('**/auth/register/verify', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        tokens
      })
    })
  })
}

/**
 * Mock WebAuthn 登录流程（两步）
 */
export const mockLoginFlow = async (page, user = MOCK_USER, tokens = MOCK_TOKENS) => {
  // Step 1: POST /auth/login/options
  await page.route('**/auth/login/options', (route) => {
    const request = route.request()
    const postData = JSON.parse(request.postData())

    if (postData.username === 'nonexistentuser') {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: '用户不存在'
        })
      })
      return
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        challengeId: 'challenge-id-login-456',
        options: {
          challenge: generateBase64URL(32),
          timeout: 60000,
          rpId: 'localhost',
          allowCredentials: [
            {
              id: generateBase64URL(32),
              type: 'public-key',
              transports: ['internal']
            }
          ],
          userVerification: 'required'
        }
      })
    })
  })

  // Step 2: POST /auth/login/verify
  await page.route('**/auth/login/verify', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        tokens
      })
    })
  })
}

/**
 * Mock POST /auth/refresh
 */
export const mockRefreshToken = async (page, newTokens = MOCK_TOKENS) => {
  await page.route('**/auth/refresh', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(newTokens)
    })
  })
}

/**
 * Mock POST /auth/logout
 */
export const mockLogout = async (page) => {
  await page.route('**/auth/logout', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    })
  })
}

/**
 * Mock GET /auth/me
 */
export const mockGetMe = async (page, user = MOCK_USER) => {
  await page.route('**/auth/me', (route) => {
    const authHeader = route.request().headers()['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      })
      return
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user })
    })
  })
}

/**
 * Mock GET /auth/devices
 */
export const mockGetDevices = async (page, devices = [MOCK_DEVICE]) => {
  await page.route('**/auth/devices', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ devices })
      })
    } else {
      route.continue()
    }
  })
}

/**
 * Mock 添加设备流程
 */
export const mockAddDeviceFlow = async (page, device = MOCK_DEVICE) => {
  // POST /auth/devices/add/options
  await page.route('**/auth/devices/add/options', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        challengeId: 'challenge-id-add-device-789',
        options: {
          challenge: generateBase64URL(32),
          rp: {
            name: 'Study with Miku',
            id: 'localhost'
          },
          user: {
            id: generateBase64URL(16),
            name: MOCK_USER.username,
            displayName: MOCK_USER.display_name
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 }
          ],
          timeout: 60000,
          attestation: 'none',
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            requireResidentKey: true,
            residentKey: 'required',
            userVerification: 'required'
          },
          excludeCredentials: []
        }
      })
    })
  })

  // POST /auth/devices/add/verify
  await page.route('**/auth/devices/add/verify', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ device })
    })
  })
}

/**
 * Mock GET /auth/methods
 * @param {import('@playwright/test').Page} page
 * @param {Array} methods - 认证方法列表
 */
export const mockAuthMethods = async (page, methods = []) => {
  await page.route('**/auth/methods', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ methods })
      })
    } else {
      route.continue()
    }
  })
}

/**
 * Mock 数据同步 API
 * @param {import('@playwright/test').Page} page
 * @param {Object} dataMap - 数据类型到数据内容的映射
 */
export const mockDataSync = async (page, dataMap = {}) => {
  // GET/PUT /api/data/:type
  await page.route('**/api/data/*', (route) => {
    const url = route.request().url()
    const match = url.match(/\/api\/data\/([^?]+)/)

    if (!match) {
      route.continue()
      return
    }

    const dataType = match[1]

    if (route.request().method() === 'GET') {
      const data = dataMap[dataType] || null
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: dataType,
          data,
          version: 1
        })
      })
    } else if (route.request().method() === 'PUT') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          version: 2,
          merged: false
        })
      })
    } else {
      route.continue()
    }
  })
}

/**
 * Mock 数据同步冲突（PUT 返回 409）
 */
export const mockDataSyncConflict = async (page, dataType, serverData) => {
  await page.route(`**/api/data/${dataType}`, (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Conflict',
          conflict: true,
          serverData,
          serverVersion: 2
        })
      })
    } else {
      route.continue()
    }
  })
}

/**
 * Mock 数据同步失败（返回 500）
 */
export const mockDataSyncError = async (page) => {
  await page.route('**/api/data/*', (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error'
        })
      })
    } else {
      route.continue()
    }
  })
}
