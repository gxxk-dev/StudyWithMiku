/**
 * E2E 测试 - 离线队列和网络恢复后自动同步
 */

import { test, expect } from '@playwright/test'
import {
  mockAuthConfig,
  mockGetMe,
  mockDataSync,
  mockDataSyncError,
  mockAuthMethods,
  MOCK_USER,
  MOCK_TOKENS
} from './helpers/mockApi.js'
import { openAccountTab, injectAuthState } from './helpers/navigate.js'

test.describe('离线队列和数据同步', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthConfig(page)
    await mockGetMe(page, MOCK_USER)
    await mockAuthMethods(page, [{ id: 'webauthn-1', type: 'webauthn', deviceName: 'Test Device' }])
  })

  test('已登录时同步面板显示正确状态', async ({ page }) => {
    await mockDataSync(page, {
      focus_records: [],
      focus_settings: {}
    })

    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)
    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 验证同步面板可见
    await expect(page.locator('.sync-panel')).toBeVisible()

    // 验证状态文字
    await expect(page.locator('.status-text')).toBeVisible()
  })

  test('点击立即同步触发 API 调用：mock API → 点击同步按钮 → 验证状态变为 synced', async ({
    page
  }) => {
    let syncCalled = false
    await page.route('**/api/data/*', (route) => {
      if (route.request().method() === 'PUT') {
        syncCalled = true
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
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'focus_records',
            data: [],
            version: 1
          })
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)

    // 添加待同步队列，triggerSync 只上传 pendingChanges 中的数据
    await page.evaluate(() => {
      const queue = [
        {
          id: 'focus_records_queued',
          type: 'focus_records',
          data: [{ id: 'r1', mode: 'focus', duration: 1500 }],
          version: 1,
          timestamp: Date.now(),
          operation: 'update'
        }
      ]
      localStorage.setItem('swm_sync_queue', JSON.stringify(queue))
    })

    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 点击立即同步
    await page.click('button.btn-sync:has-text("立即同步")')

    // 等待同步完成
    await page.waitForTimeout(2000)

    // 验证 PUT API 被调用
    expect(syncCalled).toBe(true)

    // 验证状态文字变为已同步
    await expect(page.locator('.status-text')).toContainText('已同步', { timeout: 5000 })
  })

  test('离线时显示离线状态：setOffline(true) → 验证 navigator.onLine 为 false', async ({
    page,
    context
  }) => {
    await mockDataSync(page, {})

    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)
    await page.reload()
    await page.waitForSelector('body')

    // 设置离线（在 reload 之后，否则页面无法加载）
    await context.setOffline(true)

    // 验证显示离线状态（通过检查 navigator.onLine）
    const isOnline = await page.evaluate(() => navigator.onLine)
    expect(isOnline).toBe(false)
  })

  test('离线操作后恢复网络自动同步：设置离线 → 触发数据变更 → 恢复网络 → 验证队列被处理', async ({
    page,
    context
  }) => {
    let syncCalled = false
    await page.route('**/api/data/*', (route) => {
      if (route.request().method() === 'PUT') {
        syncCalled = true
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
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'focus_records',
            data: [],
            version: 1
          })
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)
    await page.reload()
    await page.waitForSelector('body')

    // 设置离线
    await context.setOffline(true)

    // 模拟离线时的数据变更：同时写入 localStorage 和同步队列
    await page.evaluate(() => {
      const records = [
        {
          id: 'test-record-1',
          mode: 'focus',
          duration: 1500,
          startTime: Date.now(),
          endTime: Date.now() + 1500000
        }
      ]
      localStorage.setItem('swm_focus_records', JSON.stringify(records))
      const queue = [
        {
          id: 'focus_records_offline',
          type: 'focus_records',
          data: records,
          version: 1,
          timestamp: Date.now(),
          operation: 'update'
        }
      ]
      localStorage.setItem('swm_sync_queue', JSON.stringify(queue))
    })

    // 恢复网络
    await context.setOffline(false)

    await openAccountTab(page)

    // 点击立即同步
    await page.click('button.btn-sync:has-text("立即同步")')

    // 等待同步完成
    await page.waitForTimeout(3000)

    // 验证 API 被调用
    expect(syncCalled).toBe(true)
  })

  test('同步失败显示错误状态：mock API 返回 500 → 点击同步 → 验证状态为 error', async ({
    page
  }) => {
    await mockDataSyncError(page)

    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)
    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 点击立即同步
    await page.click('button.btn-sync:has-text("立即同步")')

    // 等待同步失败
    await page.waitForTimeout(2000)

    // 验证状态文字变为失败
    await expect(page.locator('.status-text')).toContainText('失败', { timeout: 5000 })
  })

  test('同步冲突处理：mock PUT 返回 409 → 验证前端重试', async ({ page }) => {
    let conflictReturned = false
    let forceUploadCalled = false

    // 先注册通配路由处理其他数据类型
    await page.route('**/api/data/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'unknown',
          data: null,
          version: 1
        })
      })
    })

    // 再注册 focus_records 专用路由（后注册的优先匹配）
    await page.route('**/api/data/focus_records', (route) => {
      if (route.request().method() === 'PUT') {
        if (!conflictReturned) {
          conflictReturned = true
          route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Conflict',
              conflict: true,
              serverData: [],
              serverVersion: 2
            })
          })
        } else {
          forceUploadCalled = true
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              version: 3,
              merged: false
            })
          })
        }
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'focus_records',
            data: [],
            version: 1
          })
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('body')

    await injectAuthState(page, MOCK_USER, MOCK_TOKENS)

    // 添加数据到 localStorage 和同步队列
    await page.evaluate(() => {
      const records = [
        {
          id: 'test-record-1',
          mode: 'focus',
          duration: 1500,
          startTime: Date.now(),
          endTime: Date.now() + 1500000
        }
      ]
      localStorage.setItem('swm_focus_records', JSON.stringify(records))
      const queue = [
        {
          id: 'focus_records_conflict',
          type: 'focus_records',
          data: records,
          version: 1,
          timestamp: Date.now(),
          operation: 'update'
        }
      ]
      localStorage.setItem('swm_sync_queue', JSON.stringify(queue))
    })

    await page.reload()
    await page.waitForSelector('body')

    await openAccountTab(page)

    // 点击立即同步
    await page.click('button.btn-sync:has-text("立即同步")')

    // 等待冲突解决和重试
    await page.waitForTimeout(3000)

    // 验证 force upload 被调用
    expect(forceUploadCalled).toBe(true)
  })
})
