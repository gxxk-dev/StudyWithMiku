/**
 * useCoyote.js 单元测试
 * 精简版 — 仅测试连接管理和设置
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCoyote, _internal } from '@/composables/useCoyote.js'
import { COYOTE_DEFAULTS } from '@/composables/coyote/constants.js'

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
})
