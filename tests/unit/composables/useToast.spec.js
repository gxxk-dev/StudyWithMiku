/**
 * src/composables/useToast.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('useToast.js', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 重置模块以清除单例状态
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('showToast', () => {
    it('应该添加通知到数组', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('success', '操作成功', '数据已保存')

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].type).toBe('success')
      expect(notifications.value[0].title).toBe('操作成功')
      expect(notifications.value[0].message).toBe('数据已保存')
    })

    it('新通知应该出现在数组开头', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', '第一个', '', 0)
      showToast('success', '第二个', '', 0)

      expect(notifications.value[0].title).toBe('第二个')
      expect(notifications.value[1].title).toBe('第一个')
    })

    it('应该返回通知 ID', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { showToast } = useToast()

      const id = showToast('info', '测试')
      expect(typeof id).toBe('number')
    })

    it('应该使用默认 duration', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', '提示')
      expect(notifications.value[0].duration).toBe(3000)
    })

    it('应该支持自定义 duration', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('error', '错误', '详情', 5000)
      expect(notifications.value[0].duration).toBe(5000)
    })

    it('超出最大数量应该移除最旧的', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      for (let i = 1; i <= 6; i++) {
        showToast('info', `通知 ${i}`, '', 0)
      }

      expect(notifications.value).toHaveLength(5)
      expect(notifications.value[0].title).toBe('通知 6')
      // 通知 1 被移除
    })

    it('应该在指定时间后自动移除', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', '测试', '', 1000)
      expect(notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(notifications.value).toHaveLength(0)
    })

    it('duration 为 0 时不应该自动移除', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', '持久提示', '', 0)
      expect(notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(10000)
      expect(notifications.value).toHaveLength(1)
    })

    it('应该支持不同的 toast 类型', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', 'Info', '', 0)
      showToast('success', 'Success', '', 0)
      showToast('error', 'Error', '', 0)

      expect(notifications.value[2].type).toBe('info')
      expect(notifications.value[1].type).toBe('success')
      expect(notifications.value[0].type).toBe('error')
    })

    it('空消息应该被接受', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', '仅标题')
      expect(notifications.value[0].message).toBe('')
    })
  })

  describe('removeNotification', () => {
    it('应该移除指定 ID 的通知', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast, removeNotification } = useToast()

      const id1 = showToast('info', '通知 1', '', 0)
      showToast('info', '通知 2', '', 0)

      removeNotification(id1)

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].title).toBe('通知 2')
    })

    it('移除不存在的 ID 不应该报错', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast, removeNotification } = useToast()

      showToast('info', '通知 1', '', 0)
      removeNotification(99999)

      expect(notifications.value).toHaveLength(1)
    })
  })

  describe('clearAll', () => {
    it('应该清空所有通知', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast, clearAll } = useToast()

      showToast('info', '通知 1', '', 0)
      showToast('info', '通知 2', '', 0)
      clearAll()

      expect(notifications.value).toHaveLength(0)
    })
  })

  describe('hideToast (兼容旧 API)', () => {
    it('应该移除最新通知', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast, hideToast } = useToast()

      showToast('info', '通知 1', '', 0)
      showToast('info', '通知 2', '', 0)

      expect(notifications.value).toHaveLength(2)

      hideToast()
      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].title).toBe('通知 1')
    })

    it('空列表时调用不应该报错', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { hideToast } = useToast()

      expect(() => hideToast()).not.toThrow()
    })
  })

  describe('多通知同时显示', () => {
    it('多个通知应该同时存在', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', 'A', '', 0)
      showToast('success', 'B', '', 0)
      showToast('error', 'C', '', 0)

      expect(notifications.value).toHaveLength(3)
    })

    it('每个通知应该独立计时消失', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', 'A', '', 1000)
      showToast('success', 'B', '', 2000)
      showToast('error', 'C', '', 3000)

      expect(notifications.value).toHaveLength(3)

      vi.advanceTimersByTime(1000)
      expect(notifications.value).toHaveLength(2)

      vi.advanceTimersByTime(1000)
      expect(notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(notifications.value).toHaveLength(0)
    })
  })

  describe('进度条数据', () => {
    it('通知应该包含 createdAt 时间戳', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      const before = Date.now()
      showToast('info', '测试')
      const after = Date.now()

      expect(notifications.value[0].createdAt).toBeGreaterThanOrEqual(before)
      expect(notifications.value[0].createdAt).toBeLessThanOrEqual(after)
    })

    it('通知应该包含 duration 用于进度条', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { notifications, showToast } = useToast()

      showToast('info', '测试', '', 5000)

      expect(notifications.value[0].duration).toBe(5000)
    })
  })

  describe('单例行为', () => {
    it('多次调用 useToast 应该返回相同的通知列表', async () => {
      const { useToast } = await import('@/composables/useToast.js')

      const { notifications: list1, showToast } = useToast()
      const { notifications: list2 } = useToast()

      showToast('info', '测试', '', 0)

      expect(list1.value[0].title).toBe('测试')
      expect(list2.value[0].title).toBe('测试')
      expect(list1).toBe(list2)
    })
  })
})
