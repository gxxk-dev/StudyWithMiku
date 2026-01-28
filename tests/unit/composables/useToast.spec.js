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
    it('应该显示 toast 并更新状态', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast } = useToast()

      showToast('success', '操作成功', '数据已保存')

      expect(toastState.visible).toBe(true)
      expect(toastState.type).toBe('success')
      expect(toastState.title).toBe('操作成功')
      expect(toastState.message).toBe('数据已保存')
    })

    it('应该使用默认 duration', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast } = useToast()

      showToast('info', '提示')
      expect(toastState.duration).toBe(3000)
    })

    it('应该支持自定义 duration', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast } = useToast()

      showToast('error', '错误', '详情', 5000)
      expect(toastState.duration).toBe(5000)
    })

    it('应该在指定时间后自动隐藏', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast } = useToast()

      showToast('info', '提示', '', 3000)
      expect(toastState.visible).toBe(true)

      // 快进到 toast 消失
      vi.advanceTimersByTime(3000)
      expect(toastState.visible).toBe(false)
    })

    it('duration 为 0 时不应该自动隐藏', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast } = useToast()

      showToast('info', '持久提示', '', 0)
      expect(toastState.visible).toBe(true)

      vi.advanceTimersByTime(10000)
      expect(toastState.visible).toBe(true)
    })

    it('应该支持不同的 toast 类型', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast, hideToast } = useToast()

      // info
      showToast('info', 'Info')
      expect(toastState.type).toBe('info')
      hideToast()
      vi.advanceTimersByTime(300)

      // success
      showToast('success', 'Success')
      expect(toastState.type).toBe('success')
      hideToast()
      vi.advanceTimersByTime(300)

      // error
      showToast('error', 'Error')
      expect(toastState.type).toBe('error')
    })

    it('空消息应该被接受', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast } = useToast()

      showToast('info', '仅标题')
      expect(toastState.message).toBe('')
    })
  })

  describe('hideToast', () => {
    it('应该隐藏 toast', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast, hideToast } = useToast()

      showToast('info', '提示')
      expect(toastState.visible).toBe(true)

      hideToast()
      expect(toastState.visible).toBe(false)
    })
  })

  describe('toast 队列', () => {
    it('多个 toast 应该排队显示', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast } = useToast()

      showToast('info', '第一个', '', 1000)
      showToast('success', '第二个', '', 1000)

      // 第一个显示
      expect(toastState.title).toBe('第一个')
      expect(toastState.type).toBe('info')

      // 等待第一个自动消失
      vi.advanceTimersByTime(1000)
      // 等待动画完成
      vi.advanceTimersByTime(300)

      // 第二个显示
      expect(toastState.title).toBe('第二个')
      expect(toastState.type).toBe('success')
    })

    it('手动关闭后应该显示下一个', async () => {
      const { useToast } = await import('@/composables/useToast.js')
      const { toastState, showToast, hideToast } = useToast()

      showToast('info', '第一个', '', 0) // 不自动关闭
      showToast('success', '第二个', '', 0)

      expect(toastState.title).toBe('第一个')

      hideToast()
      vi.advanceTimersByTime(300) // 动画时间

      expect(toastState.title).toBe('第二个')
    })
  })

  describe('单例行为', () => {
    it('多次调用 useToast 应该返回相同的状态', async () => {
      const { useToast } = await import('@/composables/useToast.js')

      const { toastState: state1, showToast } = useToast()
      const { toastState: state2 } = useToast()

      showToast('info', '测试')

      expect(state1.title).toBe('测试')
      expect(state2.title).toBe('测试')
      expect(state1).toBe(state2)
    })
  })
})
