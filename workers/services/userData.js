/**
 * @module workers/services/userData
 * @description 用户数据同步服务
 */

import { DATA_CONFIG, ERROR_CODES } from '../constants.js'
import { dataTypeSchemas } from '../schemas/auth.js'

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
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {string} dataType - 数据类型
 * @returns {Promise<{data: *, version: number}>}
 */
export const getUserData = async (db, userId, dataType) => {
  const row = await db
    .prepare('SELECT data, version FROM user_data WHERE user_id = ? AND data_type = ?')
    .bind(userId, dataType)
    .first()

  if (!row) {
    return { data: null, version: 0 }
  }

  return {
    data: JSON.parse(row.data),
    version: row.version
  }
}

/**
 * 获取用户的所有数据
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object<string, {data: *, version: number}>>}
 */
export const getAllUserData = async (db, userId) => {
  const { results } = await db
    .prepare('SELECT data_type, data, version FROM user_data WHERE user_id = ?')
    .bind(userId)
    .all()

  const dataMap = {}
  for (const row of results) {
    dataMap[row.data_type] = {
      data: JSON.parse(row.data),
      version: row.version
    }
  }

  return dataMap
}

/**
 * 更新指定类型的用户数据
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {string} dataType - 数据类型
 * @param {*} data - 数据内容
 * @param {number} clientVersion - 客户端版本号
 * @returns {Promise<{success: boolean, version?: number, conflict?: boolean, serverData?: *, serverVersion?: number, error?: string, code?: string}>}
 */
export const updateUserData = async (db, userId, dataType, data, clientVersion) => {
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
  const current = await getUserData(db, userId, dataType)

  // 首次写入
  if (current.version === 0) {
    const jsonStr = JSON.stringify(validation.data)
    await db
      .prepare(
        `INSERT INTO user_data (user_id, data_type, data, version)
         VALUES (?, ?, ?, 1)`
      )
      .bind(userId, dataType, jsonStr)
      .run()

    return { success: true, version: 1 }
  }

  // 版本冲突检测
  if (clientVersion !== current.version) {
    // focus_records 特殊处理：自动合并
    if (dataType === DATA_CONFIG.TYPES.FOCUS_RECORDS) {
      const merged = mergeFocusRecords(current.data, data)
      const mergedValidation = validateUserData(dataType, merged)

      if (!mergedValidation.valid) {
        return {
          success: false,
          conflict: true,
          serverData: current.data,
          serverVersion: current.version,
          error: 'Merge validation failed'
        }
      }

      const newVersion = current.version + 1
      const jsonStr = JSON.stringify(mergedValidation.data)
      await db
        .prepare('UPDATE user_data SET data = ?, version = ? WHERE user_id = ? AND data_type = ?')
        .bind(jsonStr, newVersion, userId, dataType)
        .run()

      return { success: true, version: newVersion, merged: true }
    }

    // 其他类型：返回冲突
    return {
      success: false,
      conflict: true,
      serverData: current.data,
      serverVersion: current.version
    }
  }

  // 正常更新
  const newVersion = current.version + 1
  const jsonStr = JSON.stringify(validation.data)
  await db
    .prepare('UPDATE user_data SET data = ?, version = ? WHERE user_id = ? AND data_type = ?')
    .bind(jsonStr, newVersion, userId, dataType)
    .run()

  return { success: true, version: newVersion }
}

/**
 * 批量同步用户数据
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {Array<{type: string, data: *, version: number}>} changes - 变更列表
 * @returns {Promise<Array<{type: string, success: boolean, version?: number, conflict?: boolean, serverData?: *, error?: string}>>}
 */
export const syncUserData = async (db, userId, changes) => {
  const results = []

  for (const change of changes) {
    const result = await updateUserData(db, userId, change.type, change.data, change.version)
    results.push({
      type: change.type,
      ...result
    })
  }

  return results
}

/**
 * 检查用户存储配额
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<{withinQuota: boolean, used: number, limit: number}>}
 */
export const checkUserQuota = async (db, userId) => {
  const result = await db
    .prepare('SELECT SUM(LENGTH(data)) as total FROM user_data WHERE user_id = ?')
    .bind(userId)
    .first()

  const used = result?.total || 0
  return {
    withinQuota: used < DATA_CONFIG.USER_QUOTA,
    used,
    limit: DATA_CONFIG.USER_QUOTA
  }
}

/**
 * 合并 Focus Records (按 id 去重)
 * @param {Array} serverRecords - 服务端记录
 * @param {Array} clientRecords - 客户端记录
 * @returns {Array}
 */
const mergeFocusRecords = (serverRecords, clientRecords) => {
  if (!Array.isArray(serverRecords)) serverRecords = []
  if (!Array.isArray(clientRecords)) clientRecords = []

  const recordMap = new Map()

  // 先添加服务端记录
  for (const record of serverRecords) {
    recordMap.set(record.id, record)
  }

  // 客户端记录覆盖
  for (const record of clientRecords) {
    recordMap.set(record.id, record)
  }

  // 按 startTime 排序
  const merged = Array.from(recordMap.values())
  merged.sort((a, b) => a.startTime - b.startTime)

  // 超过上限时保留最新的
  if (merged.length > DATA_CONFIG.MAX_FOCUS_RECORDS) {
    return merged.slice(-DATA_CONFIG.MAX_FOCUS_RECORDS)
  }

  return merged
}
