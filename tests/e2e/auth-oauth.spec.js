/**
 * E2E 测试 - OAuth 回调处理
 * 模拟 OAuth 回调 URL hash 参数
 */

import { test, expect } from '@playwright/test'
import { mockAuthConfig, mockGetMe, MOCK_OAUTH_USER, MOCK_TOKENS } from './helpers/mockApi.js'
import { openAccountTab } from './helpers/navigate.js'

test.describe('OAuth 回调处理', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthConfig(page)
    await mockGetMe(page, MOCK_OAUTH_USER)
  })

  test('GitHub OAuth 回调：导航到带 hash 的 URL → 验证自动登录', async ({ page }) => {
    // 构造 OAuth 回调 URL
    const userJson = encodeURIComponent(JSON.stringify(MOCK_OAUTH_USER))
    const callbackUrl = `http://localhost:3000/#access_token=${MOCK_TOKENS.accessToken}&refresh_token=${MOCK_TOKENS.refreshToken}&expires_in=${MOCK_TOKENS.expiresIn}&user=${userJson}`

    // 导航到回调 URL
    await page.goto(callbackUrl)
    await page.waitForSelector('body')

    // 等待 OAuth 回调处理完成
    await page.waitForTimeout(1000)

    // 打开账号 tab
    await openAccountTab(page)

    // 验证已登录
    await expect(page.locator('.profile-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.username')).toHaveText('OAuth User')
    await expect(page.locator('.provider')).toContainText('GitHub')
  })

  test('Google OAuth 回调：provider 为 Google', async ({ page }) => {
    const googleUser = { ...MOCK_OAUTH_USER, authProvider: 'google' }
    await mockGetMe(page, googleUser)

    const userJson = encodeURIComponent(JSON.stringify(googleUser))
    const callbackUrl = `http://localhost:3000/#access_token=${MOCK_TOKENS.accessToken}&refresh_token=${MOCK_TOKENS.refreshToken}&expires_in=${MOCK_TOKENS.expiresIn}&user=${userJson}`

    await page.goto(callbackUrl)
    await page.waitForSelector('body')
    await page.waitForTimeout(1000)

    await openAccountTab(page)

    await expect(page.locator('.profile-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.provider')).toContainText('Google')
  })

  test('OAuth 回调带 is_new=true：验证新用户也能正常登录', async ({ page }) => {
    const userJson = encodeURIComponent(JSON.stringify(MOCK_OAUTH_USER))
    const callbackUrl = `http://localhost:3000/#access_token=${MOCK_TOKENS.accessToken}&refresh_token=${MOCK_TOKENS.refreshToken}&expires_in=${MOCK_TOKENS.expiresIn}&user=${userJson}&is_new=true`

    await page.goto(callbackUrl)
    await page.waitForSelector('body')
    await page.waitForTimeout(1000)

    await openAccountTab(page)

    await expect(page.locator('.profile-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.username')).toHaveText('OAuth User')
  })

  test('OAuth 回调带 error 参数：验证未登录', async ({ page }) => {
    const callbackUrl =
      'http://localhost:3000/#error=access_denied&error_description=User%20cancelled'

    await page.goto(callbackUrl)
    await page.waitForSelector('body')
    await page.waitForTimeout(1000)

    await openAccountTab(page)

    // 验证仍显示登录面板（未登录）
    await expect(page.locator('.login-panel')).toBeVisible()
  })

  test('OAuth 回调后 URL hash 被清除', async ({ page }) => {
    const userJson = encodeURIComponent(JSON.stringify(MOCK_OAUTH_USER))
    const callbackUrl = `http://localhost:3000/#access_token=${MOCK_TOKENS.accessToken}&refresh_token=${MOCK_TOKENS.refreshToken}&expires_in=${MOCK_TOKENS.expiresIn}&user=${userJson}`

    await page.goto(callbackUrl)
    await page.waitForSelector('body')
    await page.waitForTimeout(1000)

    // 验证 URL hash 已被清除
    const currentUrl = page.url()
    expect(currentUrl).toBe('http://localhost:3000/')
  })

  test('点击 OAuth 按钮触发跳转：验证 sessionStorage 保存了 return URL', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    await openAccountTab(page)

    // Mock window.location 赋值（拦截跳转）
    await page.evaluate(() => {
      window._originalLocation = window.location.href
      Object.defineProperty(window, 'location', {
        value: {
          href: window._originalLocation,
          pathname: window.location.pathname,
          hash: window.location.hash
        },
        writable: true,
        configurable: true
      })
    })

    // 点击 GitHub OAuth 按钮
    await page.click('button.oauth-btn.github')

    // 验证 sessionStorage 保存了 return URL
    const returnUrl = await page.evaluate(() => {
      return sessionStorage.getItem('swm_oauth_return_url')
    })

    expect(returnUrl).toBeTruthy()
    expect(returnUrl).toContain('http://localhost:3000')
  })
})
