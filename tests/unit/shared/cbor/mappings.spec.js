/**
 * @module tests/unit/shared/cbor/mappings.spec
 * @description CBOR 映射表测试
 */

import { describe, it, expect } from 'vitest'
import {
  CBOR_PROTOCOL_VERSION,
  CBOR_DATA_TYPES,
  RAW_DATA_TYPES,
  FOCUS_RECORD_KEYS,
  FOCUS_RECORD_KEYS_REV,
  FOCUS_MODE_MAP,
  FOCUS_MODE_MAP_REV,
  COMPLETION_TYPE_MAP,
  COMPLETION_TYPE_MAP_REV
} from '../../../../shared/cbor/mappings.js'

describe('CBOR Mappings', () => {
  describe('协议版本', () => {
    it('应该定义协议版本', () => {
      expect(CBOR_PROTOCOL_VERSION).toBe(1)
    })
  })

  describe('数据类型', () => {
    it('应该定义支持压缩的数据类型', () => {
      expect(CBOR_DATA_TYPES.FOCUS_RECORDS).toBe('focus_records')
      expect(CBOR_DATA_TYPES.FOCUS_SETTINGS).toBe('focus_settings')
      expect(CBOR_DATA_TYPES.PLAYLISTS).toBe('playlists')
      expect(CBOR_DATA_TYPES.USER_SETTINGS).toBe('user_settings')
    })

    it('应该定义不压缩的数据类型', () => {
      expect(RAW_DATA_TYPES.SHARE_CONFIG).toBe('share_config')
    })
  })

  describe('Focus Record 映射', () => {
    it('应该定义所有字段映射', () => {
      expect(FOCUS_RECORD_KEYS.id).toBe(1)
      expect(FOCUS_RECORD_KEYS.mode).toBe(2)
      expect(FOCUS_RECORD_KEYS.startTime).toBe(3)
      expect(FOCUS_RECORD_KEYS.endTime).toBe(4)
      expect(FOCUS_RECORD_KEYS.duration).toBe(5)
      expect(FOCUS_RECORD_KEYS.elapsed).toBe(6)
      expect(FOCUS_RECORD_KEYS.completionType).toBe(7)
    })

    it('反向映射应该正确', () => {
      expect(FOCUS_RECORD_KEYS_REV[1]).toBe('id')
      expect(FOCUS_RECORD_KEYS_REV[2]).toBe('mode')
      expect(FOCUS_RECORD_KEYS_REV[7]).toBe('completionType')
    })
  })

  describe('FocusMode 枚举映射', () => {
    it('应该定义所有枚举值', () => {
      expect(FOCUS_MODE_MAP.focus).toBe(1)
      expect(FOCUS_MODE_MAP.shortBreak).toBe(2)
      expect(FOCUS_MODE_MAP.longBreak).toBe(3)
    })

    it('反向映射应该正确', () => {
      expect(FOCUS_MODE_MAP_REV[1]).toBe('focus')
      expect(FOCUS_MODE_MAP_REV[2]).toBe('shortBreak')
      expect(FOCUS_MODE_MAP_REV[3]).toBe('longBreak')
    })
  })

  describe('CompletionType 枚举映射', () => {
    it('应该定义所有枚举值', () => {
      expect(COMPLETION_TYPE_MAP.completed).toBe(1)
      expect(COMPLETION_TYPE_MAP.cancelled).toBe(2)
      expect(COMPLETION_TYPE_MAP.skipped).toBe(3)
      expect(COMPLETION_TYPE_MAP.interrupted).toBe(4)
      expect(COMPLETION_TYPE_MAP.disabled).toBe(5)
    })

    it('反向映射应该正确', () => {
      expect(COMPLETION_TYPE_MAP_REV[1]).toBe('completed')
      expect(COMPLETION_TYPE_MAP_REV[5]).toBe('disabled')
    })
  })
})
