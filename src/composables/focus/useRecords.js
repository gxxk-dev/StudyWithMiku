/**
 * Focus 记录存储与查询
 * 管理番茄钟记录的 CRUD 操作
 */

import { ref, readonly } from 'vue'
import {
  safeLocalStorageGetJSON,
  safeLocalStorageSetJSON,
  safeLocalStorageRemove
} from '../../utils/storage.js'
import { FOCUS_STORAGE_KEYS, QUERY_DEFAULTS, FocusMode, CompletionType } from './constants.js'

// 模块级单例状态
const records = ref([])
let initialized = false

/**
 * 初始化记录存储
 */
const initialize = () => {
  if (initialized) {
    return
  }

  const savedRecords = safeLocalStorageGetJSON(FOCUS_STORAGE_KEYS.RECORDS, [])
  records.value = Array.isArray(savedRecords) ? savedRecords : []
  initialized = true
}

/**
 * 持久化记录到 localStorage
 */
const persistRecords = () => {
  safeLocalStorageSetJSON(FOCUS_STORAGE_KEYS.RECORDS, records.value)
}

/**
 * 生成唯一 ID
 */
const generateId = () => {
  return `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 添加记录
 * @param {Object} record - 记录数据
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
const addRecord = (record) => {
  initialize()

  if (!record || typeof record !== 'object') {
    return { success: false, error: 'Invalid record data' }
  }

  const newRecord = {
    id: record.id || generateId(),
    mode: record.mode || FocusMode.FOCUS,
    startTime: record.startTime || Date.now(),
    endTime: record.endTime || Date.now(),
    duration: record.duration || 0,
    elapsed: record.elapsed || 0,
    completionType: record.completionType || CompletionType.COMPLETED
  }

  records.value.push(newRecord)
  persistRecords()

  return { success: true, data: newRecord }
}

/**
 * 获取单条记录
 * @param {string} id - 记录 ID
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
const getRecord = (id) => {
  initialize()

  const record = records.value.find((r) => r.id === id)

  if (!record) {
    return { success: false, error: 'Record not found' }
  }

  return { success: true, data: record }
}

/**
 * 更新记录
 * @param {string} id - 记录 ID
 * @param {Object} updates - 更新数据
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
const updateRecord = (id, updates) => {
  initialize()

  const index = records.value.findIndex((r) => r.id === id)

  if (index === -1) {
    return { success: false, error: 'Record not found' }
  }

  const updatedRecord = {
    ...records.value[index],
    ...updates,
    id // 确保 ID 不被覆盖
  }

  records.value[index] = updatedRecord
  persistRecords()

  return { success: true, data: updatedRecord }
}

/**
 * 删除记录
 * @param {string} id - 记录 ID
 * @returns {Object} { success: boolean, error?: string }
 */
const deleteRecord = (id) => {
  initialize()

  const index = records.value.findIndex((r) => r.id === id)

  if (index === -1) {
    return { success: false, error: 'Record not found' }
  }

  records.value.splice(index, 1)
  persistRecords()

  return { success: true }
}

/**
 * 查询记录
 * @param {Object} options - 查询选项
 * @param {number} options.limit - 限制返回数量
 * @param {number} options.offset - 偏移量
 * @param {string} options.mode - 按模式过滤
 * @param {string} options.completionType - 按完成类型过滤
 * @param {number} options.startDate - 开始日期（时间戳）
 * @param {number} options.endDate - 结束日期（时间戳）
 * @param {string} options.sortBy - 排序字段 (startTime, endTime, elapsed)
 * @param {string} options.sortOrder - 排序方向 (asc, desc)
 * @returns {Object} { success: boolean, data: Array, total: number }
 */
const queryRecords = (options = {}) => {
  initialize()

  const {
    limit = QUERY_DEFAULTS.limit,
    offset = QUERY_DEFAULTS.offset,
    mode = null,
    completionType = null,
    startDate = null,
    endDate = null,
    sortBy = 'startTime',
    sortOrder = 'desc'
  } = options

  let filtered = [...records.value]

  // 按模式过滤
  if (mode) {
    filtered = filtered.filter((r) => r.mode === mode)
  }

  // 按完成类型过滤
  if (completionType) {
    filtered = filtered.filter((r) => r.completionType === completionType)
  }

  // 按日期范围过滤
  if (startDate) {
    filtered = filtered.filter((r) => r.startTime >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter((r) => r.startTime <= endDate)
  }

  // 排序
  filtered.sort((a, b) => {
    const aVal = a[sortBy] || 0
    const bVal = b[sortBy] || 0
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  })

  const total = filtered.length

  // 分页
  const paged = filtered.slice(offset, offset + limit)

  return { success: true, data: paged, total }
}

/**
 * 获取指定日期的记录
 * @param {Date|string} date - 日期
 * @returns {Object} { success: boolean, data: Array }
 */
const getRecordsByDate = (date) => {
  const targetDate = date instanceof Date ? date : new Date(date)
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  return queryRecords({
    startDate: startOfDay.getTime(),
    endDate: endOfDay.getTime(),
    limit: 1000
  })
}

/**
 * 获取日期范围内的记录
 * @param {Date|number} start - 开始日期
 * @param {Date|number} end - 结束日期
 * @returns {Object} { success: boolean, data: Array, total: number }
 */
const getRecordsByDateRange = (start, end) => {
  const startTime = start instanceof Date ? start.getTime() : start
  const endTime = end instanceof Date ? end.getTime() : end

  return queryRecords({
    startDate: startTime,
    endDate: endTime,
    limit: 10000
  })
}

/**
 * 清除所有记录
 * @returns {Object} { success: boolean }
 */
const clearRecords = () => {
  initialize()

  records.value = []
  safeLocalStorageRemove(FOCUS_STORAGE_KEYS.RECORDS)

  return { success: true }
}

/**
 * 获取所有记录
 * @returns {Array} 所有记录
 */
const getAllRecords = () => {
  initialize()
  return [...records.value]
}

/**
 * 导入记录
 * @param {Array} importedRecords - 要导入的记录
 * @param {Object} options - 导入选项
 * @param {boolean} options.merge - 是否合并（true）或替换（false）
 * @returns {Object} { success: boolean, imported: number, skipped: number }
 */
const importRecords = (importedRecords, options = {}) => {
  initialize()

  const { merge = true } = options

  if (!Array.isArray(importedRecords)) {
    return { success: false, error: 'Invalid records format' }
  }

  let imported = 0
  let skipped = 0

  if (!merge) {
    records.value = []
  }

  const existingIds = new Set(records.value.map((r) => r.id))

  for (const record of importedRecords) {
    if (!record || typeof record !== 'object') {
      skipped++
      continue
    }

    // 如果是合并模式且 ID 已存在，跳过
    if (merge && record.id && existingIds.has(record.id)) {
      skipped++
      continue
    }

    const newRecord = {
      id: record.id || generateId(),
      mode: record.mode || FocusMode.FOCUS,
      startTime: record.startTime || Date.now(),
      endTime: record.endTime || Date.now(),
      duration: record.duration || 0,
      elapsed: record.elapsed || 0,
      completionType: record.completionType || CompletionType.COMPLETED
    }

    records.value.push(newRecord)
    existingIds.add(newRecord.id)
    imported++
  }

  persistRecords()

  return { success: true, imported, skipped }
}

/**
 * Vue Composable
 */
export const useRecords = () => {
  initialize()

  return {
    // 只读状态
    records: readonly(records),

    // CRUD 操作
    addRecord,
    getRecord,
    updateRecord,
    deleteRecord,

    // 查询方法
    queryRecords,
    getRecordsByDate,
    getRecordsByDateRange,
    getAllRecords,

    // 批量操作
    clearRecords,
    importRecords
  }
}

// 导出内部函数供测试使用
export const _internal = {
  initialize,
  persistRecords,
  generateId,
  resetForTesting: () => {
    records.value = []
    initialized = false
  }
}
