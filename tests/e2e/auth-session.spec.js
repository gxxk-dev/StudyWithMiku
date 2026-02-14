/**
 * E2E 测试 - 会话持久化、Token 刷新、登出
 */

import { test, expect } from '@playwright/test'
import {
  mockAuthConfig,
  mockGetMe,
  mockRefreshToken,
  mockLogout,
  mockAuthMethods,
  MOCK_USER,
  MOCK_TOKENS
} from './helpers/mockApi.js'
import {
  openAccountTab,
  injectAuthState,
  getAuthState,
  clearAuthState
} from './helpers/navigate.js'

test.describe('会话持久化和管理', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthConfig(page)
    await mockGetMe(page, MOCK_USER)
    await mockLogout(page)
    await mockAuthMethods(page, [{ id: 'webauthn-1', type: 'webauthn', deviceName: 'Test Device' }])
  })

  test('刷新页面后保持登录：注入 token → reload → 验证 profile panel 可见', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    // 注入认证状态
    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)

    // 刷新页面
    await page.reload()
    await page.waitForSelector('body')

    // 打开账号 tab
    await openAccountTab(page)

    // 验证已登录
    await expect(page.locator('.profile-panel')).toBeVisible()
    await expect(page.locator('.username')).toHaveText('Test User')
  })

  test('Token 过期后显示未登录：注入已过期 token → reload → 验证显示登录面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    // 注入已过期的 token
    const expiredTokens = {
      ...MOCK_TOKENS,
      expiresIn: -3600 // 已过期
    }
    await injectAuthState(page, MOCK_USER, expiredTokens)

    // Mock /auth/me 返回 401
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token expired' })
      })
    })

    // 刷新页面
    await page.reload()
    await page.waitForSelector('body')

    // 打开账号 tab
    await openAccountTab(page)

    // 验证显示登录面板
    await expect(page.locator('.login-panel')).toBeVisible()
  })

  test('自动刷新 token：注入即将过期 token → 等待刷新 → 验证 localStorage 中 token 已更新', async ({
    page
  }) => {
    const newTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer'
    }
    await mockRefreshToken(page, newTokens)

    await page.goto('/')
    await page.waitForSelector('body')

    // 注入即将过期的 token（30 秒后过期）
    const soonExpireTokens = {
      ...MOCK_TOKENS,
      expiresIn: 30
    }
    await injectAuthState(page, MOCK_USER, soonExpireTokens)

    // reload 让 initialize() 读取 token 并启动 scheduleTokenRefresh
    await page.reload()
    await page.waitForSelector('body')

    // 等待自动刷新（TOKEN_REFRESH_THRESHOLD = 60 秒，所以会立即触发）
    await page.waitForTimeout(3000)

    // 验证 localStorage 中 token 已更新
    const authState = await getAuthState(page)
    expect(authState.tokens.accessToken).toBe('new-access-token')
    expect(authState.tokens.refreshToken).toBe('new-refresh-token')
  })

  test('登出清除状态：注入 token → 打开账号 tab → 点击退出登录 → 验证回到登录面板', async ({
    page
  }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    // 注入认证状态
    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)
    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 验证已登录
    await expect(page.locator('.profile-panel')).toBeVisible()

    // 点击退出登录
    await page.click('button.logout-btn:has-text("退出登录")')

    // 等待登出完成
    await page.waitForTimeout(1000)

    // 验证回到登录面板
    await expect(page.locator('.login-panel')).toBeVisible()

    // 验证 localStorage 已清空
    const authState = await getAuthState(page)
    expect(authState.user).toBeNull()
    expect(authState.tokens).toBeNull()
  })

  test('登出后刷新仍为未登录：登出 → reload → 验证登录面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)
    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 登出
    await page.click('button.logout-btn:has-text("退出登录")')
    await page.waitForTimeout(1000)

    // 刷新页面
    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 验证仍显示登录面板
    await expect(page.locator('.login-panel')).toBeVisible()
  })

  test('多 tab 场景（localStorage 事件）：注入 token → 清除 localStorage → 验证 UI 响应', async ({
    page
  }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)
    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 验证已登录
    await expect(page.locator('.profile-panel')).toBeVisible()

    // 模拟另一个 tab 清除了 localStorage
    await clearAuthState(page)

    // 触发 storage 事件
    await page.evaluate(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'swm_access_token',
          oldValue: 'mock-access-token-abc123',
          newValue: null,
          storageArea: localStorage
        })
      )
    })

    // 等待 UI 响应
    await page.waitForTimeout(1000)

    // 刷新页面验证状态
    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 验证显示登录面板
    await expect(page.locator('.login-panel')).toBeVisible()
  })

  test('无 token 时打开账号 tab 显示登录面板', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 验证显示登录面板
    await expect(page.locator('.login-panel')).toBeVisible()
  })
})
