/**
 * @module tests/unit/shared/cbor/encoder.spec
 * @description CBOR 编码器测试
 */

import { describe, it, expect } from 'vitest'
import {
  compressData,
  compressFocusRecords,
  compressFocusSettings,
  compressPlaylists,
  compressUserSettings
} from '../../../../shared/cbor/encoder.js'
import { CBOR_DATA_TYPES, RAW_DATA_TYPES } from '../../../../shared/cbor/mappings.js'

describe('CBOR Encoder', () => {
  describe('compressFocusRecords', () => {
    it('应该压缩 focus records 数组', () => {
      const records = [
        {
          id: 'rec-1',
          mode: 'focus',
          startTime: 1700000000000,
          endTime: 1700001500000,
          duration: 1500,
          elapsed: 1500,
          completionType: 'completed'
        }
      ]

      const compressed = compressFocusRecords(records)

      expect(compressed).toHaveLength(1)
      expect(compressed[0][1]).toBe('rec-1') // id
      expect(compressed[0][2]).toBe(1) // mode: focus -> 1
      expect(compressed[0][7]).toBe(1) // completionType: completed -> 1
    })

    it('应该处理空数组', () => {
      expect(compressFocusRecords([])).toEqual([])
    })

    it('应该处理 null/undefined', () => {
      expect(compressFocusRecords(null)).toBeNull()
      expect(compressFocusRecords(undefined)).toBeUndefined()
    })
  })

  describe('compressFocusSettings', () => {
    it('应该压缩 focus settings', () => {
      const settings = {
        focusDuration: 1500,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: false,
        notificationEnabled: true,
        notificationSound: true
      }

      const compressed = compressFocusSettings(settings)

      expect(compressed[1]).toBe(1500) // focusDuration
      expect(compressed[2]).toBe(300) // shortBreakDuration
      expect(compressed[5]).toBe(false) // autoStartBreaks
    })
  })

  describe('compressPlaylists', () => {
    it('应该压缩 playlists 数据', () => {
      const data = {
        playlists: [
          {
            id: 'pl-1',
            name: 'Test Playlist',
            mode: 'playlist',
            source: 'netease',
            songs: [{ id: 's-1', name: 'Song 1', artist: 'Artist' }]
          }
        ],
        currentId: 'pl-1',
        defaultId: 'pl-1'
      }

      const compressed = compressPlaylists(data)

      expect(compressed[2]).toBe('pl-1') // currentId
      expect(compressed[1]).toHaveLength(1) // playlists
      expect(compressed[1][0][5]).toBe(1) // mode: playlist -> 1
      expect(compressed[1][0][6]).toBe(1) // source: netease -> 1
    })
  })

  describe('compressUserSettings', () => {
    it('应该压缩 user settings', () => {
      const settings = {
        video: { currentIndex: 0 },
        music: { currentIndex: 1, currentSongIndex: 5 }
      }

      const compressed = compressUserSettings(settings)

      expect(compressed[1][1]).toBe(0) // video.currentIndex
      expect(compressed[2][1]).toBe(1) // music.currentIndex
      expect(compressed[2][2]).toBe(5) // music.currentSongIndex
    })
  })

  describe('compressData', () => {
    it('应该根据数据类型压缩数据', () => {
      const records = [{ id: '1', mode: 'focus', completionType: 'completed' }]
      const compressed = compressData(CBOR_DATA_TYPES.FOCUS_RECORDS, records)

      expect(compressed[0][2]).toBe(1) // mode: focus -> 1
    })

    it('share_config 不应该被压缩', () => {
      const config = { theme: 'dark', showStats: true }
      const result = compressData(RAW_DATA_TYPES.SHARE_CONFIG, config)

      expect(result).toEqual(config)
    })
  })
})
