/**
 * @module tests/integration/api/dataSync.spec
 * @description 数据同步 API 集成测试
 *
 * 直接调用 src/services/dataSync.js 的导出函数，
 * 通过 unstable_dev 启动的真实 Worker 验证端到端数据流。
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  startWorker,
  stopWorker,
  initDatabase,
  seedTestUser,
  resetDatabase,
  generateAccessToken
} from './setup.js'

import { getData, updateData, deleteData, hasData } from '../../../src/services/dataSync.js'
import { AUTH_CONFIG } from '../../../src/config/constants.js'

const DATA_TYPES = AUTH_CONFIG.DATA_TYPES

/** 构造符合 Zod schema 的 focus_settings 测试数据 */
const makeSettings = (overrides = {}) => ({
  focusDuration: 1500,
  shortBreakDuration: 300,
  longBreakDuration: 900,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  notificationEnabled: true,
  notificationSound: true,
  ...overrides
})

describe('数据同步 API 集成测试', () => {
  let accessToken

  beforeAll(async () => {
    await startWorker()
    await initDatabase()
  })

  afterAll(async () => {
    await stopWorker()
  })

  beforeEach(async () => {
    await resetDatabase()
    await seedTestUser()
    accessToken = await generateAccessToken()
  })

  describe('上传数据', () => {
    it('上传 focus_records 返回 version 1', async () => {
      const now = Date.now()
      const records = [
        {
          id: 'r1',
          mode: 'focus',
          duration: 1500,
          elapsed: 1500,
          startTime: now - 1500000,
          endTime: now,
          completionType: 'completed'
        }
      ]
      const result = await updateData(accessToken, DATA_TYPES.FOCUS_RECORDS, records)
      expect(result.success).toBe(true)
      expect(result.version).toBe(1)
    })

    it('上传 focus_settings 返回 version 1', async () => {
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
      const result = await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, settings)
      expect(result.success).toBe(true)
      expect(result.version).toBe(1)
    })

    it('上传 playlists 返回 version 1', async () => {
      const playlists = {
        playlists: [{ id: 'p1', name: 'Test', order: 0, mode: 'playlist', songs: [] }],
        currentId: 'p1',
        defaultId: 'p1'
      }
      const result = await updateData(accessToken, DATA_TYPES.PLAYLISTS, playlists)
      expect(result.success).toBe(true)
      expect(result.version).toBe(1)
    })

    it('无 token 抛出 VALIDATION_ERROR', async () => {
      await expect(updateData(null, DATA_TYPES.FOCUS_RECORDS, [])).rejects.toMatchObject({
        type: 'VALIDATION_ERROR'
      })
    })

    it('无效 dataType 抛出 VALIDATION_ERROR', async () => {
      await expect(updateData(accessToken, 'invalid_type', {})).rejects.toMatchObject({
        type: 'VALIDATION_ERROR'
      })
    })
  })

  describe('下载数据', () => {
    it('上传后下载数据一致（CBOR 编解码往返）', async () => {
      const records = [
        {
          id: 'r1',
          mode: 'focus',
          duration: 1500,
          elapsed: 1500,
          startTime: 1700000000000,
          endTime: 1700001500000,
          completionType: 'completed'
        }
      ]
      await updateData(accessToken, DATA_TYPES.FOCUS_RECORDS, records)

      const result = await getData(accessToken, DATA_TYPES.FOCUS_RECORDS)
      expect(result.type).toBe(DATA_TYPES.FOCUS_RECORDS)
      expect(result.version).toBe(1)
      expect(result.data).toEqual(records)
    })

    it('不存在的数据返回 data: null, version: 0', async () => {
      const result = await getData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result.data).toBeNull()
      expect(result.version).toBe(0)
    })

    it('无 token 抛出错误', async () => {
      await expect(getData(null, DATA_TYPES.FOCUS_RECORDS)).rejects.toMatchObject({
        type: 'VALIDATION_ERROR'
      })
    })
  })

  describe('版本号', () => {
    it('不存在时 version 为 0', async () => {
      const result = await getData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result.version).toBe(0)
    })

    it('首次上传后 version 为 1', async () => {
      await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings())
      const result = await getData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result.version).toBe(1)
    })

    it('再次上传后 version 递增为 2', async () => {
      await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings())
      await updateData(
        accessToken,
        DATA_TYPES.FOCUS_SETTINGS,
        makeSettings({ focusDuration: 1800 }),
        1
      )
      const result = await getData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result.version).toBe(2)
    })
  })

  describe('版本冲突', () => {
    it('用旧 version 上传已有数据抛出 CONFLICT_ERROR', async () => {
      await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings())

      await expect(
        updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings({ focusDuration: 1800 }), 0)
      ).rejects.toMatchObject({
        type: 'CONFLICT_ERROR',
        details: expect.objectContaining({
          serverVersion: 1
        })
      })
    })
  })

  describe('强制写入', () => {
    it('用 version: null 跳过冲突检测', async () => {
      await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings())

      const result = await updateData(
        accessToken,
        DATA_TYPES.FOCUS_SETTINGS,
        makeSettings({ focusDuration: 3000 }),
        null
      )
      expect(result.success).toBe(true)
      expect(result.version).toBe(2)
    })
  })

  describe('删除数据', () => {
    it('上传后删除成功', async () => {
      await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings())
      const result = await deleteData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result.success).toBe(true)
    })

    it('删除后下载返回 data 为 null', async () => {
      await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings())
      await deleteData(accessToken, DATA_TYPES.FOCUS_SETTINGS)

      const result = await getData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result.data).toBeNull()
    })
  })

  describe('hasData 辅助函数', () => {
    it('有数据时返回 true', async () => {
      await updateData(accessToken, DATA_TYPES.FOCUS_SETTINGS, makeSettings())
      const result = await hasData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result).toBe(true)
    })

    it('无数据时返回 false', async () => {
      const result = await hasData(accessToken, DATA_TYPES.FOCUS_SETTINGS)
      expect(result).toBe(false)
    })
  })
})
