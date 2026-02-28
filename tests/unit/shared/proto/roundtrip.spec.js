import { describe, it, expect } from 'vitest'
import {
  encodeData,
  decodeData,
  encodeSyncRequest,
  decodeSyncRequest,
  encodeSyncResponse,
  decodeSyncResponse,
  DATA_TYPES,
  PROTOBUF_PROTOCOL_VERSION
} from '../../../../shared/proto/index.js'

describe('Protobuf Roundtrip', () => {
  describe('协议版本', () => {
    it('应该定义协议版本', () => {
      expect(PROTOBUF_PROTOCOL_VERSION).toBe(1)
    })
  })

  describe('focus_records', () => {
    it('完整记录往返保持一致', () => {
      const records = [
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

      const binary = encodeData(DATA_TYPES.FOCUS_RECORDS, records)
      expect(binary).toBeInstanceOf(Uint8Array)
      const decoded = decodeData(DATA_TYPES.FOCUS_RECORDS, binary)

      expect(decoded).toEqual(records)
    })

    it('包含 updatedAt 的记录往返保持一致', () => {
      const records = [
        {
          id: 'rec-3',
          mode: 'longBreak',
          startTime: 1700000000000,
          endTime: 1700000900000,
          duration: 900,
          elapsed: 900,
          completionType: 'interrupted',
          updatedAt: 1700001000000
        }
      ]

      const binary = encodeData(DATA_TYPES.FOCUS_RECORDS, records)
      const decoded = decodeData(DATA_TYPES.FOCUS_RECORDS, binary)

      expect(decoded).toEqual(records)
    })

    it('空数组往返保持一致', () => {
      const records = []

      const binary = encodeData(DATA_TYPES.FOCUS_RECORDS, records)
      const decoded = decodeData(DATA_TYPES.FOCUS_RECORDS, binary)

      expect(decoded).toEqual(records)
    })

    it('枚举零值 UNSPECIFIED 解码为 null', () => {
      const records = [
        {
          id: 'rec-x',
          mode: null,
          startTime: 1700000000000,
          endTime: 1700001000000,
          duration: 1000,
          elapsed: 1000,
          completionType: null
        }
      ]

      const binary = encodeData(DATA_TYPES.FOCUS_RECORDS, records)
      const decoded = decodeData(DATA_TYPES.FOCUS_RECORDS, binary)

      expect(decoded[0].mode).toBeNull()
      expect(decoded[0].completionType).toBeNull()
    })

    it('时间戳毫秒精度往返保持一致', () => {
      const records = [
        {
          id: 'ts-test',
          mode: 'focus',
          startTime: 1700000000123,
          endTime: 1700001500456,
          duration: 1500,
          elapsed: 1500,
          completionType: 'completed'
        }
      ]

      const binary = encodeData(DATA_TYPES.FOCUS_RECORDS, records)
      const decoded = decodeData(DATA_TYPES.FOCUS_RECORDS, binary)

      expect(decoded[0].startTime).toBe(1700000000123)
      expect(decoded[0].endTime).toBe(1700001500456)
    })

    it('optional updatedAt 缺失时不输出该字段', () => {
      const records = [
        {
          id: 'no-updated',
          mode: 'focus',
          startTime: 1700000000000,
          endTime: 1700001000000,
          duration: 1000,
          elapsed: 1000,
          completionType: 'completed'
        }
      ]

      const binary = encodeData(DATA_TYPES.FOCUS_RECORDS, records)
      const decoded = decodeData(DATA_TYPES.FOCUS_RECORDS, binary)

      expect(decoded[0]).not.toHaveProperty('updatedAt')
    })
  })

  describe('focus_settings', () => {
    it('完整设置往返保持一致', () => {
      const settings = {
        focusDuration: 1500,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: true
      }

      const binary = encodeData(DATA_TYPES.FOCUS_SETTINGS, settings)
      const decoded = decodeData(DATA_TYPES.FOCUS_SETTINGS, binary)

      expect(decoded).toEqual(settings)
    })

    it('布尔值 false 正确保留', () => {
      const settings = {
        focusDuration: 0,
        shortBreakDuration: 0,
        longBreakDuration: 0,
        longBreakInterval: 0,
        autoStartBreaks: false,
        autoStartFocus: false
      }

      const binary = encodeData(DATA_TYPES.FOCUS_SETTINGS, settings)
      const decoded = decodeData(DATA_TYPES.FOCUS_SETTINGS, binary)

      expect(decoded).toEqual(settings)
    })
  })

  describe('playlists', () => {
    it('完整歌单数据往返保持一致', () => {
      const data = {
        playlists: [
          {
            id: 'pl-1',
            name: 'Test Playlist',
            cover: 'https://example.com/cover.jpg',
            order: 0,
            mode: 'playlist',
            source: 'netease',
            sourceId: '123456',
            songs: [
              {
                id: 's-1',
                name: 'Song 1',
                artist: 'Artist 1',
                url: 'https://example.com/song.mp3',
                cover: 'https://example.com/song-cover.jpg',
                lrc: '[00:00.00]Test'
              }
            ]
          }
        ],
        currentId: 'pl-1',
        defaultId: 'pl-1'
      }

      const binary = encodeData(DATA_TYPES.PLAYLISTS, data)
      const decoded = decodeData(DATA_TYPES.PLAYLISTS, binary)

      expect(decoded).toEqual(data)
    })

    it('空歌单列表往返保持一致', () => {
      const data = {
        playlists: []
      }

      const binary = encodeData(DATA_TYPES.PLAYLISTS, data)
      const decoded = decodeData(DATA_TYPES.PLAYLISTS, binary)

      expect(decoded).toEqual(data)
    })

    it('optional 字段缺失时不输出', () => {
      const data = {
        playlists: [
          {
            id: 'pl-2',
            name: 'Minimal',
            order: 0,
            mode: 'collection',
            songs: []
          }
        ]
      }

      const binary = encodeData(DATA_TYPES.PLAYLISTS, data)
      const decoded = decodeData(DATA_TYPES.PLAYLISTS, binary)

      expect(decoded.playlists[0]).not.toHaveProperty('cover')
      expect(decoded.playlists[0]).not.toHaveProperty('sourceId')
      expect(decoded).not.toHaveProperty('currentId')
      expect(decoded).not.toHaveProperty('defaultId')
    })
  })

  describe('user_settings', () => {
    it('完整设置往返保持一致', () => {
      const settings = {
        video: { currentIndex: 0 },
        music: { currentIndex: 1, currentSongIndex: 5 }
      }

      const binary = encodeData(DATA_TYPES.USER_SETTINGS, settings)
      const decoded = decodeData(DATA_TYPES.USER_SETTINGS, binary)

      expect(decoded).toEqual(settings)
    })

    it('仅有一个子对象时往返保持一致', () => {
      const settings = {
        video: { currentIndex: 3 }
      }

      const binary = encodeData(DATA_TYPES.USER_SETTINGS, settings)
      const decoded = decodeData(DATA_TYPES.USER_SETTINGS, binary)

      expect(decoded).toEqual(settings)
    })

    it('空对象往返保持一致', () => {
      const settings = {}

      const binary = encodeData(DATA_TYPES.USER_SETTINGS, settings)
      const decoded = decodeData(DATA_TYPES.USER_SETTINGS, binary)

      expect(decoded).toEqual(settings)
    })
  })

  describe('share_config', () => {
    it('完整配置往返保持一致', () => {
      const config = {
        modules: {
          basicStats: true,
          miniHeatmap: false,
          trendChart: true
        },
        showHitokoto: true,
        hitokotoCategories: ['a', 'b', 'c']
      }

      const binary = encodeData(DATA_TYPES.SHARE_CONFIG, config)
      const decoded = decodeData(DATA_TYPES.SHARE_CONFIG, binary)

      expect(decoded).toEqual(config)
    })

    it('空分类数组往返保持一致', () => {
      const config = {
        modules: {
          basicStats: false,
          miniHeatmap: false,
          trendChart: false
        },
        showHitokoto: false,
        hitokotoCategories: []
      }

      const binary = encodeData(DATA_TYPES.SHARE_CONFIG, config)
      const decoded = decodeData(DATA_TYPES.SHARE_CONFIG, binary)

      expect(decoded).toEqual(config)
    })
  })

  describe('SyncRequest envelope', () => {
    it('focus_records SyncRequest 编解码往返', () => {
      const records = [
        {
          id: 'r1',
          mode: 'focus',
          startTime: 1700000000000,
          endTime: 1700001500000,
          duration: 1500,
          elapsed: 1500,
          completionType: 'completed'
        }
      ]

      const binary = encodeSyncRequest(DATA_TYPES.FOCUS_RECORDS, records, 5)
      const decoded = decodeSyncRequest(binary, DATA_TYPES.FOCUS_RECORDS)

      expect(decoded.version).toBe(5)
      expect(decoded.data).toEqual(records)
    })

    it('version 为 null 时解码为默认值', () => {
      const settings = {
        focusDuration: 1500,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: false
      }

      const binary = encodeSyncRequest(DATA_TYPES.FOCUS_SETTINGS, settings, null)
      const decoded = decodeSyncRequest(binary, DATA_TYPES.FOCUS_SETTINGS)

      expect(decoded.data).toEqual(settings)
    })
  })

  describe('SyncResponse envelope', () => {
    it('成功响应编解码往返', () => {
      const settings = {
        focusDuration: 1500,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: false
      }

      const responseObj = {
        type: 'focus_settings',
        version: 1,
        success: true,
        data: settings
      }

      const binary = encodeSyncResponse(responseObj, DATA_TYPES.FOCUS_SETTINGS)
      const decoded = decodeSyncResponse(binary, DATA_TYPES.FOCUS_SETTINGS)

      expect(decoded.type).toBe('focus_settings')
      expect(decoded.version).toBe(1)
      expect(decoded.success).toBe(true)
      expect(decoded.data).toEqual(settings)
    })

    it('冲突响应编解码往返', () => {
      const serverSettings = {
        focusDuration: 1800,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: false
      }

      const responseObj = {
        error: 'Version conflict',
        code: 'VERSION_CONFLICT',
        conflict: true,
        serverData: serverSettings,
        serverVersion: 3
      }

      const binary = encodeSyncResponse(responseObj, DATA_TYPES.FOCUS_SETTINGS)
      const decoded = decodeSyncResponse(binary, DATA_TYPES.FOCUS_SETTINGS)

      expect(decoded.conflict).toBe(true)
      expect(decoded.serverVersion).toBe(3)
      expect(decoded.serverData).toEqual(serverSettings)
    })

    it('无 data 字段的响应编解码', () => {
      const responseObj = {
        success: true,
        version: 2,
        merged: false
      }

      const binary = encodeSyncResponse(responseObj, DATA_TYPES.FOCUS_RECORDS)
      const decoded = decodeSyncResponse(binary, DATA_TYPES.FOCUS_RECORDS)

      expect(decoded.success).toBe(true)
      expect(decoded.version).toBe(2)
      expect(decoded.data).toBeNull()
    })
  })

  describe('hook_settings', () => {
    it('通知 hook 往返保持一致', () => {
      const data = {
        hooks: [
          {
            id: 'hook-1',
            enabled: true,
            name: '专注完成通知',
            provider: 'notification',
            trigger: 'focus_completed',
            tickInterval: 0,
            builtIn: true,
            action: {
              title: '专注完成！',
              body: '休息一下吧'
            }
          }
        ]
      }

      const binary = encodeData(DATA_TYPES.HOOK_SETTINGS, data)
      expect(binary).toBeInstanceOf(Uint8Array)
      const decoded = decodeData(DATA_TYPES.HOOK_SETTINGS, binary)

      expect(decoded).toEqual(data)
    })

    it('音效 hook 往返保持一致', () => {
      const data = {
        hooks: [
          {
            id: 'hook-2',
            enabled: true,
            name: '专注完成提示音',
            provider: 'sound',
            trigger: 'focus_completed',
            tickInterval: 0,
            builtIn: true,
            action: {
              soundId: 'chime',
              volume: 1.0
            }
          }
        ]
      }

      const binary = encodeData(DATA_TYPES.HOOK_SETTINGS, data)
      const decoded = decodeData(DATA_TYPES.HOOK_SETTINGS, binary)

      expect(decoded.hooks).toHaveLength(1)
      expect(decoded.hooks[0].action.soundId).toBe('chime')
      // float32 精度：使用 toBeCloseTo
      expect(decoded.hooks[0].action.volume).toBeCloseTo(1.0, 5)
    })

    it('推送 hook 往返保持一致', () => {
      const data = {
        hooks: [
          {
            id: 'hook-3',
            enabled: false,
            name: '专注完成推送',
            provider: 'push',
            trigger: 'focus_completed',
            tickInterval: 0,
            builtIn: false,
            action: {
              title: '专注完成',
              body: '做得好！'
            }
          }
        ]
      }

      const binary = encodeData(DATA_TYPES.HOOK_SETTINGS, data)
      const decoded = decodeData(DATA_TYPES.HOOK_SETTINGS, binary)

      expect(decoded).toEqual(data)
    })

    it('电刺激 hook 往返保持一致', () => {
      const data = {
        hooks: [
          {
            id: 'hook-4',
            enabled: true,
            name: '暂停惩罚',
            provider: 'estim',
            trigger: 'focus_pause',
            tickInterval: 0,
            builtIn: false,
            action: {
              type: 'strength_increase',
              channel: 'A',
              value: 10,
              patterns: [],
              durationMs: 0
            }
          }
        ]
      }

      const binary = encodeData(DATA_TYPES.HOOK_SETTINGS, data)
      const decoded = decodeData(DATA_TYPES.HOOK_SETTINGS, binary)

      expect(decoded).toEqual(data)
    })

    it('多个 hook 混合往返保持一致', () => {
      const data = {
        hooks: [
          {
            id: 'h1',
            enabled: true,
            name: '通知',
            provider: 'notification',
            trigger: 'focus_completed',
            tickInterval: 0,
            builtIn: true,
            action: { title: '', body: '' }
          },
          {
            id: 'h2',
            enabled: true,
            name: '提示音',
            provider: 'sound',
            trigger: 'break_completed',
            tickInterval: 0,
            builtIn: true,
            action: { soundId: 'ding', volume: 1.0 }
          },
          {
            id: 'h3',
            enabled: false,
            name: '电刺激',
            provider: 'estim',
            trigger: 'focus_tick',
            tickInterval: 300,
            builtIn: false,
            action: {
              type: 'pulse',
              channel: 'both',
              value: 0,
              patterns: ['aabb', 'ccdd'],
              durationMs: 5000
            }
          }
        ]
      }

      const binary = encodeData(DATA_TYPES.HOOK_SETTINGS, data)
      const decoded = decodeData(DATA_TYPES.HOOK_SETTINGS, binary)

      expect(decoded).toEqual(data)
    })

    it('空 hooks 列表往返保持一致', () => {
      const data = { hooks: [] }

      const binary = encodeData(DATA_TYPES.HOOK_SETTINGS, data)
      const decoded = decodeData(DATA_TYPES.HOOK_SETTINGS, binary)

      expect(decoded).toEqual(data)
    })

    it('hook_settings SyncRequest 编解码往返', () => {
      const data = {
        hooks: [
          {
            id: 'sync-test',
            enabled: true,
            name: 'Test Hook',
            provider: 'notification',
            trigger: 'focus_start',
            tickInterval: 0,
            builtIn: false,
            action: { title: 'Start!', body: '' }
          }
        ]
      }

      const binary = encodeSyncRequest(DATA_TYPES.HOOK_SETTINGS, data, 3)
      const decoded = decodeSyncRequest(binary, DATA_TYPES.HOOK_SETTINGS)

      expect(decoded.version).toBe(3)
      expect(decoded.data).toEqual(data)
    })
  })
})
