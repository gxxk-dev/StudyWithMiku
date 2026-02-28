/**
 * hooks/hookEngine.js 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock providerRegistry
vi.mock('@/composables/hooks/providerRegistry.js', () => {
  const providers = new Map()
  return {
    providerRegistry: {
      get: (id) => providers.get(id),
      register: (p) => providers.set(p.id, p),
      clear: () => providers.clear(),
      has: (id) => providers.has(id)
    }
  }
})

import {
  mapTransitionToTrigger,
  evaluateHooks,
  dispatchToProviders
} from '@/composables/hooks/hookEngine.js'
import { FocusMode } from '@/composables/focus/constants.js'
import { HookTrigger } from '@/composables/hooks/constants.js'
import { providerRegistry } from '@/composables/hooks/providerRegistry.js'

describe('hooks/hookEngine', () => {
  describe('mapTransitionToTrigger', () => {
    it('start + focus → FOCUS_START', () => {
      expect(mapTransitionToTrigger('start', FocusMode.FOCUS)).toBe(HookTrigger.FOCUS_START)
    })

    it('start + shortBreak → BREAK_START', () => {
      expect(mapTransitionToTrigger('start', FocusMode.SHORT_BREAK)).toBe(HookTrigger.BREAK_START)
    })

    it('start + longBreak → BREAK_START', () => {
      expect(mapTransitionToTrigger('start', FocusMode.LONG_BREAK)).toBe(HookTrigger.BREAK_START)
    })

    it('pause + focus → FOCUS_PAUSE', () => {
      expect(mapTransitionToTrigger('pause', FocusMode.FOCUS)).toBe(HookTrigger.FOCUS_PAUSE)
    })

    it('pause + break → null', () => {
      expect(mapTransitionToTrigger('pause', FocusMode.SHORT_BREAK)).toBeNull()
    })

    it('resume + focus → FOCUS_RESUME', () => {
      expect(mapTransitionToTrigger('resume', FocusMode.FOCUS)).toBe(HookTrigger.FOCUS_RESUME)
    })

    it('complete + focus → FOCUS_COMPLETED', () => {
      expect(mapTransitionToTrigger('complete', FocusMode.FOCUS)).toBe(HookTrigger.FOCUS_COMPLETED)
    })

    it('complete + shortBreak → BREAK_COMPLETED', () => {
      expect(mapTransitionToTrigger('complete', FocusMode.SHORT_BREAK)).toBe(
        HookTrigger.BREAK_COMPLETED
      )
    })

    it('cancel + focus → FOCUS_CANCELLED', () => {
      expect(mapTransitionToTrigger('cancel', FocusMode.FOCUS)).toBe(HookTrigger.FOCUS_CANCELLED)
    })

    it('cancel + longBreak → BREAK_CANCELLED', () => {
      expect(mapTransitionToTrigger('cancel', FocusMode.LONG_BREAK)).toBe(
        HookTrigger.BREAK_CANCELLED
      )
    })

    it('skip + focus → FOCUS_SKIPPED', () => {
      expect(mapTransitionToTrigger('skip', FocusMode.FOCUS)).toBe(HookTrigger.FOCUS_SKIPPED)
    })

    it('skip + shortBreak → BREAK_SKIPPED', () => {
      expect(mapTransitionToTrigger('skip', FocusMode.SHORT_BREAK)).toBe(HookTrigger.BREAK_SKIPPED)
    })

    it('tick + focus → FOCUS_TICK', () => {
      expect(mapTransitionToTrigger('tick', FocusMode.FOCUS)).toBe(HookTrigger.FOCUS_TICK)
    })

    it('tick + break → BREAK_TICK', () => {
      expect(mapTransitionToTrigger('tick', FocusMode.SHORT_BREAK)).toBe(HookTrigger.BREAK_TICK)
    })

    it('未知 action → null', () => {
      expect(mapTransitionToTrigger('unknown', FocusMode.FOCUS)).toBeNull()
    })
  })

  describe('evaluateHooks', () => {
    it('返回匹配的已启用钩子', () => {
      const hooks = [
        { id: '1', enabled: true, trigger: HookTrigger.FOCUS_PAUSE },
        { id: '2', enabled: true, trigger: HookTrigger.FOCUS_START },
        { id: '3', enabled: false, trigger: HookTrigger.FOCUS_PAUSE }
      ]

      const matched = evaluateHooks(hooks, HookTrigger.FOCUS_PAUSE)
      expect(matched).toHaveLength(1)
      expect(matched[0].id).toBe('1')
    })

    it('过滤 disabled 的钩子', () => {
      const hooks = [{ id: '1', enabled: false, trigger: HookTrigger.FOCUS_PAUSE }]
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_PAUSE)).toHaveLength(0)
    })

    it('tick 钩子检查间隔条件', () => {
      const hooks = [{ id: '1', enabled: true, trigger: HookTrigger.FOCUS_TICK, tickInterval: 300 }]

      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 100 })).toHaveLength(0)
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 300 })).toHaveLength(1)
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 600 })).toHaveLength(1)
    })

    it('tick 间隔为 0 时不触发', () => {
      const hooks = [{ id: '1', enabled: true, trigger: HookTrigger.FOCUS_TICK, tickInterval: 0 }]
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 100 })).toHaveLength(0)
    })

    it('elapsed 为 0 时不触发 tick', () => {
      const hooks = [{ id: '1', enabled: true, trigger: HookTrigger.FOCUS_TICK, tickInterval: 300 }]
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 0 })).toHaveLength(0)
    })

    it('空钩子列表返回空数组', () => {
      expect(evaluateHooks([], HookTrigger.FOCUS_START)).toEqual([])
    })

    it('null 钩子列表返回空数组', () => {
      expect(evaluateHooks(null, HookTrigger.FOCUS_START)).toEqual([])
    })

    it('null trigger 返回空数组', () => {
      expect(evaluateHooks([{ id: '1', enabled: true }], null)).toEqual([])
    })
  })

  describe('dispatchToProviders', () => {
    beforeEach(() => {
      providerRegistry.clear()
    })

    it('调用匹配 provider 的 execute', () => {
      const executeFn = vi.fn()
      providerRegistry.register({
        id: 'test',
        isAvailable: () => true,
        execute: executeFn
      })

      const hooks = [{ id: '1', provider: 'test', action: {} }]
      const context = { mode: 'focus' }

      dispatchToProviders(hooks, context)
      expect(executeFn).toHaveBeenCalledWith(hooks[0], context)
    })

    it('provider 不可用时跳过', () => {
      const executeFn = vi.fn()
      providerRegistry.register({
        id: 'test',
        isAvailable: () => false,
        execute: executeFn
      })

      dispatchToProviders([{ id: '1', provider: 'test' }], {})
      expect(executeFn).not.toHaveBeenCalled()
    })

    it('provider 不存在时静默跳过', () => {
      expect(() => {
        dispatchToProviders([{ id: '1', provider: 'nonexistent' }], {})
      }).not.toThrow()
    })

    it('provider execute 报错不影响其他 hook', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const executeFn1 = vi.fn(() => {
        throw new Error('test error')
      })
      const executeFn2 = vi.fn()

      providerRegistry.register({ id: 'err', isAvailable: () => true, execute: executeFn1 })
      providerRegistry.register({ id: 'ok', isAvailable: () => true, execute: executeFn2 })

      dispatchToProviders(
        [
          { id: '1', provider: 'err', name: 'error hook' },
          { id: '2', provider: 'ok', name: 'ok hook' }
        ],
        {}
      )

      expect(executeFn1).toHaveBeenCalled()
      expect(executeFn2).toHaveBeenCalled()

      console.error.mockRestore()
    })
  })
})
