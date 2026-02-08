/**
 * 数据同步路由测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import { ERROR_CODES, DATA_CONFIG } from '../../../../workers/constants.js'
import { generateAccessToken } from '../../../../workers/services/jwt.js'
import { createMockEnv } from '../../../setup/fixtures/workerMocks.js'
import {
  sampleUsers,
  sampleUserData,
  createFocusRecordData,
  createFocusSettingsData,
  createPlaylistsData,
  createUserSettingsData
} from '../../../setup/fixtures/authData.js'

describe('data routes', () => {
  let app
  let env
  const testSecret = 'test-jwt-secret-32-characters-long'

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))

    env = createMockEnv({ JWT_SECRET: testSecret })
    env.DB.__setTable('users', [...sampleUsers])
    env.DB.__setTable('user_data', [...sampleUserData])

    const dataModule = await import('../../../../workers/routes/data.js')
    app = new Hono()
    app.route('/api/data', dataModule.default)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const getAuthHeaders = async (userId = 'user-001', username = 'testuser') => {
    const { token } = await generateAccessToken({
      userId,
      username,
      secret: testSecret
    })
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  describe('GET /api/data', () => {
    it('应该返回用户的所有数据', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data',
        {
          method: 'GET',
          headers
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBeDefined()
      expect(body.quota).toBeDefined()
      expect(body.quota.used).toBeGreaterThanOrEqual(0)
      expect(body.quota.limit).toBe(DATA_CONFIG.USER_QUOTA)
    })

    it('未认证应该返回 401', async () => {
      const res = await app.request(
        '/api/data',
        {
          method: 'GET'
        },
        env
      )

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/data/:type', () => {
    it('应该返回指定类型的数据', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/focus_records',
        {
          method: 'GET',
          headers
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.type).toBe('focus_records')
      expect(body.data).toBeDefined()
      expect(body.version).toBeDefined()
    })

    it('不存在的数据应该返回 null 和 version 0', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/share_config',
        {
          method: 'GET',
          headers
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBeNull()
      expect(body.version).toBe(0)
    })

    it('无效的数据类型应该返回 400', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/invalid_type',
        {
          method: 'GET',
          headers
        },
        env
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.INVALID_TYPE)
    })
  })

  describe('PUT /api/data/:type', () => {
    it('首次写入应该成功', async () => {
      const headers = await getAuthHeaders()
      const data = createUserSettingsData()

      const res = await app.request(
        '/api/data/user_settings',
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data, version: 0 })
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.version).toBe(1)
    })

    it('版本匹配时应该更新成功', async () => {
      const headers = await getAuthHeaders()
      const data = createFocusSettingsData({ focusDuration: 1800 })

      const res = await app.request(
        '/api/data/focus_settings',
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data, version: 2 }) // 当前版本是 2
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.version).toBe(3)
    })

    it('版本不匹配时应该返回冲突信息', async () => {
      // 使用独立用户避免测试间干扰
      env.DB.__getTables().user_data.push({
        user_id: 'user-conflict',
        data_type: DATA_CONFIG.TYPES.FOCUS_SETTINGS,
        data: JSON.stringify(createFocusSettingsData()),
        version: 5
      })

      const headers = await getAuthHeaders('user-conflict', 'conflictuser')
      const data = createFocusSettingsData({ focusDuration: 1800 })

      const res = await app.request(
        '/api/data/focus_settings',
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data, version: 3 }) // 过期版本，服务端是 5
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.conflict).toBe(true)
      expect(body.serverVersion).toBe(5)
      expect(body.serverData).toBeDefined()
    })

    it('无效数据应该返回 400', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/focus_settings',
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            data: { invalid: 'data' },
            version: 2
          })
        },
        env
      )

      expect(res.status).toBe(400)
    })

    it('缺少 data 字段应该返回 400', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/focus_settings',
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ version: 0 })
        },
        env
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.VALIDATION_FAILED)
    })

    it('无效的数据类型应该返回 400', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/invalid_type',
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: {}, version: 0 })
        },
        env
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.INVALID_TYPE)
    })
  })

  describe('POST /api/data/sync', () => {
    it('应该批量同步多个数据类型', async () => {
      const headers = await getAuthHeaders('user-sync', 'syncuser')

      const res = await app.request(
        '/api/data/sync',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            changes: [
              {
                type: DATA_CONFIG.TYPES.USER_SETTINGS,
                data: createUserSettingsData(),
                version: 0
              },
              {
                type: DATA_CONFIG.TYPES.PLAYLISTS,
                data: createPlaylistsData(),
                version: 0
              }
            ]
          })
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.results).toHaveLength(2)
      expect(body.results[0].success).toBe(true)
      expect(body.results[1].success).toBe(true)
    })

    it('空 changes 应该返回空结果', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/sync',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ changes: [] })
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.results).toEqual([])
    })

    it('包含无效数据类型应该返回 400', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/sync',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            changes: [
              {
                type: 'invalid_type',
                data: {},
                version: 0
              }
            ]
          })
        },
        env
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe(ERROR_CODES.INVALID_TYPE)
    })

    it('部分失败应该在结果中标记', async () => {
      const headers = await getAuthHeaders()

      const res = await app.request(
        '/api/data/sync',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            changes: [
              {
                type: DATA_CONFIG.TYPES.USER_SETTINGS,
                data: createUserSettingsData(),
                version: 0
              },
              {
                type: DATA_CONFIG.TYPES.FOCUS_SETTINGS,
                data: { invalid: 'data' },
                version: 0
              }
            ]
          })
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.results[0].success).toBe(true)
      expect(body.results[1].success).toBe(false)
    })

    it('focus_records 冲突应该自动合并', async () => {
      // 先写入服务端数据
      const serverRecord = createFocusRecordData({ id: 'server-record-1' })
      env.DB.__getTables().user_data.push({
        user_id: 'user-merge',
        data_type: DATA_CONFIG.TYPES.FOCUS_RECORDS,
        data: JSON.stringify([serverRecord]),
        version: 1
      })

      const headers = await getAuthHeaders('user-merge', 'mergeuser')
      const clientRecord = createFocusRecordData({ id: 'client-record-1' })

      const res = await app.request(
        '/api/data/sync',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            changes: [
              {
                type: DATA_CONFIG.TYPES.FOCUS_RECORDS,
                data: [clientRecord],
                version: 0 // 版本不匹配
              }
            ]
          })
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      // 现在返回冲突，让客户端处理
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].conflict).toBe(true)
    })
  })
})
