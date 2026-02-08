/**
 * @module tests/unit/shared/cbor/decoder.spec
 * @description CBOR 解码器测试
 */

import { describe, it, expect } from 'vitest'
import {
  decompressData,
  decompressFocusRecords,
  decompressFocusSettings
} from '../../../../shared/cbor/decoder.js'
import { compressData } from '../../../../shared/cbor/encoder.js'
import { CBOR_DATA_TYPES, RAW_DATA_TYPES } from '../../../../shared/cbor/mappings.js'

describe('CBOR Decoder', () => {
  describe('decompressFocusRecords', () => {
    it('应该解压 focus records 数组', () => {
      // 压缩后的格式: { 1: id, 2: mode(数字), 7: completionType(数字) }
      const compressed = [{ 1: 'rec-1', 2: 1, 3: 1700000000000, 7: 1 }]

      const decompressed = decompressFocusRecords(compressed)

      expect(decompressed[0].id).toBe('rec-1')
      expect(decompressed[0].mode).toBe('focus')
      expect(decompressed[0].completionType).toBe('completed')
    })

    it('应该处理空数组', () => {
      expect(decompressFocusRecords([])).toEqual([])
    })
  })

  describe('decompressFocusSettings', () => {
    it('应该解压 focus settings', () => {
      const compressed = { 1: 1500, 2: 300, 5: false, 7: true }

      const decompressed = decompressFocusSettings(compressed)

      expect(decompressed.focusDuration).toBe(1500)
      expect(decompressed.shortBreakDuration).toBe(300)
      expect(decompressed.autoStartBreaks).toBe(false)
      expect(decompressed.notificationEnabled).toBe(true)
    })
  })

  describe('往返测试 (roundtrip)', () => {
    it('focus_records 压缩后解压应该还原', () => {
      const original = [
        {
          id: 'rec-1',
          mode: 'focus',
          startTime: 1700000000000,
          endTime: 1700001500000,
          duration: 1500,
          elapsed: 1500,
          completionType: 'completed'
        },
        {
          id: 'rec-2',
          mode: 'shortBreak',
          startTime: 1700002000000,
          endTime: 1700002300000,
          duration: 300,
          elapsed: 300,
          completionType: 'skipped'
        }
      ]

      const compressed = compressData(CBOR_DATA_TYPES.FOCUS_RECORDS, original)
      const decompressed = decompressData(CBOR_DATA_TYPES.FOCUS_RECORDS, compressed)

      expect(decompressed).toEqual(original)
    })

    it('focus_settings 压缩后解压应该还原', () => {
      const original = {
        focusDuration: 1500,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: true,
        notificationEnabled: true,
        notificationSound: false
      }

      const compressed = compressData(CBOR_DATA_TYPES.FOCUS_SETTINGS, original)
      const decompressed = decompressData(CBOR_DATA_TYPES.FOCUS_SETTINGS, compressed)

      expect(decompressed).toEqual(original)
    })

    it('share_config 不压缩应该保持原样', () => {
      const original = { theme: 'dark', showStats: true, customField: 123 }

      const compressed = compressData(RAW_DATA_TYPES.SHARE_CONFIG, original)
      const decompressed = decompressData(RAW_DATA_TYPES.SHARE_CONFIG, compressed)

      expect(decompressed).toEqual(original)
    })
  })
})
