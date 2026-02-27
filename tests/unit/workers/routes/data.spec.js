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
  createFocusSettingsData,
  createUserSettingsData
} from '../../../setup/fixtures/authData.js'
import {
  encodeSyncRequest,
  decodeSyncResponse,
  encodeData
} from '../../../../shared/proto/index.js'

const PROTOBUF_CONTENT_TYPE = 'application/x-protobuf'

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
      'Content-Type': PROTOBUF_CONTENT_TYPE,
      Accept: PROTOBUF_CONTENT_TYPE
    }
  }

  const parseProtobufResponse = async (res, dataType) => {
    const buffer = await res.arrayBuffer()
    return decodeSyncResponse(new Uint8Array(buffer), dataType)
  }

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
      const body = await parseProtobufResponse(res, 'focus_records')
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
      const body = await parseProtobufResponse(res, 'share_config')
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
      const body = await parseProtobufResponse(res, null)
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
          body: encodeSyncRequest('user_settings', data, 0)
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await parseProtobufResponse(res, 'user_settings')
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
          body: encodeSyncRequest('focus_settings', data, 2)
        },
        env
      )

      expect(res.status).toBe(200)
      const body = await parseProtobufResponse(res, 'focus_settings')
      expect(body.success).toBe(true)
      expect(body.version).toBe(3)
    })

    it('版本不匹配时应该返回冲突信息', async () => {
      // 使用独立用户避免测试间干扰
      env.DB.__getTables().user_data.push({
        user_id: 'user-conflict',
        data_type: DATA_CONFIG.TYPES.FOCUS_SETTINGS,
        data: encodeData('focus_settings', createFocusSettingsData()),
        data_format: 'protobuf',
        version: 5
      })

      const headers = await getAuthHeaders('user-conflict', 'conflictuser')
      const data = createFocusSettingsData({ focusDuration: 1800 })

      const res = await app.request(
        '/api/data/focus_settings',
        {
          method: 'PUT',
          headers,
          body: encodeSyncRequest('focus_settings', data, 3)
        },
        env
      )

      expect(res.status).toBe(409)
      const body = await parseProtobufResponse(res, 'focus_settings')
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
          body: encodeSyncRequest('focus_settings', { invalid: 'data' }, 2)
        },
        env
      )

      expect(res.status).toBe(400)
    })

    it('缺少 data 字段应该返回 400', async () => {
      const headers = await getAuthHeaders()

      // Send an empty SyncRequest (no oneof data set)
      const { create, toBinary } = await import('@bufbuild/protobuf')
      const { SyncRequestSchema } = await import('../../../../shared/proto/gen/studymiku_pb.js')
      const emptyReq = create(SyncRequestSchema, { version: 0 })

      const res = await app.request(
        '/api/data/focus_settings',
        {
          method: 'PUT',
          headers,
          body: toBinary(SyncRequestSchema, emptyReq)
        },
        env
      )

      expect(res.status).toBe(400)
      const body = await parseProtobufResponse(res, 'focus_settings')
      expect(body.code).toBe(ERROR_CODES.VALIDATION_FAILED)
    })

    it('无效的数据类型应该返回 400', async () => {
      const headers = await getAuthHeaders()

      // Send raw bytes — the type validation happens before parsing
      const res = await app.request(
        '/api/data/invalid_type',
        {
          method: 'PUT',
          headers,
          body: new Uint8Array([0])
        },
        env
      )

      expect(res.status).toBe(400)
      const body = await parseProtobufResponse(res, null)
      expect(body.code).toBe(ERROR_CODES.INVALID_TYPE)
    })
  })
})
