/**
 * @module workers/services/userData
 * @description 用户数据同步服务
 */

import { eq, and, sql } from 'drizzle-orm'
import { createDb, userData } from '../db/index.js'
import { DATA_CONFIG, ERROR_CODES } from '../constants.js'
import { dataTypeSchemas } from '../schemas/auth.js'
import { encodeToCbor, parseStoredData } from '../utils/cborServer.js'

/**
 * 验证数据大小
 * @param {string} type - 数据类型
 * @param {*} data - 数据内容
 * @returns {{valid: boolean, error?: string, jsonStr?: string}}
 */
const validateDataSize = (type, data) => {
  const maxSize = DATA_CONFIG.MAX_SIZE[type]
  if (!maxSize) {
    return { valid: false, error: 'Unknown data type' }
  }

  const jsonStr = JSON.stringify(data)
  if (jsonStr.length > maxSize) {
    return {
      valid: false,
      error: `Data exceeds size limit: ${jsonStr.length} > ${maxSize}`
    }
  }

  return { valid: true, jsonStr }
}

/**
 * 完整验证用户数据
 * @param {string} type - 数据类型
 * @param {*} data - 数据内容
 * @returns {{valid: boolean, data?: *, error?: string, code?: string, details?: Object[]}}
 */
export const validateUserData = (type, data) => {
  // 检查数据类型是否合法
  const schema = dataTypeSchemas[type]
  if (!schema) {
    return { valid: false, error: 'Invalid data type', code: ERROR_CODES.INVALID_TYPE }
  }

  // 检查大小限制
  const sizeResult = validateDataSize(type, data)
  if (!sizeResult.valid) {
    return { valid: false, error: sizeResult.error, code: ERROR_CODES.DATA_TOO_LARGE }
  }

  // 结构验证
  const result = schema.safeParse(data)
  if (!result.success) {
    return {
      valid: false,
      error: 'Validation failed',
      code: ERROR_CODES.VALIDATION_FAILED,
      details: result.error.issues.slice(0, 5)
    }
  }

  return { valid: true, data: result.data }
}

/**
 * 获取指定类型的用户数据
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {string} dataType - 数据类型
 * @returns {Promise<{data: *, version: number}>}
 */
export const getUserData = async (d1, userId, dataType) => {
  const db = createDb(d1)
  const row = await db
    .select({
      data: userData.data,
      dataFormat: userData.dataFormat,
      version: userData.version
    })
    .from(userData)
    .where(and(eq(userData.userId, userId), eq(userData.dataType, dataType)))
    .get()

  if (!row) {
    return { data: null, version: 0 }
  }

  // 自动检测格式并解析
  const parsedData =
    row.dataFormat === 'json'
      ? JSON.parse(row.data.toString())
      : parseStoredData(dataType, row.data)

  return {
    data: parsedData,
    version: row.version
  }
}

/**
 * 仅获取数据版本号
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {string} dataType - 数据类型
 * @returns {Promise<number>}
 */
export const getDataVersion = async (d1, userId, dataType) => {
  const db = createDb(d1)
  const row = await db
    .select({ version: userData.version })
    .from(userData)
    .where(and(eq(userData.userId, userId), eq(userData.dataType, dataType)))
    .get()

  return row?.version || 0
}

/**
 * 获取用户的所有数据
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object<string, {data: *, version: number}>>}
 */
export const getAllUserData = async (d1, userId) => {
  const db = createDb(d1)
  const results = await db
    .select({
      dataType: userData.dataType,
      data: userData.data,
      dataFormat: userData.dataFormat,
      version: userData.version
    })
    .from(userData)
    .where(eq(userData.userId, userId))

  const dataMap = {}
  for (const row of results) {
    const parsedData =
      row.dataFormat === 'json'
        ? JSON.parse(row.data.toString())
        : parseStoredData(row.dataType, row.data)

    dataMap[row.dataType] = {
      data: parsedData,
      version: row.version
    }
  }

  return dataMap
}

/**
 * 更新指定类型的用户数据（纯存储，不做合并）
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {string} dataType - 数据类型
 * @param {*} data - 数据内容
 * @param {number} clientVersion - 客户端版本号
 * @returns {Promise<{success: boolean, version?: number, conflict?: boolean, serverData?: *, serverVersion?: number, error?: string, code?: string}>}
 */
