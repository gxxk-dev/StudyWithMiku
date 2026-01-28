/**
 * useSession 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  FocusState,
  FocusMode,
  CompletionType,
  DEFAULT_SETTINGS
} from '@/composables/focus/constants.js'

describe('useSession', () => {
  let useSession, _internal, useRecords, recordsInternal

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    localStorage.clear()

    // 先加载 useRecords 并重置
    const recordsModule = await import('@/composables/focus/useRecords.js')
    useRecords = recordsModule.useRecords
    recordsInternal = recordsModule._internal
    recordsInternal.resetForTesting()

    // 再加载 useSession
    const sessionModule = await import('@/composables/focus/useSession.js')
    useSession = sessionModule.useSession
    _internal = sessionModule._internal
    _internal.resetForTesting()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('初始状态', () => {
    it('应该有正确的初始值', () => {
      const session = useSession()

      expect(session.state.value).toBe(FocusState.IDLE)
      expect(session.mode.value).toBe(FocusMode.FOCUS)
      expect(session.isIdle.value).toBe(true)
      expect(session.isRunning.value).toBe(false)
      expect(session.isPaused.value).toBe(false)
    })

    it('应该有默认设置', () => {
      const session = useSession()

      expect(session.settings.value.focusDuration).toBe(DEFAULT_SETTINGS.focusDuration)
      expect(session.settings.value.shortBreakDuration).toBe(DEFAULT_SETTINGS.shortBreakDuration)
    })

    it('应该从 localStorage 恢复设置', async () => {
      const customSettings = { ...DEFAULT_SETTINGS, focusDuration: 30 * 60 }
      localStorage.setItem('swm_focus_settings', JSON.stringify(customSettings))

      vi.resetModules()
      recordsInternal.resetForTesting()

      const module = await import('@/composables/focus/useSession.js')
      module._internal.resetForTesting()

      const session = module.useSession()

      expect(session.settings.value.focusDuration).toBe(30 * 60)
    })
  })

  describe('start', () => {
    it('应该启动会话', () => {
      const session = useSession()

      const result = session.start()

      expect(result.success).toBe(true)
      expect(session.state.value).toBe(FocusState.RUNNING)
      expect(session.isRunning.value).toBe(true)
    })

    it('不应该在已运行时重复启动', () => {
      const session = useSession()

      session.start()
      const result = session.start()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session already in progress')
    })

    it('应该保存当前状态到 localStorage', () => {
      const session = useSession()

      session.start()

      const saved = JSON.parse(localStorage.getItem('swm_focus_current'))
      expect(saved).not.toBeNull()
      expect(saved.state).toBe(FocusState.RUNNING)
    })
  })

  describe('pause/resume', () => {
    it('应该暂停会话', () => {
      const session = useSession()

      session.start()
      const result = session.pause()

      expect(result.success).toBe(true)
      expect(session.state.value).toBe(FocusState.PAUSED)
      expect(session.isPaused.value).toBe(true)
    })

    it('不应该在未运行时暂停', () => {
      const session = useSession()

      const result = session.pause()

      expect(result.success).toBe(false)
    })

    it('应该恢复会话', () => {
      const session = useSession()

      session.start()
      session.pause()
      const result = session.resume()

      expect(result.success).toBe(true)
      expect(session.state.value).toBe(FocusState.RUNNING)
    })

    it('不应该在未暂停时恢复', () => {
      const session = useSession()

      session.start()
      const result = session.resume()

      expect(result.success).toBe(false)
    })
  })

  describe('cancel', () => {
    it('应该取消会话并记录', () => {
      const session = useSession()
      const { records } = useRecords()

      session.start()
      vi.advanceTimersByTime(5000)

      const result = session.cancel()

      expect(result.success).toBe(true)
      expect(session.state.value).toBe(FocusState.IDLE)
      expect(records.value).toHaveLength(1)
      expect(records.value[0].completionType).toBe(CompletionType.CANCELLED)
    })

    it('不应该在 IDLE 状态取消', () => {
      const session = useSession()

      const result = session.cancel()

      expect(result.success).toBe(false)
    })
  })

  describe('skip', () => {
    it('应该跳过当前阶段并记录', () => {
      const session = useSession()
      const { records } = useRecords()

      session.start()
      vi.advanceTimersByTime(5000)

      const result = session.skip()

      expect(result.success).toBe(true)
      expect(session.state.value).toBe(FocusState.IDLE)
      expect(records.value).toHaveLength(1)
      expect(records.value[0].completionType).toBe(CompletionType.SKIPPED)
    })

    it('跳过专注模式应该增加会话计数', () => {
      const session = useSession()

      session.start()
      session.skip()

      expect(session.sessionCount.value).toBe(1)
    })

    it('跳过后应该切换到下一个模式', () => {
      const session = useSession()

      session.start() // FOCUS
      session.skip()

      expect(session.mode.value).toBe(FocusMode.SHORT_BREAK)
    })
  })

  describe('setMode', () => {
    it('应该设置模式', () => {
      const session = useSession()

      const result = session.setMode(FocusMode.LONG_BREAK)

      expect(result.success).toBe(true)
      expect(session.mode.value).toBe(FocusMode.LONG_BREAK)
    })

    it('不应该在会话进行中设置模式', () => {
      const session = useSession()

      session.start()
      const result = session.setMode(FocusMode.SHORT_BREAK)

      expect(result.success).toBe(false)
    })

    it('无效模式应该返回错误', () => {
      const session = useSession()

      const result = session.setMode('invalid')

      expect(result.success).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('应该更新设置', () => {
      const session = useSession()

      const result = session.updateSettings({ focusDuration: 30 * 60 })

      expect(result.success).toBe(true)
      expect(session.settings.value.focusDuration).toBe(30 * 60)
    })

    it('应该持久化设置', () => {
      const session = useSession()

      session.updateSettings({ focusDuration: 30 * 60 })

      const saved = JSON.parse(localStorage.getItem('swm_focus_settings'))
      expect(saved.focusDuration).toBe(30 * 60)
    })
  })

  describe('完成流程', () => {
    it('完成专注后应该切换到短休息', () => {
      const session = useSession()
      const { records } = useRecords()

      session.start()

      // 推进完整的专注时间
      vi.advanceTimersByTime(25 * 60 * 1000 + 1000)

      expect(session.state.value).toBe(FocusState.IDLE)
      expect(session.mode.value).toBe(FocusMode.SHORT_BREAK)
      expect(session.sessionCount.value).toBe(1)
      expect(records.value).toHaveLength(1)
      expect(records.value[0].completionType).toBe(CompletionType.COMPLETED)
    })

    it('完成 4 个专注后应该切换到长休息', () => {
      const session = useSession()

      // 完成 4 个专注周期
      for (let i = 0; i < 4; i++) {
        session.start()
        vi.advanceTimersByTime(25 * 60 * 1000 + 1000)

        // 跳过休息
        if (i < 3) {
          session.start()
          vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
        }
      }

      expect(session.mode.value).toBe(FocusMode.LONG_BREAK)
    })
  })

  describe('中断恢复', () => {
    it('应该检测到中断的会话', async () => {
      const session = useSession()

      session.start()
      vi.advanceTimersByTime(5000)

      // 模拟页面刷新 - 保存状态
      const savedState = JSON.parse(localStorage.getItem('swm_focus_current'))

      vi.resetModules()
      recordsInternal.resetForTesting()

      // 重新加载模块但保留 localStorage
      const sessionModule2 = await import('@/composables/focus/useSession.js')
      sessionModule2._internal.resetForTesting()

      // 手动设置保存的状态
      localStorage.setItem('swm_focus_current', JSON.stringify(savedState))

      const session2 = sessionModule2.useSession()
      const result = session2.checkInterruptedSession()

      expect(result.hasInterrupted).toBe(true)
      expect(result.interruptedState).toBeDefined()
    })

    it('没有中断时应该返回 false', () => {
      const session = useSession()

      const result = session.checkInterruptedSession()

      expect(result.hasInterrupted).toBe(false)
    })

    it('放弃中断会话应该记录 interrupted', () => {
      const session = useSession()
      const { records } = useRecords()

      const interruptedState = {
        mode: FocusMode.FOCUS,
        state: FocusState.RUNNING,
        startTime: Date.now() - 600000,
        savedAt: Date.now() - 60000,
        duration: 25 * 60,
        elapsed: 10 * 60
      }

      session.discardInterruptedSession(interruptedState)

      expect(records.value).toHaveLength(1)
      expect(records.value[0].completionType).toBe(CompletionType.INTERRUPTED)
    })
  })

  describe('resetSessionCount', () => {
    it('应该重置会话计数', () => {
      const session = useSession()

      session.start()
      session.skip()
      expect(session.sessionCount.value).toBe(1)

      session.resetSessionCount()

      expect(session.sessionCount.value).toBe(0)
    })
  })
})
