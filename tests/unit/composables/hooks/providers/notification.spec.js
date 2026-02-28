/**
 * notification provider 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notificationProvider } from '@/composables/hooks/providers/notification.js'

describe('notificationProvider', () => {
  let originalNotification

  beforeEach(() => {
    originalNotification = globalThis.Notification
  })

  afterEach(() => {
    globalThis.Notification = originalNotification
  })

  it('id 为 notification', () => {
    expect(notificationProvider.id).toBe('notification')
  })

  it('hidden 为 false', () => {
    expect(notificationProvider.hidden).toBe(false)
  })

  describe('isAvailable', () => {
    it('permission granted 时返回 true', () => {
      globalThis.Notification = { permission: 'granted' }
      expect(notificationProvider.isAvailable()).toBe(true)
    })

    it('permission denied 时返回 false', () => {
      globalThis.Notification = { permission: 'denied' }
      expect(notificationProvider.isAvailable()).toBe(false)
    })

    it('Notification 未定义时返回 false', () => {
      delete globalThis.Notification
      expect(notificationProvider.isAvailable()).toBe(false)
    })
  })

  describe('getStatus', () => {
    it('已授权时返回可用状态', () => {
      globalThis.Notification = { permission: 'granted' }
      const status = notificationProvider.getStatus()
      expect(status.available).toBe(true)
      expect(status.label).toBe('已授权')
    })

    it('已拒绝时返回不可用状态', () => {
      globalThis.Notification = { permission: 'denied' }
      const status = notificationProvider.getStatus()
      expect(status.available).toBe(false)
      expect(status.label).toBe('已拒绝')
    })

    it('未授权时返回未授权状态', () => {
      globalThis.Notification = { permission: 'default' }
      const status = notificationProvider.getStatus()
      expect(status.available).toBe(false)
      expect(status.label).toBe('未授权')
    })
  })

  describe('execute', () => {
    it('使用 hook 中的 title 和 body', () => {
      const mockNotification = vi.fn()
      globalThis.Notification = mockNotification
      globalThis.Notification.permission = 'granted'

      const hook = {
        action: { title: '测试标题', body: '测试内容', tag: 'test-tag' }
      }

      notificationProvider.execute(hook, {})
      expect(mockNotification).toHaveBeenCalledWith('测试标题', {
        body: '测试内容',
        icon: '/favicon.ico',
        tag: 'test-tag'
      })
    })

    it('无 action 时使用默认文案', () => {
      const mockNotification = vi.fn()
      globalThis.Notification = mockNotification
      globalThis.Notification.permission = 'granted'

      const hook = { action: {} }
      const context = {
        completionType: 'completed',
        mode: 'focus',
        duration: 1500
      }

      notificationProvider.execute(hook, context)
      expect(mockNotification).toHaveBeenCalledWith(
        '专注完成！',
        expect.objectContaining({
          body: expect.stringContaining('25')
        })
      )
    })

    it('Notification 构造失败时不抛错', () => {
      globalThis.Notification = vi.fn(() => {
        throw new Error('mock error')
      })
      globalThis.Notification.permission = 'granted'

      expect(() => {
        notificationProvider.execute({ action: {} }, {})
      }).not.toThrow()
    })
  })
})
