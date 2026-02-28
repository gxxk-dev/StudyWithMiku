/**
 * coyote/constants.js 单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  CoyoteConnectionState,
  CoyoteChannel,
  StrengthMode,
  COYOTE_DEFAULTS,
  COYOTE_STORAGE_KEYS,
  BIND_ERROR_MESSAGES
} from '@/composables/coyote/constants.js'

describe('coyote/constants', () => {
  describe('枚举值唯一性', () => {
    const checkUnique = (enumObj) => {
      const values = Object.values(enumObj)
      const unique = new Set(values)
      expect(unique.size).toBe(values.length)
    }

    it('CoyoteConnectionState 值不重复', () => {
      checkUnique(CoyoteConnectionState)
    })

    it('CoyoteChannel 值不重复', () => {
      checkUnique(CoyoteChannel)
    })

    it('StrengthMode 值不重复', () => {
      checkUnique(StrengthMode)
    })
  })

  describe('默认值', () => {
    it('COYOTE_DEFAULTS 应该有正确的默认值', () => {
      expect(COYOTE_DEFAULTS.enabled).toBe(false)
      expect(COYOTE_DEFAULTS.serverUrl).toBe('wss://ws.dungeon-lab.cn/')
      expect(COYOTE_DEFAULTS.maxStrength).toBe(100)
    })
  })

  describe('存储键', () => {
    it('COYOTE_STORAGE_KEYS 应该有所有必要的键', () => {
      expect(COYOTE_STORAGE_KEYS.SETTINGS).toBe('swm_coyote_settings')
      expect(COYOTE_STORAGE_KEYS.UNLOCKED).toBe('swm_coyote_unlocked')
      expect(COYOTE_STORAGE_KEYS.CONFIRMED).toBe('swm_coyote_confirmed')
    })
  })

  describe('绑定错误码', () => {
    it('BIND_ERROR_MESSAGES 应该包含所有已知错误码', () => {
      expect(BIND_ERROR_MESSAGES[209]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[210]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[211]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[400]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[401]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[402]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[403]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[404]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[405]).toBeDefined()
      expect(BIND_ERROR_MESSAGES[500]).toBeDefined()
    })

    it('BIND_ERROR_MESSAGES 所有值应该是字符串', () => {
      Object.values(BIND_ERROR_MESSAGES).forEach((msg) => {
        expect(typeof msg).toBe('string')
        expect(msg.length).toBeGreaterThan(0)
      })
    })
  })
})
