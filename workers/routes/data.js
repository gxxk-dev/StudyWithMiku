/**
 * @module workers/routes/data
 * @description 用户数据同步路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ERROR_CODES } from '../constants.js'
import { dataRateLimit } from '../middleware/rateLimit.js'
import { requireAuth } from '../middleware/auth.js'
import { dataTypeParamSchema } from '../schemas/auth.js'
import { decodeSyncRequest, encodeSyncResponse } from '../../shared/proto/index.js'
import {
  getUserData,
  updateUserData,
  checkUserQuota,
  getDataVersion
} from '../services/userData.js'

const PROTOBUF_CONTENT_TYPE = 'application/x-protobuf'

/**
 * 解析请求体（Protobuf）
 * @param {Object} c - Hono context
 * @param {string} dataType - 数据类型
 * @returns {Promise<{data: *, error?: string}>}
 */
const parseRequestBody = async (c, dataType) => {
  try {
    const buffer = await c.req.arrayBuffer()
    const decoded = decodeSyncRequest(buffer, dataType)
    return { data: decoded }
  } catch {
    return { error: 'Invalid Protobuf' }
  }
}

/**
 * 发送 Protobuf 响应
 * @param {Object} c - Hono context
 * @param {*} data - 响应数据
 * @param {number} status - HTTP 状态码
 * @returns {Response}
 */
const sendResponse = (c, data, status = 200) => {
  const dataType = c.req.param('type') || null
  const protobufData = encodeSyncResponse(data, dataType)
  return new Response(protobufData, {
    status,
    headers: {
      'Content-Type': PROTOBUF_CONTENT_TYPE
    }
  })
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
    return sendResponse(
      c,
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

    // 解析 Protobuf 请求体
    const parsed = await parseRequestBody(c, type)
    if (parsed.error) {
      return sendResponse(c, { error: parsed.error, code: ERROR_CODES.INVALID_JSON }, 400)
    }

    const { data: reqData, version = null } = parsed.data
    if (reqData === undefined || reqData === null) {
      return sendResponse(
        c,
        { error: 'Missing data field', code: ERROR_CODES.VALIDATION_FAILED },
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
        return sendResponse(
          c,
          {
            error: 'Version conflict',
            code: ERROR_CODES.VERSION_CONFLICT,
            conflict: true,
            serverData: result.serverData,
            serverVersion: result.serverVersion
          },
          409
        )
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
 * DELETE /api/data/:type
 * 删除指定类型的用户数据
 */
data.delete('/:type', zValidator('param', z.object({ type: z.string() })), async (c) => {
  const { id } = c.get('user')
  const { type } = c.req.valid('param')

  const typeValidation = dataTypeParamSchema.safeParse({ type })
  if (!typeValidation.success) {
    return sendResponse(c, { error: 'Invalid data type', code: ERROR_CODES.INVALID_TYPE }, 400)
  }

  await updateUserData(c.env.DB, id, type, null, null)
  return sendResponse(c, { success: true })
})

export default data