export const updateUserData = async (d1, userId, dataType, data, clientVersion) => {
  const db = createDb(d1)

  // 验证数据
  const validation = validateUserData(dataType, data)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      code: validation.code,
      details: validation.details
    }
  }

  // 获取当前服务端数据
  const current = await getUserData(d1, userId, dataType)

  // 首次写入 - 使用 CBOR 格式
  if (current.version === 0) {
    const cborData = encodeToCbor(dataType, validation.data)
    await db.insert(userData).values({
      userId,
      dataType,
      data: cborData,
      dataFormat: 'cbor',
      version: 1
    })

    return { success: true, version: 1 }
  }

  // 版本冲突检测 - 返回冲突让客户端处理
  if (clientVersion !== current.version) {
    return {
      success: false,
      conflict: true,
      serverData: current.data,
      serverVersion: current.version
    }
  }

  // 正常更新 - 使用 CBOR 格式
  const newVersion = current.version + 1
  const cborData = encodeToCbor(dataType, validation.data)
  await db
    .update(userData)
    .set({ data: cborData, dataFormat: 'cbor', version: newVersion })
    .where(and(eq(userData.userId, userId), eq(userData.dataType, dataType)))

  return { success: true, version: newVersion }
}

/**
 * 批量同步用户数据
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {Array<{type: string, data: *, version: number}>} changes - 变更列表
 * @returns {Promise<Array<{type: string, success: boolean, version?: number, conflict?: boolean, serverData?: *, error?: string}>>}
 */
export const syncUserData = async (d1, userId, changes) => {
  const results = {}

  for (const change of changes) {
    const result = await updateUserData(d1, userId, change.type, change.data, change.version)
    results[change.type] = result
  }

  return results
}

/**
 * 检查用户存储配额
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<{withinQuota: boolean, used: number, limit: number}>}
 */
export const checkUserQuota = async (d1, userId) => {
  const db = createDb(d1)
  const result = await db
    .select({ total: sql`SUM(LENGTH(${userData.data}))` })
    .from(userData)
    .where(eq(userData.userId, userId))
    .get()

  const used = result?.total || 0
  return {
    withinQuota: used < DATA_CONFIG.USER_QUOTA,
    used,
    limit: DATA_CONFIG.USER_QUOTA
  }
}

/**
 * 应用增量更新
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {string} dataType - 数据类型
 * @param {Array} changes - 变更数组 [{action, record}]
 * @param {number} clientVersion - 客户端版本号
 * @returns {Promise<{success: boolean, version?: number, conflict?: boolean, serverVersion?: number}>}
 */
export const applyDelta = async (d1, userId, dataType, changes, clientVersion) => {
  const db = createDb(d1)

  // 获取当前数据
  const current = await getUserData(d1, userId, dataType)

  // 版本检查
  if (current.version !== 0 && clientVersion !== current.version) {
    return {
      success: false,
      conflict: true,
      serverVersion: current.version
    }
  }

  // 应用变更
  let records = Array.isArray(current.data) ? [...current.data] : []
  const recordMap = new Map(records.map((r) => [r.id, r]))

  for (const change of changes) {
    const { action, record } = change
    if (!record || !record.id) continue

    switch (action) {
      case 'add':
      case 'update':
        recordMap.set(record.id, record)
        break
      case 'delete':
        recordMap.delete(record.id)
        break
    }
  }

  // 转换回数组并排序
  records = Array.from(recordMap.values())
  records.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

  // 限制记录数量
  if (records.length > DATA_CONFIG.MAX_FOCUS_RECORDS) {
    records = records.slice(-DATA_CONFIG.MAX_FOCUS_RECORDS)
  }

  // 验证数据
  const validation = validateUserData(dataType, records)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      code: validation.code
    }
  }

  // 保存 - 使用 CBOR 格式
  const newVersion = current.version + 1
  const cborData = encodeToCbor(dataType, validation.data)

  if (current.version === 0) {
    await db.insert(userData).values({
      userId,
      dataType,
      data: cborData,
      dataFormat: 'cbor',
      version: 1
    })
    return { success: true, version: 1 }
  }

  await db
    .update(userData)
    .set({ data: cborData, dataFormat: 'cbor', version: newVersion })
    .where(and(eq(userData.userId, userId), eq(userData.dataType, dataType)))

  return { success: true, version: newVersion }
}
