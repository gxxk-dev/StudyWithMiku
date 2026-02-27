/**
 * useCoyote.js 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCoyote, _internal } from '@/composables/useCoyote.js'
import { COYOTE_DEFAULTS, HookTrigger, HookActionType } from '@/composables/coyote/constants.js'
import { coyoteService } from '@/services/coyoteService.js'

// Mock coyoteService
vi.mock('@/services/coyoteService.js', async () => {
  const { ref, readonly } = await import('vue')
  const connectionState = ref('disconnected')
  const clientId = ref('')
  const targetId = ref('')
  const lastError = ref(null)
  const strengthA = ref(0)
  const strengthB = ref(0)
  const strengthLimitA = ref(200)
  const strengthLimitB = ref(200)

  return {
    coyoteService: {
      connectionState: readonly(connectionState),
      clientId: readonly(clientId),
      targetId: readonly(targetId),
      lastError: readonly(lastError),
      strengthA: readonly(strengthA),
      strengthB: readonly(strengthB),
      strengthLimitA: readonly(strengthLimitA),
      strengthLimitB: readonly(strengthLimitB),
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn(),
      setStrength: vi.fn(),
      increaseStrength: vi.fn(),
      decreaseStrength: vi.fn(),
      sendPulse: vi.fn(),
      clearChannel: vi.fn(),
      getBindQrData: vi.fn(),
      emergencyStop: vi.fn()
    }
  }
})

describe('useCoyote', () => {
  beforeEach(() => {
    _internal.resetForTesting()
    localStorage.clear()
  })

  describe('初始化', () => {
    it('初始设置应该使用默认值', () => {
      const { settings } = useCoyote()
      expect(settings.value.enabled).toBe(COYOTE_DEFAULTS.enabled)
      expect(settings.value.maxStrength).toBe(COYOTE_DEFAULTS.maxStrength)
      expect(settings.value.serverUrl).toBe(COYOTE_DEFAULTS.serverUrl)
    })

    it('应该从 localStorage 加载设置', () => {
      localStorage.setItem(
        'swm_coyote_settings',
        JSON.stringify({ enabled: true, maxStrength: 50, serverUrl: 'wss://test.com' })
      )

      _internal.resetForTesting()
      const { settings } = useCoyote()
      expect(settings.value.enabled).toBe(true)
      expect(settings.value.maxStrength).toBe(50)
    })
  })

  describe('settings 管理', () => {
    it('updateSettings 应该更新并持久化设置', () => {
      const { settings, updateSettings } = useCoyote()
      updateSettings({ enabled: true, maxStrength: 80 })

      expect(settings.value.enabled).toBe(true)
      expect(settings.value.maxStrength).toBe(80)

      const saved = JSON.parse(localStorage.getItem('swm_coyote_settings'))
      expect(saved.enabled).toBe(true)
      expect(saved.maxStrength).toBe(80)
    })
  })

  describe('hooks CRUD', () => {
    it('addHook 应该添加钩子', () => {
      const { hooks, addHook } = useCoyote()
      const id = addHook({
        name: '测试钩子',
        trigger: HookTrigger.FOCUS_PAUSE,
        action: { type: HookActionType.PULSE, channel: 'A', patterns: [] }
      })

      expect(hooks.value).toHaveLength(1)
      expect(hooks.value[0].id).toBe(id)
      expect(hooks.value[0].name).toBe('测试钩子')
      expect(hooks.value[0].enabled).toBe(true)
    })

    it('updateHook 应该更新钩子', () => {
      const { hooks, addHook, updateHook } = useCoyote()
      const id = addHook({ name: '原始', trigger: HookTrigger.FOCUS_PAUSE })
      updateHook(id, { name: '已更新' })

      expect(hooks.value[0].name).toBe('已更新')
    })

    it('removeHook 应该删除钩子', () => {
      const { hooks, addHook, removeHook } = useCoyote()
      const id = addHook({ name: '要删除的', trigger: HookTrigger.FOCUS_PAUSE })
      expect(hooks.value).toHaveLength(1)

      removeHook(id)
      expect(hooks.value).toHaveLength(0)
    })

    it('clearAllHooks 应该清空所有钩子', () => {
      const { hooks, addHook, clearAllHooks } = useCoyote()
      addHook({ name: '1', trigger: HookTrigger.FOCUS_PAUSE })
      addHook({ name: '2', trigger: HookTrigger.FOCUS_START })
      expect(hooks.value).toHaveLength(2)

      clearAllHooks()
      expect(hooks.value).toHaveLength(0)
    })

    it('hooks 应该持久化到 localStorage', () => {
      const { addHook } = useCoyote()
      addHook({ name: '持久化测试', trigger: HookTrigger.FOCUS_PAUSE })

      const saved = JSON.parse(localStorage.getItem('swm_coyote_hooks'))
      expect(saved).toHaveLength(1)
      expect(saved[0].name).toBe('持久化测试')
    })
  })

  describe('applyPreset', () => {
    it('应该添加预设钩子到列表', () => {
      const { hooks, applyPreset, presets } = useCoyote()
      applyPreset(presets[0])

      expect(hooks.value).toHaveLength(1)
      expect(hooks.value[0].name).toBe(presets[0].hook.name)
      expect(hooks.value[0].id).toBeDefined()
    })
  })

  describe('dispatchFocusEvent', () => {
    it('disabled 时不触发', () => {
      const { dispatchFocusEvent, updateSettings, addHook } = useCoyote()
      updateSettings({ enabled: false })
      addHook({
        name: 'test',
        enabled: true,
        trigger: HookTrigger.FOCUS_PAUSE,
        action: { type: HookActionType.CLEAR, channel: 'A' }
      })

      dispatchFocusEvent('pause', { mode: 'focus' })
      expect(coyoteService.clearChannel).not.toHaveBeenCalled()
    })
  })
})
