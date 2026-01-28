/**
 * useStats 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CompletionType } from '@/composables/focus/constants.js'
import {
  createFocusRecord,
  createBreakRecord,
  createRecordForDate,
  createMixedRecords
} from '../../../setup/fixtures/focusRecords.js'

// 辅助函数：格式化本地日期为 YYYY-MM-DD
const formatLocalDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('useStats', () => {
  let useStats, useRecords, recordsInternal

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()

    const recordsModule = await import('@/composables/focus/useRecords.js')
    useRecords = recordsModule.useRecords
    recordsInternal = recordsModule._internal
    recordsInternal.resetForTesting()

    const statsModule = await import('@/composables/focus/useStats.js')
    useStats = statsModule.useStats
  })

  describe('calculateStats', () => {
    it('空记录应该返回零值', () => {
      const { calculateStats } = useStats()

      const result = calculateStats([])

      expect(result.totalSessions).toBe(0)
      expect(result.completedSessions).toBe(0)
      expect(result.totalFocusTime).toBe(0)
      expect(result.completionRate).toBe(0)
    })

    it('应该正确计算完成的会话', () => {
      const { calculateStats } = useStats()

      const records = [
        createFocusRecord({ elapsed: 25 * 60, completionType: CompletionType.COMPLETED }),
        createFocusRecord({ elapsed: 25 * 60, completionType: CompletionType.COMPLETED }),
        createFocusRecord({ elapsed: 10 * 60, completionType: CompletionType.CANCELLED })
      ]

      const result = calculateStats(records)

      expect(result.totalSessions).toBe(3)
      expect(result.completedSessions).toBe(2)
      expect(result.cancelledSessions).toBe(1)
    })

    it('应该正确计算总专注时间', () => {
      const { calculateStats } = useStats()

      const records = [
        createFocusRecord({ elapsed: 25 * 60 }),
        createFocusRecord({ elapsed: 20 * 60 }),
        createBreakRecord({ elapsed: 5 * 60 })
      ]

      const result = calculateStats(records)

      expect(result.totalFocusTime).toBe(45 * 60)
      expect(result.totalBreakTime).toBe(5 * 60)
    })

    it('应该正确计算完成率', () => {
      const { calculateStats } = useStats()

      const records = [
        createFocusRecord({ completionType: CompletionType.COMPLETED }),
        createFocusRecord({ completionType: CompletionType.COMPLETED }),
        createFocusRecord({ completionType: CompletionType.CANCELLED }),
        createFocusRecord({ completionType: CompletionType.CANCELLED })
      ]

      const result = calculateStats(records)

      expect(result.completionRate).toBe(50)
    })

    it('应该正确计算平均专注时间', () => {
      const { calculateStats } = useStats()

      const records = [
        createFocusRecord({ elapsed: 20 * 60, completionType: CompletionType.COMPLETED }),
        createFocusRecord({ elapsed: 30 * 60, completionType: CompletionType.COMPLETED })
      ]

      const result = calculateStats(records)

      expect(result.averageFocusTime).toBe(25 * 60)
    })

    it('应该正确计算最长连续完成', () => {
      const { calculateStats } = useStats()

      const now = Date.now()
      const records = [
        createFocusRecord({ startTime: now - 5000, completionType: CompletionType.COMPLETED }),
        createFocusRecord({ startTime: now - 4000, completionType: CompletionType.COMPLETED }),
        createFocusRecord({ startTime: now - 3000, completionType: CompletionType.COMPLETED }),
        createFocusRecord({ startTime: now - 2000, completionType: CompletionType.CANCELLED }),
        createFocusRecord({ startTime: now - 1000, completionType: CompletionType.COMPLETED })
      ]

      const result = calculateStats(records)

      expect(result.longestStreak).toBe(3)
    })
  })

  describe('todayStats', () => {
    it('应该只统计今天的记录', () => {
      const { addRecord } = useRecords()

      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      addRecord(createRecordForDate(today, { completionType: CompletionType.COMPLETED }))
      addRecord(createRecordForDate(today, { completionType: CompletionType.COMPLETED }))
      addRecord(createRecordForDate(yesterday, { completionType: CompletionType.COMPLETED }))

      const { todayStats } = useStats()

      expect(todayStats.value.totalSessions).toBe(2)
    })
  })

  describe('weekStats', () => {
    it('应该统计本周的记录', () => {
      const { addRecord } = useRecords()

      // 计算本周已过天数（从周一开始）
      const today = new Date()
      const dayOfWeek = today.getDay()
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const daysInWeekSoFar = daysSinceMonday + 1

      // 添加本周每天 2 条记录
      for (let i = 0; i < daysInWeekSoFar; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        addRecord(createRecordForDate(date, { completionType: CompletionType.COMPLETED }))
        addRecord(createRecordForDate(date, { completionType: CompletionType.COMPLETED }))
      }

      const { weekStats } = useStats()

      // 本周到今天的天数 * 2
      expect(weekStats.value.totalSessions).toBe(daysInWeekSoFar * 2)
    })
  })

  describe('getHeatmapData', () => {
    it('应该返回正确天数的数据', () => {
      const { getHeatmapData } = useStats()

      const data = getHeatmapData({ days: 30 })

      expect(data).toHaveLength(30)
    })

    it('应该包含日期和计数', () => {
      const { addRecord } = useRecords()

      const today = new Date()
      addRecord(createRecordForDate(today, { completionType: CompletionType.COMPLETED }))
      addRecord(createRecordForDate(today, { completionType: CompletionType.COMPLETED }))

      const { getHeatmapData } = useStats()
      const data = getHeatmapData({ days: 7 })

      const todayData = data.find((d) => d.date === formatLocalDate(today))

      expect(todayData).toBeDefined()
      expect(todayData.count).toBe(2)
    })

    it('应该计算正确的热力图等级', () => {
      const { addRecord } = useRecords()

      const today = new Date()
      // 添加 7 条记录，应该是等级 4
      for (let i = 0; i < 7; i++) {
        addRecord(createRecordForDate(today, { completionType: CompletionType.COMPLETED }))
      }

      const { getHeatmapData } = useStats()
      const data = getHeatmapData({ days: 7 })

      const todayData = data.find((d) => d.date === formatLocalDate(today))

      expect(todayData.level).toBe(4)
    })

    it('只统计完成的专注记录', () => {
      const { addRecord } = useRecords()

      const today = new Date()
      addRecord(createRecordForDate(today, { completionType: CompletionType.COMPLETED }))
      addRecord(createRecordForDate(today, { completionType: CompletionType.CANCELLED }))
      addRecord(createBreakRecord({ startTime: today.getTime() }))

      const { getHeatmapData } = useStats()
      const data = getHeatmapData({ days: 7 })

      const todayData = data.find((d) => d.date === formatLocalDate(today))

      expect(todayData.count).toBe(1)
    })
  })

  describe('getDailyTrend', () => {
    it('应该返回每日趋势数据', () => {
      const { getDailyTrend } = useStats()

      const data = getDailyTrend({ days: 7 })

      expect(data).toHaveLength(7)
      expect(data[0]).toHaveProperty('date')
      expect(data[0]).toHaveProperty('focusSessions')
      expect(data[0]).toHaveProperty('completedSessions')
      expect(data[0]).toHaveProperty('focusTime')
    })

    it('应该正确统计每天的数据', () => {
      const { addRecord } = useRecords()

      const today = new Date()
      addRecord(
        createRecordForDate(today, { elapsed: 25 * 60, completionType: CompletionType.COMPLETED })
      )
      addRecord(
        createRecordForDate(today, { elapsed: 20 * 60, completionType: CompletionType.CANCELLED })
      )

      const { getDailyTrend } = useStats()
      const data = getDailyTrend({ days: 7 })

      const todayData = data.find((d) => d.date === formatLocalDate(today))

      expect(todayData.focusSessions).toBe(2)
      expect(todayData.completedSessions).toBe(1)
      expect(todayData.focusTime).toBe(45 * 60)
    })
  })

  describe('getHourlyDistribution', () => {
    it('应该返回 24 小时的分布', () => {
      const { getHourlyDistribution } = useStats()

      const data = getHourlyDistribution()

      expect(data).toHaveLength(24)
      expect(data[0].hour).toBe(0)
      expect(data[23].hour).toBe(23)
    })

    it('应该正确统计每小时的数据', () => {
      const { addRecord } = useRecords()

      const today = new Date()
      today.setHours(10, 0, 0, 0)

      addRecord(
        createFocusRecord({ startTime: today.getTime(), completionType: CompletionType.COMPLETED })
      )
      addRecord(
        createFocusRecord({ startTime: today.getTime(), completionType: CompletionType.COMPLETED })
      )

      const { getHourlyDistribution } = useStats()
      const data = getHourlyDistribution()

      expect(data[10].sessions).toBe(2)
      expect(data[10].completedSessions).toBe(2)
    })
  })

  describe('getStatsByDateRange', () => {
    it('应该返回指定日期范围的统计', () => {
      const { addRecord } = useRecords()

      const today = new Date()
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const fiveDaysAgo = new Date(today)
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

      addRecord(createRecordForDate(today))
      addRecord(createRecordForDate(threeDaysAgo))
      addRecord(createRecordForDate(fiveDaysAgo))

      const { getStatsByDateRange } = useStats()

      // 只查询最近 4 天
      const fourDaysAgo = new Date(today)
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)

      const result = getStatsByDateRange(fourDaysAgo, today)

      expect(result.totalSessions).toBe(2)
    })
  })

  describe('allTimeStats', () => {
    it('应该统计所有记录', () => {
      const { addRecord } = useRecords()

      const records = createMixedRecords(10)
      records.forEach((record) => addRecord(record))

      const { allTimeStats } = useStats()

      expect(allTimeStats.value.totalSessions).toBeGreaterThan(0)
    })
  })
})
