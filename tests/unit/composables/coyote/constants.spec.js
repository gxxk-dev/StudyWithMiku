/**
 * coyote/constants.js 单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  CoyoteConnectionState,
  CoyoteChannel,
  StrengthMode,
  HookTrigger,
  HookActionType,
  COYOTE_DEFAULTS,
  COYOTE_STORAGE_KEYS
} from '@/composables/coyote/constants.js'

describe('coyote/constants', () => {
  describe('枚举值唯一性', () => {
    const checkUnique = (enumObj, _name) => {
      const values = Object.values(enumObj)
      const unique = new Set(values)
      expect(unique.size).toBe(values.length)
    }

    it('CoyoteConnectionState 值不重复', () => {
      checkUnique(CoyoteConnectionState, 'CoyoteConnectionState')
    })

    it('CoyoteChannel 值不重复', () => {
      checkUnique(CoyoteChannel, 'CoyoteChannel')
    })

    it('StrengthMode 值不重复', () => {
      checkUnique(StrengthMode, 'StrengthMode')
    })

    it('HookTrigger 值不重复', () => {
      checkUnique(HookTrigger, 'HookTrigger')
    })

    it('HookActionType 值不重复', () => {
      checkUnique(HookActionType, 'HookActionType')
    })
  })

  describe('默认值', () => {
    it('COYOTE_DEFAULTS 应该有正确的默认值', () => {
      expect(COYOTE_DEFAULTS.enabled).toBe(false)
      expect(COYOTE_DEFAULTS.serverUrl).toBe('wss://ws.dungeon-lab.cn/')
      expect(COYOTE_DEFAULTS.maxStrength).toBe(100)
      expect(COYOTE_DEFAULTS.hooks).toEqual([])
    })
  })

  describe('存储键', () => {
    it('COYOTE_STORAGE_KEYS 应该有所有必要的键', () => {
      expect(COYOTE_STORAGE_KEYS.SETTINGS).toBe('swm_coyote_settings')
      expect(COYOTE_STORAGE_KEYS.HOOKS).toBe('swm_coyote_hooks')
      expect(COYOTE_STORAGE_KEYS.UNLOCKED).toBe('swm_coyote_unlocked')
      expect(COYOTE_STORAGE_KEYS.CONFIRMED).toBe('swm_coyote_confirmed')
    })
  })
})
