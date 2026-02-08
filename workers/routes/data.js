/**
 * @module workers/routes/data
 * @description 用户数据同步路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { encode, decode } from 'cbor-x'
import { ERROR_CODES } from '../constants.js'
import { dataRateLimit } from '../middleware/rateLimit.js'
import { requireAuth } from '../middleware/auth.js'
import { dataTypeParamSchema } from '../schemas/auth.js'
import {
  getUserData,
  getAllUserData,
  updateUserData,
  syncUserData,
  checkUserQuota,
  getDataVersion,
  applyDelta
} from '../services/userData.js'
import { CBOR_PROTOCOL_VERSION } from '../utils/cborServer.js'

/** 同步协议版本 */
const SYNC_PROTOCOL_VERSION = 1

/** CBOR Content-Type */
const CBOR_CONTENT_TYPE = 'application/cbor'

/**
 * 检查客户端是否接受 CBOR 响应
 * @param {Object} c - Hono context
 * @returns {boolean}
 */
const acceptsCbor = (c) => {
  const accept = c.req.header('Accept') || ''
  return accept.includes(CBOR_CONTENT_TYPE)
}

/**
 * 检查请求是否为 CBOR 格式
 * @param {Object} c - Hono context
 * @returns {boolean}
 */
const isCborRequest = (c) => {
  const contentType = c.req.header('Content-Type') || ''
  return contentType.includes(CBOR_CONTENT_TYPE)
}

/**
 * 解析请求体（支持 JSON 和 CBOR）
 * @param {Object} c - Hono context
 * @returns {Promise<{data: *, error?: string}>}
 */
const parseRequestBody = async (c) => {
  try {
    if (isCborRequest(c)) {
      const buffer = await c.req.arrayBuffer()
      return { data: decode(new Uint8Array(buffer)) }
    }
    return { data: await c.req.json() }
  } catch {
    return { error: isCborRequest(c) ? 'Invalid CBOR' : 'Invalid JSON' }
  }
}

/**
 * 发送响应（支持 JSON 和 CBOR）
 * @param {Object} c - Hono context
 * @param {*} data - 响应数据
 * @param {number} status - HTTP 状态码
 * @returns {Response}
 */
const sendResponse = (c, data, status = 200) => {
  if (acceptsCbor(c)) {
    const cborData = encode(data)
    return new Response(cborData, {
      status,
      headers: {
        'Content-Type': CBOR_CONTENT_TYPE,
        'X-Sync-Protocol-Version': String(SYNC_PROTOCOL_VERSION),
        'X-Cbor-Protocol-Version': String(CBOR_PROTOCOL_VERSION)
      }
    })
  }
  const response = c.json(data, status)
  response.headers.set('X-Sync-Protocol-Version', String(SYNC_PROTOCOL_VERSION))
  return response
}

const data = new Hono()

/** 请求体大小限制 (3 MB) */
const MAX_BODY_SIZE = 3 * 1024 * 1024

/**
 * 请求体大小检查中间件
 */
const checkBodySize = async (c, next) => {
  const contentLength = c.req.header('Content-Length')
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return c.json(
      {
        error: 'Request body too large',
        code: ERROR_CODES.DATA_TOO_LARGE
      },
      413
    )
  }
  await next()
}

// 所有数据路由都需要认证和速率限制
data.use('*', requireAuth())
data.use('*', dataRateLimit)

/**
 * GET /api/data
 * 获取所有用户数据
 */
data.get('/', async (c) => {
  const { id } = c.get('user')

  const allData = await getAllUserData(c.env.DB, id)
  const quota = await checkUserQuota(c.env.DB, id)

  return sendResponse(c, {
    data: allData,
    quota: {
      used: quota.used,
      limit: quota.limit
    }
  })
})

/**
 * GET /api/data/:type
 * 获取指定类型的用户数据
 */
data.get('/:type', zValidator('param', z.object({ type: z.string() })), async (c) => {
  const { id } = c.get('user')
  const { type } = c.req.valid('param')

  const typeValidation = dataTypeParamSchema.safeParse({ type })
  if (!typeValidation.success) {
    return sendResponse(c, { error: 'Invalid data type', code: ERROR_CODES.INVALID_TYPE }, 400)
  }

  const result = await getUserData(c.env.DB, id, type)

  return sendResponse(c, {
    type,
    data: result.data,
    version: result.version
  })
})

/**
 * GET /api/data/:type/version
 * 仅获取指定类型数据的版本号
 */
data.get('/:type/version', zValidator('param', z.object({ type: z.string() })), async (c) => {
  const { id } = c.get('user')
  const { type } = c.req.valid('param')

  const typeValidation = dataTypeParamSchema.safeParse({ type })
  if (!typeValidation.success) {
    return sendResponse(c, { error: 'Invalid data type', code: ERROR_CODES.INVALID_TYPE }, 400)
  }

  const version = await getDataVersion(c.env.DB, id, type)
  return sendResponse(c, { type, version })
})

