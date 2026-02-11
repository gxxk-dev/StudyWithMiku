/**
 * 用户数据服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateUserData,
  getUserData,
  getAllUserData,
  updateUserData,
  checkUserQuota
} from '../../../../workers/services/userData.js'
import { DATA_CONFIG, ERROR_CODES } from '../../../../workers/constants.js'
import { createMockD1 } from '../../../setup/fixtures/workerMocks.js'
import {
  sampleUserData,
  createFocusRecordData,
  createFocusSettingsData,
  createPlaylistsData,
  createUserSettingsData
} from '../../../setup/fixtures/authData.js'

describe('userData.js', () => {
  let mockDB

  beforeEach(() => {
    mockDB = createMockD1()
    mockDB.__setTable('user_data', JSON.parse(JSON.stringify(sampleUserData)))
  })

  describe('validateUserData', () => {
    describe('focus_records', () => {
      it('有效的 focus_records 应该通过验证', () => {
        const records = [createFocusRecordData()]
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_RECORDS, records)

        expect(result.valid).toBe(true)
        expect(result.data).toBeDefined()
      })

      it('无效的 mode 应该验证失败', () => {
        const records = [createFocusRecordData({ mode: 'invalid_mode' })]
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_RECORDS, records)

        expect(result.valid).toBe(false)
        expect(result.code).toBe(ERROR_CODES.VALIDATION_FAILED)
      })

      it('endTime < startTime 应该验证失败', () => {
        const records = [
          createFocusRecordData({
            startTime: Date.now(),
            endTime: Date.now() - 1000
          })
        ]
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_RECORDS, records)

        expect(result.valid).toBe(false)
      })

      it('elapsed > duration 应该验证失败', () => {
        const records = [
          createFocusRecordData({
            duration: 1000,
            elapsed: 2000
          })
        ]
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_RECORDS, records)

        expect(result.valid).toBe(false)
      })

      it('超过最大条数应该验证失败', () => {
        const records = Array(DATA_CONFIG.MAX_FOCUS_RECORDS + 1)
          .fill(null)
          .map(() => createFocusRecordData())
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_RECORDS, records)

        expect(result.valid).toBe(false)
      })
    })

    describe('focus_settings', () => {
      it('有效的 focus_settings 应该通过验证', () => {
        const settings = createFocusSettingsData()
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_SETTINGS, settings)

        expect(result.valid).toBe(true)
      })

      it('focusDuration 超出范围应该验证失败', () => {
        const settings = createFocusSettingsData({ focusDuration: 10 }) // 小于 60
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_SETTINGS, settings)

        expect(result.valid).toBe(false)
      })

      it('缺少必需字段应该验证失败', () => {
        const settings = { focusDuration: 1500 } // 缺少其他字段
        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_SETTINGS, settings)

        expect(result.valid).toBe(false)
      })
    })

    describe('playlists', () => {
      it('有效的 playlists 应该通过验证', () => {
        const playlists = createPlaylistsData()
        const result = validateUserData(DATA_CONFIG.TYPES.PLAYLISTS, playlists)

        expect(result.valid).toBe(true)
      })

      it('超过最大歌单数应该验证失败', () => {
        const playlists = createPlaylistsData({
          playlists: Array(DATA_CONFIG.MAX_PLAYLISTS + 1).fill({
            id: 'p',
            name: 'Playlist',
            order: 0,
            mode: 'playlist'
          })
        })
        const result = validateUserData(DATA_CONFIG.TYPES.PLAYLISTS, playlists)

        expect(result.valid).toBe(false)
      })
    })

    describe('user_settings', () => {
      it('有效的 user_settings 应该通过验证', () => {
        const settings = createUserSettingsData()
        const result = validateUserData(DATA_CONFIG.TYPES.USER_SETTINGS, settings)

        expect(result.valid).toBe(true)
      })
    })

    describe('未知类型', () => {
      it('未知的数据类型应该返回 INVALID_TYPE', () => {
        const result = validateUserData('unknown_type', {})

        expect(result.valid).toBe(false)
        expect(result.code).toBe(ERROR_CODES.INVALID_TYPE)
      })
    })

    describe('大小限制', () => {
      it('超过大小限制应该返回 DATA_TOO_LARGE', () => {
        // 创建超大数据
        const hugeSettings = createFocusSettingsData()
        // 模拟超大数据
        const originalStringify = JSON.stringify
        vi.spyOn(JSON, 'stringify').mockReturnValueOnce(
          'x'.repeat(DATA_CONFIG.MAX_SIZE.focus_settings + 1)
        )

        const result = validateUserData(DATA_CONFIG.TYPES.FOCUS_SETTINGS, hugeSettings)

        expect(result.valid).toBe(false)
        expect(result.code).toBe(ERROR_CODES.DATA_TOO_LARGE)

        JSON.stringify = originalStringify
      })
    })
  })

  describe('getUserData', () => {
    it('应该返回存在的用户数据', async () => {
      const result = await getUserData(mockDB, 'user-001', DATA_CONFIG.TYPES.FOCUS_RECORDS)

      expect(result.data).toBeDefined()
      expect(result.version).toBe(1)
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('不存在的数据应该返回 null 和 version 0', async () => {
      const result = await getUserData(mockDB, 'user-001', DATA_CONFIG.TYPES.SHARE_CONFIG)

      expect(result.data).toBeNull()
      expect(result.version).toBe(0)
    })
  })

  describe('getAllUserData', () => {
    it('应该返回用户的所有数据', async () => {
      const result = await getAllUserData(mockDB, 'user-001')

      expect(result[DATA_CONFIG.TYPES.FOCUS_RECORDS]).toBeDefined()
      expect(result[DATA_CONFIG.TYPES.FOCUS_SETTINGS]).toBeDefined()
    })

    it('没有数据的用户应该返回空对象', async () => {
      const result = await getAllUserData(mockDB, 'user-without-data')
      expect(result).toEqual({})
    })
  })

  describe('updateUserData', () => {
    it('首次写入应该成功并返回 version 1', async () => {
      const data = createFocusSettingsData()
      const result = await updateUserData(
        mockDB,
        'user-new',
        DATA_CONFIG.TYPES.FOCUS_SETTINGS,
        data,
        0
      )

      expect(result.success).toBe(true)
      expect(result.version).toBe(1)
    })

    it('版本匹配时应该更新成功', async () => {
      const newSettings = createFocusSettingsData({ focusDuration: 1800 })
      const result = await updateUserData(
        mockDB,
        'user-001',
        DATA_CONFIG.TYPES.FOCUS_SETTINGS,
        newSettings,
        2 // 当前版本是 2
      )

      expect(result.success).toBe(true)
      expect(result.version).toBe(3)
    })

    it('版本不匹配时应该返回冲突', async () => {
      // 使用独立用户避免测试间干扰
      await mockDB
        .prepare(
          'INSERT INTO user_data (user_id, data_type, data, data_format, version) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          'user-conflict-test',
          DATA_CONFIG.TYPES.FOCUS_SETTINGS,
          JSON.stringify(createFocusSettingsData()),
          'json',
          5
        )
        .run()

      const newSettings = createFocusSettingsData({ focusDuration: 1800 })
      const result = await updateUserData(
        mockDB,
        'user-conflict-test',
        DATA_CONFIG.TYPES.FOCUS_SETTINGS,
        newSettings,
        3 // 过期版本，服务端是 5
      )

      expect(result.success).toBe(false)
      expect(result.conflict).toBe(true)
      expect(result.serverVersion).toBe(5)
      expect(result.serverData).toBeDefined()
    })

    it('focus_records 冲突时应该返回冲突（客户端负责合并）', async () => {
      // 模拟服务端有一条记录
      const existingRecords = [createFocusRecordData({ id: 'server-record' })]
      await mockDB
        .prepare(
          'INSERT INTO user_data (user_id, data_type, data, data_format, version) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          'user-merge-test',
          DATA_CONFIG.TYPES.FOCUS_RECORDS,
          JSON.stringify(existingRecords),
          'json',
          1
        )
        .run()

      // 客户端有另一条记录
      const clientRecords = [createFocusRecordData({ id: 'client-record' })]
      const result = await updateUserData(
        mockDB,
        'user-merge-test',
        DATA_CONFIG.TYPES.FOCUS_RECORDS,
        clientRecords,
        0 // 版本不匹配
      )

      // 现在应该返回冲突，让客户端处理
      expect(result.success).toBe(false)
      expect(result.conflict).toBe(true)
      expect(result.serverVersion).toBe(1)
    })

    it('验证失败时应该返回错误', async () => {
      const invalidData = { invalid: 'data' }
      const result = await updateUserData(
        mockDB,
        'user-001',
        DATA_CONFIG.TYPES.FOCUS_SETTINGS,
        invalidData,
        2
      )

      expect(result.success).toBe(false)
      expect(result.code).toBe(ERROR_CODES.VALIDATION_FAILED)
    })
  })

  describe('checkUserQuota', () => {
    it('未超配额时应该返回 withinQuota: true', async () => {
      const result = await checkUserQuota(mockDB, 'user-001')

      expect(result.withinQuota).toBe(true)
      expect(result.used).toBeGreaterThanOrEqual(0)
      expect(result.limit).toBe(DATA_CONFIG.USER_QUOTA)
    })

    it('没有数据的用户应该返回 used: 0', async () => {
      const result = await checkUserQuota(mockDB, 'user-no-data')

      expect(result.withinQuota).toBe(true)
      expect(result.used).toBe(0)
    })
  })
})
