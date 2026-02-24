/**
 * coyote/hookEngine.js 单元测试
 */

import { describe, it, expect, vi } from 'vitest'
import {
  mapTransitionToTrigger,
  evaluateHooks,
  executeAction
} from '@/composables/coyote/hookEngine.js'
import { FocusMode } from '@/composables/focus/constants.js'
import { HookTrigger, HookActionType } from '@/composables/coyote/constants.js'

describe('coyote/hookEngine', () => {
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

    it('pause + break → null（休息没有暂停事件）', () => {
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

      const matched = evaluateHooks(hooks, HookTrigger.FOCUS_PAUSE)
      expect(matched).toHaveLength(0)
    })

    it('tick 钩子检查间隔条件', () => {
      const hooks = [{ id: '1', enabled: true, trigger: HookTrigger.FOCUS_TICK, tickInterval: 300 }]

      // elapsed 不是 300 的倍数
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 100 })).toHaveLength(0)
      // elapsed 是 300 的倍数
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 300 })).toHaveLength(1)
      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 600 })).toHaveLength(1)
    })

    it('tick 间隔为 0 时不触发', () => {
      const hooks = [{ id: '1', enabled: true, trigger: HookTrigger.FOCUS_TICK, tickInterval: 0 }]

      expect(evaluateHooks(hooks, HookTrigger.FOCUS_TICK, { elapsed: 100 })).toHaveLength(0)
    })

    it('tick 间隔为负数时不触发', () => {
      const hooks = [{ id: '1', enabled: true, trigger: HookTrigger.FOCUS_TICK, tickInterval: -5 }]

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

  describe('executeAction', () => {
    const createMockService = () => ({
      setStrength: vi.fn(),
      increaseStrength: vi.fn(),
      decreaseStrength: vi.fn(),
      sendPulse: vi.fn(),
      clearChannel: vi.fn()
    })

    it('STRENGTH_SET 调用 setStrength', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.STRENGTH_SET,
          channel: 'A',
          value: 50
        }
      }

      executeAction(hook, service, 100)
      expect(service.setStrength).toHaveBeenCalledWith('A', 50, 100)
    })

    it('STRENGTH_INCREASE 调用 increaseStrength', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.STRENGTH_INCREASE,
          channel: 'B',
          value: 10
        }
      }

      executeAction(hook, service, 100)
      expect(service.increaseStrength).toHaveBeenCalledWith('B', 10, 100)
    })

    it('STRENGTH_DECREASE 调用 decreaseStrength', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.STRENGTH_DECREASE,
          channel: 'A',
          value: 5
        }
      }

      executeAction(hook, service, 100)
      expect(service.decreaseStrength).toHaveBeenCalledWith('A', 5, 100)
    })

    it('PULSE 调用 sendPulse', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.PULSE,
          channel: 'A',
          patterns: ['aabb', 'ccdd']
        }
      }

      executeAction(hook, service, 100)
      expect(service.sendPulse).toHaveBeenCalledWith('A', ['aabb', 'ccdd'])
    })

    it('PULSE 空 patterns 不调用 sendPulse', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.PULSE,
          channel: 'A',
          patterns: []
        }
      }

      executeAction(hook, service, 100)
      expect(service.sendPulse).not.toHaveBeenCalled()
    })

    it('CLEAR 调用 clearChannel', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.CLEAR,
          channel: 'B'
        }
      }

      executeAction(hook, service, 100)
      expect(service.clearChannel).toHaveBeenCalledWith('B')
    })

    it('clamp value 到 maxStrength', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.STRENGTH_SET,
          channel: 'A',
          value: 150
        }
      }

      executeAction(hook, service, 100)
      expect(service.setStrength).toHaveBeenCalledWith('A', 100, 100)
    })

    it('clamp 负值到 0', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.STRENGTH_SET,
          channel: 'A',
          value: -10
        }
      }

      executeAction(hook, service, 100)
      expect(service.setStrength).toHaveBeenCalledWith('A', 0, 100)
    })

    it('both 通道调用两个通道', () => {
      const service = createMockService()
      const hook = {
        action: {
          type: HookActionType.STRENGTH_SET,
          channel: 'both',
          value: 30
        }
      }

      executeAction(hook, service, 100)
      expect(service.setStrength).toHaveBeenCalledTimes(2)
      expect(service.setStrength).toHaveBeenCalledWith('A', 30, 100)
      expect(service.setStrength).toHaveBeenCalledWith('B', 30, 100)
    })

    it('没有 action 时静默返回', () => {
      const service = createMockService()
      executeAction({}, service, 100)
      expect(service.setStrength).not.toHaveBeenCalled()
    })
  })
})