/**
 * PUT /api/data/:type
 * 更新指定类型的用户数据
 */
data.put(
  '/:type',
  checkBodySize,
  zValidator('param', z.object({ type: z.string() })),
  async (c) => {
    const { id } = c.get('user')
    const { type } = c.req.valid('param')

    const typeValidation = dataTypeParamSchema.safeParse({ type })
    if (!typeValidation.success) {
      return sendResponse(c, { error: 'Invalid data type', code: ERROR_CODES.INVALID_TYPE }, 400)
    }

    // 解析请求体（支持 JSON 和 CBOR）
    const parsed = await parseRequestBody(c)
    if (parsed.error) {
      return sendResponse(c, { error: parsed.error, code: ERROR_CODES.INVALID_JSON }, 400)
    }

    const { data: reqData, version } = parsed.data
    if (reqData === undefined || version === undefined) {
      return sendResponse(
        c,
        { error: 'Missing data or version field', code: ERROR_CODES.VALIDATION_FAILED },
        400
      )
    }

    const quota = await checkUserQuota(c.env.DB, id)
    if (!quota.withinQuota) {
      return sendResponse(
        c,
        {
          error: 'Storage quota exceeded',
          code: ERROR_CODES.QUOTA_EXCEEDED,
          quota: { used: quota.used, limit: quota.limit }
        },
        413
      )
    }

    const result = await updateUserData(c.env.DB, id, type, reqData, version)

    if (!result.success) {
      if (result.conflict) {
        return sendResponse(c, {
          error: 'Version conflict',
          code: ERROR_CODES.VERSION_CONFLICT,
          conflict: true,
          serverData: result.serverData,
          serverVersion: result.serverVersion
        })
      }
      return sendResponse(
        c,
        { error: result.error, code: result.code, details: result.details },
        400
      )
    }

    return sendResponse(c, {
      success: true,
      version: result.version,
      merged: result.merged || false
    })
  }
)

/**
 * POST /api/data/:type/delta
 * 增量更新指定类型的用户数据
 */
data.post(
  '/:type/delta',
  checkBodySize,
  zValidator('param', z.object({ type: z.string() })),
  async (c) => {
    const { id } = c.get('user')
    const { type } = c.req.valid('param')

    const typeValidation = dataTypeParamSchema.safeParse({ type })
    if (!typeValidation.success) {
      return sendResponse(c, { error: 'Invalid data type', code: ERROR_CODES.INVALID_TYPE }, 400)
    }

    const parsed = await parseRequestBody(c)
    if (parsed.error) {
      return sendResponse(c, { error: parsed.error, code: ERROR_CODES.INVALID_JSON }, 400)
    }

    const { changes, version } = parsed.data
    if (!Array.isArray(changes) || version === undefined) {
      return sendResponse(
        c,
        { error: 'Missing changes or version', code: ERROR_CODES.VALIDATION_FAILED },
        400
      )
    }

    const result = await applyDelta(c.env.DB, id, type, changes, version)

    if (!result.success) {
      return sendResponse(
        c,
        {
          error: result.error || 'Delta apply failed',
          code: result.code || ERROR_CODES.VERSION_CONFLICT,
          serverVersion: result.serverVersion
        },
        result.conflict ? 200 : 400
      )
    }

    return sendResponse(c, { success: true, version: result.version })
  }
)

/**
 * POST /api/data/sync
 * 批量同步用户数据
 */
data.post('/sync', checkBodySize, async (c) => {
  const { id } = c.get('user')

  const parsed = await parseRequestBody(c)
  if (parsed.error) {
    return sendResponse(c, { error: parsed.error, code: ERROR_CODES.INVALID_JSON }, 400)
  }

  const { changes } = parsed.data
  if (!changes || changes.length === 0) {
    return sendResponse(c, { results: [] })
  }

  for (const change of changes) {
    const typeValidation = dataTypeParamSchema.safeParse({ type: change.type })
    if (!typeValidation.success) {
      return sendResponse(
        c,
        { error: `Invalid data type: ${change.type}`, code: ERROR_CODES.INVALID_TYPE },
        400
      )
    }
  }

  const quota = await checkUserQuota(c.env.DB, id)
  if (!quota.withinQuota) {
    return sendResponse(
      c,
      {
        error: 'Storage quota exceeded',
        code: ERROR_CODES.QUOTA_EXCEEDED,
        quota: { used: quota.used, limit: quota.limit }
      },
      413
    )
  }

  const results = await syncUserData(c.env.DB, id, changes)
  return sendResponse(c, { results })
})

export default data
