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
import { dataTypeParamSchema, syncRequestSchema } from '../schemas/auth.js'
import {
  getUserData,
  getAllUserData,
  updateUserData,
  syncUserData,
  checkUserQuota,
  getDataVersion,
  applyDelta
} from '../services/userData.js'

/** 同步协议版本 */
const SYNC_PROTOCOL_VERSION = 1

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

  return c.json({
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

  // 验证数据类型
  const typeValidation = dataTypeParamSchema.safeParse({ type })
  if (!typeValidation.success) {
    return c.json(
      {
        error: 'Invalid data type',
        code: ERROR_CODES.INVALID_TYPE
      },
      400
    )
  }

  const result = await getUserData(c.env.DB, id, type)

  const response = c.json({
    type,
    data: result.data,
    version: result.version
  })

  // 添加协议版本头
  response.headers.set('X-Sync-Protocol-Version', String(SYNC_PROTOCOL_VERSION))
  return response
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
    return c.json(
      {
        error: 'Invalid data type',
        code: ERROR_CODES.INVALID_TYPE
      },
      400
    )
  }

  const version = await getDataVersion(c.env.DB, id, type)

  const response = c.json({ type, version })
  response.headers.set('X-Sync-Protocol-Version', String(SYNC_PROTOCOL_VERSION))
  return response
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

    // 验证数据类型
    const typeValidation = dataTypeParamSchema.safeParse({ type })
    if (!typeValidation.success) {
      return c.json(
        {
          error: 'Invalid data type',
          code: ERROR_CODES.INVALID_TYPE
        },
        400
      )
    }

    // 解析请求体
    let body
    try {
      body = await c.req.json()
    } catch {
      return c.json(
        {
          error: 'Invalid JSON',
          code: ERROR_CODES.INVALID_JSON
        },
        400
      )
    }

    const { data, version } = body

    if (data === undefined || version === undefined) {
      return c.json(
        {
          error: 'Missing data or version field',
          code: ERROR_CODES.VALIDATION_FAILED
        },
        400
      )
    }

    // 检查配额
    const quota = await checkUserQuota(c.env.DB, id)
    if (!quota.withinQuota) {
      return c.json(
        {
          error: 'Storage quota exceeded',
          code: ERROR_CODES.QUOTA_EXCEEDED,
          quota: {
            used: quota.used,
            limit: quota.limit
          }
        },
        413
      )
    }

    // 更新数据
    const result = await updateUserData(c.env.DB, id, type, data, version)

    if (!result.success) {
      if (result.conflict) {
        return c.json(
          {
            error: 'Version conflict',
            code: ERROR_CODES.VERSION_CONFLICT,
            conflict: true,
            serverData: result.serverData,
            serverVersion: result.serverVersion
          },
          200 // 返回 200 让客户端处理冲突
        )
      }

      return c.json(
        {
          error: result.error,
          code: result.code,
          details: result.details
        },
        400
      )
    }

    return c.json({
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
      return c.json({ error: 'Invalid data type', code: ERROR_CODES.INVALID_TYPE }, 400)
    }

    let body
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON', code: ERROR_CODES.INVALID_JSON }, 400)
    }

    const { changes, version } = body
    if (!Array.isArray(changes) || version === undefined) {
      return c.json(
        { error: 'Missing changes or version', code: ERROR_CODES.VALIDATION_FAILED },
        400
      )
    }

    const result = await applyDelta(c.env.DB, id, type, changes, version)

    if (!result.success) {
      return c.json(
        {
          error: result.error || 'Delta apply failed',
          code: result.code || ERROR_CODES.VERSION_CONFLICT,
          serverVersion: result.serverVersion
        },
        result.conflict ? 200 : 400
      )
    }

    return c.json({
      success: true,
      version: result.version
    })
  }
)

/**
 * POST /api/data/sync
 * 批量同步用户数据
 */
data.post('/sync', checkBodySize, zValidator('json', syncRequestSchema), async (c) => {
  const { id } = c.get('user')
  const { changes } = c.req.valid('json')

  if (!changes || changes.length === 0) {
    return c.json({ results: [] })
  }

  // 预验证所有数据类型
  for (const change of changes) {
    const typeValidation = dataTypeParamSchema.safeParse({ type: change.type })
    if (!typeValidation.success) {
      return c.json(
        {
          error: `Invalid data type: ${change.type}`,
          code: ERROR_CODES.INVALID_TYPE
        },
        400
      )
    }
  }

  // 检查配额
  const quota = await checkUserQuota(c.env.DB, id)
  if (!quota.withinQuota) {
    return c.json(
      {
        error: 'Storage quota exceeded',
        code: ERROR_CODES.QUOTA_EXCEEDED,
        quota: {
          used: quota.used,
          limit: quota.limit
        }
      },
      413
    )
  }

  // 执行批量同步
  const results = await syncUserData(c.env.DB, id, changes)

  return c.json({
    results
  })
})

export default data
