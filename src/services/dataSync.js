/**
 * @fileoverview 数据同步服务
 * @module services/dataSync
 *
 * 封装用户数据的上传、下载、批量同步 API 调用
 */

import { DATA_API, AUTH_CONFIG } from '../config/constants.js'
import { ERROR_TYPES } from './auth.js'

/**
 * 创建认证错误对象（从 auth.js 导入的辅助函数）
 * @param {string} type - 错误类型
 * @param {string} message - 错误消息
 * @param {any} details - 错误详情
 * @returns {import('../types/auth.js').AuthError} 认证错误
 */
const createSyncError = (type, message, details = null) => {
  return {
    code: type,
    message,
    type,
    details
  }
}

/**
 * 发送 API 请求（带重试机制）
 * @param {string} url - 请求 URL
 * @param {Object} options - fetch 选项
 * @param {number} retries - 剩余重试次数
 * @returns {Promise<any>} 响应数据
 */
const fetchWithRetry = async (url, options = {}, retries = AUTH_CONFIG.MAX_RETRY_ATTEMPTS) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    // 解析响应
    const data = await response.json()

    // 检查 HTTP 状态码
    if (!response.ok) {
      // Token 过期
      if (response.status === 401) {
        throw createSyncError(ERROR_TYPES.TOKEN_EXPIRED, data.error || 'Token 已过期', data)
      }

      // 版本冲突
      if (response.status === 409) {
        throw createSyncError('CONFLICT_ERROR', data.error || '数据版本冲突', data)
      }

      // 其他错误
      throw createSyncError(
        ERROR_TYPES.AUTH_ERROR,
        data.error || `请求失败: ${response.status}`,
        data
      )
    }

    return data
  } catch (error) {
    // 网络错误，尝试重试
    if (error.name === 'TypeError' && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, AUTH_CONFIG.RETRY_DELAY))
      return fetchWithRetry(url, options, retries - 1)
    }

    // 如果是已知错误，直接抛出
    if (error.type) {
      throw error
    }

    // 未知错误
    throw createSyncError(ERROR_TYPES.NETWORK_ERROR, error.message || '网络请求失败', error)
  }
}

/**
 * 验证数据类型
 * @param {string} dataType - 数据类型
 * @throws {Error} 如果数据类型无效
 */
const validateDataType = (dataType) => {
  const validTypes = Object.values(AUTH_CONFIG.DATA_TYPES)
  if (!validTypes.includes(dataType)) {
    throw createSyncError(ERROR_TYPES.VALIDATION_ERROR, `无效的数据类型: ${dataType}`, {
      validTypes
    })
  }
}

/**
 * 获取指定类型的数据
 * @param {string} accessToken - 访问令牌
 * @param {string} dataType - 数据类型
 * @returns {Promise<import('../types/auth.js').SyncResponse>} 同步响应
 */
export const getData = async (accessToken, dataType) => {
  if (!accessToken) {
    throw createSyncError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  validateDataType(dataType)

  return fetchWithRetry(DATA_API.GET_DATA(dataType), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
}

/**
 * 更新指定类型的数据
 * @param {string} accessToken - 访问令牌
 * @param {string} dataType - 数据类型
 * @param {any} data - 数据内容
 * @param {number} [version] - 数据版本号（可选，用于冲突检测）
 * @returns {Promise<import('../types/auth.js').SyncResponse>} 同步响应
 */
export const updateData = async (accessToken, dataType, data, version = null) => {
  if (!accessToken) {
    throw createSyncError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  validateDataType(dataType)

  const payload = {
    data,
    version
  }

  return fetchWithRetry(DATA_API.UPDATE_DATA(dataType), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  })
}

/**
 * 全量同步所有数据
 * 获取服务器上所有数据类型的最新数据
 * @param {string} accessToken - 访问令牌
 * @returns {Promise<Object<string, import('../types/auth.js').SyncResponse>>} 各数据类型的同步响应
 */
export const syncAll = async (accessToken) => {
  if (!accessToken) {
    throw createSyncError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  return fetchWithRetry(DATA_API.SYNC_ALL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
}

/**
 * 批量同步数据变更
 * 一次性上传多个数据类型的变更
 * @param {string} accessToken - 访问令牌
 * @param {import('../types/auth.js').BatchSyncRequest} syncRequest - 批量同步请求
 * @returns {Promise<import('../types/auth.js').BatchSyncResponse>} 批量同步响应
 */
export const batchSync = async (accessToken, syncRequest) => {
  if (!accessToken) {
    throw createSyncError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  if (!syncRequest || !syncRequest.changes || !Array.isArray(syncRequest.changes)) {
    throw createSyncError(ERROR_TYPES.VALIDATION_ERROR, '同步请求格式无效')
  }

  // 验证所有数据类型
  syncRequest.changes.forEach((change) => {
    validateDataType(change.dataType)
  })

  return fetchWithRetry(DATA_API.BATCH_SYNC, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(syncRequest)
  })
}

/**
 * 删除指定类型的数据
 * @param {string} accessToken - 访问令牌
 * @param {string} dataType - 数据类型
 * @returns {Promise<void>}
 */
export const deleteData = async (accessToken, dataType) => {
  if (!accessToken) {
    throw createSyncError(ERROR_TYPES.VALIDATION_ERROR, '访问令牌不能为空')
  }

  validateDataType(dataType)

  return fetchWithRetry(DATA_API.UPDATE_DATA(dataType), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
}

/**
 * 检查数据是否存在
 * @param {string} accessToken - 访问令牌
 * @param {string} dataType - 数据类型
 * @returns {Promise<boolean>} 是否存在
 */
export const hasData = async (accessToken, dataType) => {
  try {
    const response = await getData(accessToken, dataType)
    return response.success && response.data !== null
  } catch (error) {
    // 如果是 404 错误，说明数据不存在
    if (error.details && error.details.status === 404) {
      return false
    }
    throw error
  }
}
