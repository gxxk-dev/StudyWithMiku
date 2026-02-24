/**
 * focusEventBus 集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { focusEventBus } from '@/composables/focus/eventBus.js'

describe('focusEventBus', () => {
  beforeEach(() => {
    focusEventBus.clear()
  })

  describe('on / emit', () => {
    it('应该触发已注册的监听器', () => {
      const callback = vi.fn()
      focusEventBus.on('transition', callback)

      focusEventBus.emit('transition', { action: 'start', mode: 'focus' })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ action: 'start', mode: 'focus' })
    })

    it('应该支持多个监听器', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      focusEventBus.on('transition', cb1)
      focusEventBus.on('transition', cb2)

      focusEventBus.emit('transition', { action: 'pause' })

      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
    })

    it('不同事件不互相影响', () => {
      const transitionCb = vi.fn()
      const tickCb = vi.fn()
      focusEventBus.on('transition', transitionCb)
      focusEventBus.on('tick', tickCb)

      focusEventBus.emit('transition', { action: 'start' })

      expect(transitionCb).toHaveBeenCalledTimes(1)
      expect(tickCb).not.toHaveBeenCalled()
    })

    it('没有监听器时 emit 不报错', () => {
      expect(() => {
        focusEventBus.emit('nonexistent', { data: 'test' })
      }).not.toThrow()
    })
  })

  describe('取消订阅', () => {
    it('on 返回的函数可以取消订阅', () => {
      const callback = vi.fn()
      const unsub = focusEventBus.on('transition', callback)

      focusEventBus.emit('transition', { action: 'start' })
      expect(callback).toHaveBeenCalledTimes(1)

      unsub()
      focusEventBus.emit('transition', { action: 'pause' })
      expect(callback).toHaveBeenCalledTimes(1) // 不再增加
    })
  })

  describe('错误处理', () => {
    it('一个监听器报错不影响其他监听器', () => {
      const errorCb = vi.fn(() => {
        throw new Error('test error')
      })
      const normalCb = vi.fn()

      // 静默 console.error
      vi.spyOn(console, 'error').mockImplementation(() => {})

      focusEventBus.on('transition', errorCb)
      focusEventBus.on('transition', normalCb)

      focusEventBus.emit('transition', { action: 'start' })

      expect(errorCb).toHaveBeenCalledTimes(1)
      expect(normalCb).toHaveBeenCalledTimes(1)

      console.error.mockRestore()
    })
  })

  describe('clear', () => {
    it('clear 特定事件', () => {
      const cb = vi.fn()
      focusEventBus.on('transition', cb)

      focusEventBus.clear('transition')
      focusEventBus.emit('transition', {})

      expect(cb).not.toHaveBeenCalled()
    })

    it('clear 所有事件', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      focusEventBus.on('transition', cb1)
      focusEventBus.on('tick', cb2)

      focusEventBus.clear()
      focusEventBus.emit('transition', {})
      focusEventBus.emit('tick', {})

      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).not.toHaveBeenCalled()
    })
  })
})
