/**
 * E2E 测试 - WebAuthn 注册和登录
 * 仅在 Chromium 上运行（使用 CDP 虚拟认证器）
 */

import { test, expect } from '@playwright/test'
import {
  mockAuthConfig,
  mockRegisterFlow,
  mockLoginFlow,
  mockGetDevices,
  mockAddDeviceFlow,
  mockAuthMethods,
  MOCK_USER,
  MOCK_TOKENS,
  MOCK_DEVICE
} from './helpers/mockApi.js'
import { openAccountTab } from './helpers/navigate.js'

test.describe('WebAuthn 注册和登录', () => {
  let cdpSession
  let authenticatorId

  test.beforeEach(async ({ page, browserName }) => {
    // 跳过非 Chromium 浏览器
    test.skip(browserName !== 'chromium', 'WebAuthn CDP 仅支持 Chromium')

    // 创建 CDP session
    cdpSession = await page.context().newCDPSession(page)

    // 启用 WebAuthn
    await cdpSession.send('WebAuthn.enable')

    // 添加虚拟认证器
    const result = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true
      }
    })
    authenticatorId = result.authenticatorId

    // Mock 所有 auth API
    await mockAuthConfig(page)
    await mockRegisterFlow(page, MOCK_USER, MOCK_TOKENS)
    await mockLoginFlow(page, MOCK_USER, MOCK_TOKENS)
    await mockGetDevices(page, [MOCK_DEVICE])
    await mockAuthMethods(page, [
      { id: MOCK_DEVICE.credentialId, type: 'webauthn', deviceName: MOCK_DEVICE.deviceName }
    ])

    // 导航到首页
    await page.goto('/')
    await page.waitForSelector('body')
  })

  test.afterEach(async () => {
    if (cdpSession && authenticatorId) {
      try {
        await cdpSession.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId })
        await cdpSession.send('WebAuthn.disable')
      } catch (error) {
        console.warn('清理 WebAuthn 虚拟认证器失败:', error)
      }
    }
  })

  test('注册流程：输入用户名 → 点击注册 → 输入设备名 → 确认注册 → 验证已登录', async ({ page }) => {
    await openAccountTab(page)

    // 验证显示登录面板
    await expect(page.locator('.login-panel')).toBeVisible()

    // 输入用户名
    await page.fill('input[placeholder="请输入用户名"]', 'newuser')

    // 点击注册按钮
    await page.click('button.btn-secondary:has-text("注册")')

    // 验证显示设备名输入框
    await expect(page.locator('input[placeholder="设备名称（可选，如：我的电脑）"]')).toBeVisible()

    // 输入设备名
    await page.fill('input[placeholder="设备名称（可选，如：我的电脑）"]', 'My Test Device')

    // 点击确认注册
    await page.click('button.btn-secondary:has-text("确认注册")')

    // 验证跳转到已登录视图
    await expect(page.locator('.profile-panel')).toBeVisible({ timeout: 10000 })

    // 验证显示用户名
    await expect(page.locator('.username')).toHaveText('Test User')

    // 验证显示 WebAuthn provider
    await expect(page.locator('.provider')).toContainText('WebAuthn')
  })

  test('登录流程：输入用户名 → 点击登录 → 验证已登录', async ({ page }) => {
    // 先注册以在虚拟认证器中创建可发现凭据
    await openAccountTab(page)
    await page.fill('input[placeholder="请输入用户名"]', 'testuser')
    await page.click('button.btn-secondary:has-text("注册")')
    await page.fill('input[placeholder="设备名称（可选，如：我的电脑）"]', 'Test Device')
    await page.click('button.btn-secondary:has-text("确认注册")')
    await expect(page.locator('.profile-panel')).toBeVisible({ timeout: 10000 })

    // 清除认证状态，模拟退出登录
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('body')

    // 覆盖登录选项：空 allowCredentials 触发可发现凭据匹配
    await page.route('**/auth/login/options', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challengeId: 'challenge-id-login-456',
          options: {
            challenge: 'dGVzdC1jaGFsbGVuZ2UtZm9yLWxvZ2lu',
            timeout: 60000,
            rpId: 'localhost',
            allowCredentials: [],
            userVerification: 'required'
          }
        })
      })
    })

    await openAccountTab(page)

    // 输入用户名
    await page.fill('input[placeholder="请输入用户名"]', 'testuser')

    // 点击登录按钮
    await page.click('button.btn-primary:has-text("登录")')

    // 验证已登录
    await expect(page.locator('.profile-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.username')).toHaveText('Test User')
  })

  test('注册后设备列表显示新设备', async ({ page }) => {
    await openAccountTab(page)

    // 注册
    await page.fill('input[placeholder="请输入用户名"]', 'newuser')
    await page.click('button.btn-secondary:has-text("注册")')
    await page.fill('input[placeholder="设备名称（可选，如：我的电脑）"]', 'My Device')
    await page.click('button.btn-secondary:has-text("确认注册")')

    // 验证设备列表
    await expect(page.locator('.device-list-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.device-item')).toHaveCount(1)
    await expect(page.locator('.device-name').first()).toContainText('Test Device')
  })

  test('用户名为空时登录按钮禁用', async ({ page }) => {
    await openAccountTab(page)

    // 验证登录按钮禁用
    await expect(page.locator('button.btn-primary:has-text("登录")')).toBeDisabled()

    // 输入用户名后启用
    await page.fill('input[placeholder="请输入用户名"]', 'testuser')
    await expect(page.locator('button.btn-primary:has-text("登录")')).toBeEnabled()
  })

  test('用户名已存在时注册显示错误', async ({ page }) => {
    // 覆盖 mock：注册 options 返回 409
    await page.route('**/auth/register/options', (route) => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: '用户名已存在' })
      })
    })

    await openAccountTab(page)

    await page.fill('input[placeholder="请输入用户名"]', 'existinguser')
    await page.click('button.btn-secondary:has-text("注册")')
    await page.fill('input[placeholder="设备名称（可选，如：我的电脑）"]', 'Device')
    await page.click('button.btn-secondary:has-text("确认注册")')

    // 验证显示错误消息
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.error-message')).toContainText('用户名已存在')
  })

  test('用户不存在时登录显示错误', async ({ page }) => {
    // 覆盖 mock：登录 options 返回 400
    await page.route('**/auth/login/options', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: '用户不存在' })
      })
    })

    await openAccountTab(page)

    await page.fill('input[placeholder="请输入用户名"]', 'nonexistentuser')
    await page.click('button.btn-primary:has-text("登录")')

    // 验证显示错误消息
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.error-message')).toContainText('用户不存在')
  })

  test('WebAuthn 不支持时显示警告文字', async ({ page }) => {
    // 删除 WebAuthn API
    await page.evaluate(() => {
      delete window.PublicKeyCredential
    })

    await openAccountTab(page)

    // 验证显示警告
    await expect(page.locator('.warning-text')).toBeVisible()
    await expect(page.locator('.warning-text')).toContainText('不支持 WebAuthn')
  })

  test('添加设备流程：已登录 → 点击添加设备 → 输入名称 → 确认 → 设备列表更新', async ({ page }) => {
    // Mock 添加设备 API
    await mockAddDeviceFlow(page, {
      ...MOCK_DEVICE,
      id: 'device-id-002',
      deviceName: 'New Device'
    })

    // 覆盖 authMethods mock：添加设备后 getAuthMethods 会重新请求，返回 2 个方法
    let deviceAdded = false
    await page.route('**/auth/devices/add/verify', async (route) => {
      deviceAdded = true
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device: { ...MOCK_DEVICE, id: 'device-id-002', deviceName: 'New Device' }
        })
      })
    })
    await page.route('**/auth/methods', (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      const methods = deviceAdded
        ? [
            { id: MOCK_DEVICE.credentialId, type: 'webauthn', deviceName: MOCK_DEVICE.deviceName },
            { id: 'device-id-002', type: 'webauthn', deviceName: 'New Device' }
          ]
        : [{ id: MOCK_DEVICE.credentialId, type: 'webauthn', deviceName: MOCK_DEVICE.deviceName }]
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ methods })
      })
    })

    // 通过注册流程获得已登录状态（同时在虚拟认证器中创建凭据）
    await openAccountTab(page)
    await page.fill('input[placeholder="请输入用户名"]', 'testuser')
    await page.click('button.btn-secondary:has-text("注册")')
    await page.fill('input[placeholder="设备名称（可选，如：我的电脑）"]', 'Test Device')
    await page.click('button.btn-secondary:has-text("确认注册")')

    // 验证已登录
    await expect(page.locator('.profile-panel')).toBeVisible({ timeout: 10000 })

    // 点击添加设备
    await page.click('button.add-btn:has-text("添加安全密钥")')

    // 验证显示输入框
    await expect(page.locator('.add-device-form')).toBeVisible()

    // 输入设备名
    await page.fill(
      '.add-device-form input[placeholder="设备名称（可选，如：我的电脑）"]',
      'New Device'
    )

    // 点击确认
    await page.click('button.btn-confirm:has-text("确认添加")')

    // 验证设备列表更新（应该有 2 个设备）
    await expect(page.locator('.device-item')).toHaveCount(2, { timeout: 5000 })
  })
})
