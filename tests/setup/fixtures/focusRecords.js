/**
 * Focus 记录测试数据工厂
 */

import { FocusMode, CompletionType } from '@/composables/focus/constants.js'

/**
 * 创建单条 Focus 记录
 * @param {Object} overrides - 覆盖默认值的字段
 * @returns {Object} Focus 记录
 */
export const createFocusRecord = (overrides = {}) => {
  const now = Date.now()
  const duration = overrides.duration || 25 * 60
  const elapsed = overrides.elapsed ?? duration

  return {
    id: `focus-${now}-${Math.random().toString(36).substr(2, 9)}`,
    mode: FocusMode.FOCUS,
    startTime: now - elapsed * 1000,
    endTime: now,
    duration,
    elapsed,
    completionType: CompletionType.COMPLETED,
    ...overrides
  }
}

/**
 * 创建休息记录
 * @param {Object} overrides - 覆盖默认值的字段
 * @returns {Object} 休息记录
 */
export const createBreakRecord = (overrides = {}) => {
  return createFocusRecord({
    mode: FocusMode.SHORT_BREAK,
    duration: 5 * 60,
    elapsed: 5 * 60,
    ...overrides
  })
}

/**
 * 创建长休息记录
 * @param {Object} overrides - 覆盖默认值的字段
 * @returns {Object} 长休息记录
 */
export const createLongBreakRecord = (overrides = {}) => {
  return createFocusRecord({
    mode: FocusMode.LONG_BREAK,
    duration: 15 * 60,
    elapsed: 15 * 60,
    ...overrides
  })
}

/**
 * 批量创建 Focus 记录
 * @param {number} count - 记录数量
 * @param {Object} template - 模板覆盖
 * @returns {Array} 记录数组
 */
export const createFocusRecords = (count, template = {}) => {
  const records = []
  const baseTime = Date.now()

  for (let i = 0; i < count; i++) {
    const duration = template.duration || 25 * 60
    const startTime = baseTime - (count - i) * (duration + 300) * 1000

    records.push(
      createFocusRecord({
        startTime,
        endTime: startTime + duration * 1000,
        ...template
      })
    )
  }

  return records
}

/**
 * 创建指定日期的记录
 * @param {Date|string} date - 日期
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object} Focus 记录
 */
export const createRecordForDate = (date, overrides = {}) => {
  const targetDate = date instanceof Date ? date : new Date(date)
  targetDate.setHours(10, 0, 0, 0)

  const duration = overrides.duration || 25 * 60
  const startTime = targetDate.getTime()

  return createFocusRecord({
    startTime,
    endTime: startTime + duration * 1000,
    ...overrides
  })
}

/**
 * 创建一周的记录
 * @param {Object} options - 配置选项
 * @param {number} options.recordsPerDay - 每天记录数
 * @param {Date} options.startDate - 起始日期
 * @returns {Array} 记录数组
 */
export const createWeekRecords = (options = {}) => {
  const { recordsPerDay = 4, startDate = new Date() } = options

  const records = []
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)

  for (let day = 0; day < 7; day++) {
    const date = new Date(start)
    date.setDate(start.getDate() + day)

    for (let i = 0; i < recordsPerDay; i++) {
      const hour = 9 + i * 2
      date.setHours(hour, 0, 0, 0)

      records.push(
        createFocusRecord({
          startTime: date.getTime(),
          endTime: date.getTime() + 25 * 60 * 1000
        })
      )
    }
  }

  return records
}

/**
 * 创建混合类型记录
 * @param {number} count - 记录数量
 * @returns {Array} 记录数组
 */
export const createMixedRecords = (count) => {
  const records = []
  const completionTypes = [
    CompletionType.COMPLETED,
    CompletionType.CANCELLED,
    CompletionType.SKIPPED,
    CompletionType.INTERRUPTED
  ]

  for (let i = 0; i < count; i++) {
    const isFocus = i % 3 !== 0
    const completionType = completionTypes[i % completionTypes.length]

    if (isFocus) {
      records.push(
        createFocusRecord({
          completionType,
          elapsed:
            completionType === CompletionType.COMPLETED
              ? 25 * 60
              : Math.floor(Math.random() * 25 * 60)
        })
      )
    } else {
      records.push(
        createBreakRecord({
          completionType,
          elapsed:
            completionType === CompletionType.COMPLETED
              ? 5 * 60
              : Math.floor(Math.random() * 5 * 60)
        })
      )
    }
  }

  return records
}

/**
 * 创建运行时状态快照
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object} 运行时状态
 */
export const createCurrentState = (overrides = {}) => {
  const now = Date.now()
  const elapsed = overrides.elapsed || 10 * 60

  return {
    mode: FocusMode.FOCUS,
    state: 'running',
    duration: 25 * 60,
    elapsed,
    startTime: now - elapsed * 1000,
    startTimestamp: now - elapsed * 1000,
    pausedElapsed: 0,
    sessionCount: 1,
    ...overrides
  }
}

/**
 * 示例记录集
 */
export const sampleRecords = [
  createFocusRecord({
    id: 'sample-1',
    mode: FocusMode.FOCUS,
    duration: 25 * 60,
    elapsed: 25 * 60,
    completionType: CompletionType.COMPLETED
  }),
  createFocusRecord({
    id: 'sample-2',
    mode: FocusMode.SHORT_BREAK,
    duration: 5 * 60,
    elapsed: 5 * 60,
    completionType: CompletionType.COMPLETED
  }),
  createFocusRecord({
    id: 'sample-3',
    mode: FocusMode.FOCUS,
    duration: 25 * 60,
    elapsed: 15 * 60,
    completionType: CompletionType.CANCELLED
  }),
  createFocusRecord({
    id: 'sample-4',
    mode: FocusMode.FOCUS,
    duration: 25 * 60,
    elapsed: 25 * 60,
    completionType: CompletionType.SKIPPED
  })
]
