/**
 * E2E 测试 - 基础功能
 * 简单的冒烟测试，验证应用能正常加载
 */

import { test, expect } from '@playwright/test'

test.describe('基础功能', () => {
  test('页面能正常加载', async ({ page }) => {
    await page.goto('/')

    // 等待页面加载
    await page.waitForSelector('body')

    // 验证页面可见
    await expect(page.locator('body')).toBeVisible()
  })

  test('Vue 应用能正常挂载', async ({ page }) => {
    await page.goto('/')

    // 等待 app 容器
    await page.waitForSelector('#app', { timeout: 10000 })

    // 验证有内容
    const content = await page.locator('#app').innerHTML()
    expect(content.length).toBeGreaterThan(10)
  })

  test('支持 URL 参数访问', async ({ page }) => {
    await page.goto('/?playlist=netease:12345678')

    await page.waitForSelector('body')
    await expect(page.locator('body')).toBeVisible()
  })

  test('支持 Spotify URL 参数', async ({ page }) => {
    await page.goto('/?playlist=spotify:37i9dQZF1DXcBWIGoYBM5M')

    await page.waitForSelector('body')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('响应式布局', () => {
  test('移动端能正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await page.waitForSelector('body')
    await expect(page.locator('body')).toBeVisible()
  })

  test('平板端能正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    await page.waitForSelector('body')
    await expect(page.locator('body')).toBeVisible()
  })

  test('桌面端能正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    await page.waitForSelector('body')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('浏览器 API', () => {
  test('localStorage 可用', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    const hasLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('_test', '1')
        localStorage.removeItem('_test')
        return true
      } catch {
        return false
      }
    })

    expect(hasLocalStorage).toBe(true)
  })

  test('Service Worker API 可用', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('body')

    const hasSW = await page.evaluate(() => 'serviceWorker' in navigator)
    expect(hasSW).toBe(true)
  })
})

test.describe('性能', () => {
  test('页面加载在 10 秒内完成', async ({ page }) => {
    const start = Date.now()

    await page.goto('/')
    await page.waitForSelector('body')

    const loadTime = Date.now() - start
    expect(loadTime).toBeLessThan(10000)
  })
})
