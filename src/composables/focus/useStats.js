/**
 * Focus 统计计算
 * 提供番茄钟统计数据和热力图数据
 */

import { computed } from 'vue'
import { useRecords } from './useRecords.js'
import { FocusMode, CompletionType } from './constants.js'

/**
 * 格式化日期为 YYYY-MM-DD（本地时间）
 * @param {Date} date - 日期
 * @returns {string} 格式化的日期字符串
 */
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取日期的开始时间
 * @param {Date} date - 日期
 * @returns {Date} 当天 00:00:00
 */
const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 获取日期的结束时间
 * @param {Date} date - 日期
 * @returns {Date} 当天 23:59:59.999
 */
const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * 获取本周第一天
 * @param {Date} date - 日期
 * @returns {Date} 本周一
 */
const startOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 获取本月第一天
 * @param {Date} date - 日期
 * @returns {Date} 本月第一天
 */
const startOfMonth = (date) => {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Vue Composable
 */
export const useStats = () => {
  const { records, getRecordsByDateRange } = useRecords()

  /**
   * 计算基础统计数据
   * @param {Array} recordList - 记录列表
   * @returns {Object} 统计数据
   */
  const calculateStats = (recordList) => {
    if (!recordList || recordList.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        cancelledSessions: 0,
        skippedSessions: 0,
        interruptedSessions: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        averageFocusTime: 0,
        completionRate: 0,
        longestStreak: 0
      }
    }

    const focusRecords = recordList.filter((r) => r.mode === FocusMode.FOCUS)
    const breakRecords = recordList.filter((r) => r.mode !== FocusMode.FOCUS)

    const completed = focusRecords.filter((r) => r.completionType === CompletionType.COMPLETED)
    const cancelled = focusRecords.filter((r) => r.completionType === CompletionType.CANCELLED)
    const skipped = focusRecords.filter((r) => r.completionType === CompletionType.SKIPPED)
    const interrupted = focusRecords.filter((r) => r.completionType === CompletionType.INTERRUPTED)

    const totalFocusTime = focusRecords.reduce((sum, r) => sum + (r.elapsed || 0), 0)
    const totalBreakTime = breakRecords.reduce((sum, r) => sum + (r.elapsed || 0), 0)

    const completedFocusTime = completed.reduce((sum, r) => sum + (r.elapsed || 0), 0)
    const averageFocusTime =
      completed.length > 0 ? Math.round(completedFocusTime / completed.length) : 0

    const completionRate =
      focusRecords.length > 0 ? (completed.length / focusRecords.length) * 100 : 0

    // 计算最长连续活跃天数（GitHub 风格）
    let longestStreak = 0
    if (completed.length > 0) {
      // 提取完成记录的日期（去重）
      const activeDates = new Set()
      for (const record of completed) {
        const date = formatDate(new Date(record.startTime))
        activeDates.add(date)
      }

      // 转换为数组并排序
      const sortedDates = [...activeDates].sort()

      // 计算最长连续天数
      let currentStreak = 1
      longestStreak = 1

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1])
        const currDate = new Date(sortedDates[i])
        const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          currentStreak++
          longestStreak = Math.max(longestStreak, currentStreak)
        } else {
          currentStreak = 1
        }
      }
    }

    return {
      totalSessions: focusRecords.length,
      completedSessions: completed.length,
      cancelledSessions: cancelled.length,
      skippedSessions: skipped.length,
      interruptedSessions: interrupted.length,
      totalFocusTime,
      totalBreakTime,
      averageFocusTime,
      completionRate: Math.round(completionRate * 10) / 10,
      longestStreak
    }
  }

  /**
   * 全部统计
   */
  const allTimeStats = computed(() => {
    return calculateStats(records.value)
  })

  /**
   * 今日统计
   */
  const todayStats = computed(() => {
    const today = new Date()
    const start = startOfDay(today).getTime()
    const end = endOfDay(today).getTime()

    const todayRecords = records.value.filter((r) => r.startTime >= start && r.startTime <= end)

    return calculateStats(todayRecords)
  })

  /**
   * 本周统计
   */
  const weekStats = computed(() => {
    const today = new Date()
    const start = startOfWeek(today).getTime()
    const end = endOfDay(today).getTime()

    const weekRecords = records.value.filter((r) => r.startTime >= start && r.startTime <= end)

    return calculateStats(weekRecords)
  })

  /**
   * 本月统计
   */
  const monthStats = computed(() => {
    const today = new Date()
    const start = startOfMonth(today).getTime()
    const end = endOfDay(today).getTime()

    const monthRecords = records.value.filter((r) => r.startTime >= start && r.startTime <= end)

    return calculateStats(monthRecords)
  })

  /**
   * 获取热力图数据
   * @param {Object} options - 选项
   * @param {number} options.days - 天数，默认 365
   * @returns {Array} 热力图数据
   */
  const getHeatmapData = (options = {}) => {
    const { days = 365 } = options

    const endDate = endOfDay(new Date())
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    const result = getRecordsByDateRange(startDate, endDate)
    const recordList = result.data || []

    // 按日期分组
    const dailyData = new Map()

    for (const record of recordList) {
      if (record.mode !== FocusMode.FOCUS) continue
      if (record.completionType !== CompletionType.COMPLETED) continue

      const date = formatDate(startOfDay(new Date(record.startTime)))

      if (!dailyData.has(date)) {
        dailyData.set(date, { count: 0, totalTime: 0 })
      }

      const data = dailyData.get(date)
      data.count++
      data.totalTime += record.elapsed || 0
    }

    // 生成完整的日期序列
    const heatmapData = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dateStr = formatDate(current)
      const data = dailyData.get(dateStr) || { count: 0, totalTime: 0 }

      heatmapData.push({
        date: dateStr,
        count: data.count,
        totalTime: data.totalTime,
        level: getHeatmapLevel(data.count)
      })

      current.setDate(current.getDate() + 1)
    }

    return heatmapData
  }

  /**
   * 计算热力图等级
   * @param {number} count - 完成数
   * @returns {number} 等级 0-4
   */
  const getHeatmapLevel = (count) => {
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 4) return 2
    if (count <= 6) return 3
    return 4
  }

  /**
   * 获取每日趋势数据
   * @param {Object} options - 选项
   * @param {number} options.days - 天数，默认 30
   * @returns {Array} 趋势数据
   */
  const getDailyTrend = (options = {}) => {
    const { days = 30 } = options

    const endDate = endOfDay(new Date())
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    const result = getRecordsByDateRange(startDate, endDate)
    const recordList = result.data || []

    // 按日期分组
    const dailyData = new Map()

    for (const record of recordList) {
      const date = formatDate(startOfDay(new Date(record.startTime)))

      if (!dailyData.has(date)) {
        dailyData.set(date, {
          focusSessions: 0,
          completedSessions: 0,
          focusTime: 0,
          breakTime: 0
        })
      }

      const data = dailyData.get(date)

      if (record.mode === FocusMode.FOCUS) {
        data.focusSessions++
        data.focusTime += record.elapsed || 0
        if (record.completionType === CompletionType.COMPLETED) {
          data.completedSessions++
        }
      } else {
        data.breakTime += record.elapsed || 0
      }
    }

    // 生成完整的日期序列
    const trendData = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dateStr = formatDate(current)
      const data = dailyData.get(dateStr) || {
        focusSessions: 0,
        completedSessions: 0,
        focusTime: 0,
        breakTime: 0
      }

      trendData.push({
        date: dateStr,
        ...data
      })

      current.setDate(current.getDate() + 1)
    }

    return trendData
  }

  /**
   * 获取按小时分布
   * @param {Object} options - 选项
   * @param {number} options.days - 统计天数，默认 30
   * @returns {Array} 每小时统计
   */
  const getHourlyDistribution = (options = {}) => {
    const { days = 30 } = options

    const endDate = endOfDay(new Date())
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    const result = getRecordsByDateRange(startDate, endDate)
    const recordList = result.data || []

    // 按小时分组
    const hourlyData = Array.from({ length: 24 }, () => ({
      sessions: 0,
      completedSessions: 0,
      totalTime: 0
    }))

    for (const record of recordList) {
      if (record.mode !== FocusMode.FOCUS) continue

      const hour = new Date(record.startTime).getHours()
      hourlyData[hour].sessions++
      hourlyData[hour].totalTime += record.elapsed || 0

      if (record.completionType === CompletionType.COMPLETED) {
        hourlyData[hour].completedSessions++
      }
    }

    return hourlyData.map((data, hour) => ({
      hour,
      ...data
    }))
  }

  /**
   * 获取日期范围内的统计
   * @param {Date|number} start - 开始日期
   * @param {Date|number} end - 结束日期
   * @returns {Object} 统计数据
   */
  const getStatsByDateRange = (start, end) => {
    const result = getRecordsByDateRange(start, end)
    return calculateStats(result.data || [])
  }

  return {
    // 预定义统计
    allTimeStats,
    todayStats,
    weekStats,
    monthStats,

    // 数据查询
    getHeatmapData,
    getDailyTrend,
    getHourlyDistribution,
    getStatsByDateRange,

    // 工具函数
    calculateStats
  }
}

// 导出工具函数供外部使用
export { startOfDay, endOfDay, startOfWeek, startOfMonth }
