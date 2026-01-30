/**
 * 番茄钟系统统一入口 (Facade)
 *
 * 整合 useSession、useRecords、useStats 提供统一 API
 */

import { useSession, _internal as sessionInternal } from './focus/useSession.js'
import { useRecords, _internal as recordsInternal } from './focus/useRecords.js'
import { useStats } from './focus/useStats.js'
import {
  exportToJSON,
  exportToCSV,
  exportToMarkdown,
  exportAndDownload
} from '../utils/exportUtils.js'
import { ExportFormat } from './focus/constants.js'

// 重新导出常量
export {
  FocusState,
  FocusMode,
  CompletionType,
  DEFAULT_SETTINGS,
  ExportFormat
} from './focus/constants.js'

/**
 * 番茄钟系统主入口
 *
 * @example
 * ```js
 * const {
 *   // 状态
 *   state, mode, elapsed, remaining, progress,
 *   isRunning, isPaused, isIdle,
 *
 *   // 操作
 *   start, pause, resume, cancel, skip,
 *
 *   // 设置
 *   settings, updateSettings,
 *
 *   // 统计
 *   todayStats, weekStats, getHeatmapData,
 *
 *   // 记录
 *   records, queryRecords, clearRecords,
 *
 *   // 导出
 *   exportData
 * } = useFocus()
 * ```
 */
export const useFocus = () => {
  // 获取各模块实例
  const session = useSession()
  const recordsModule = useRecords()
  const stats = useStats()

  /**
   * 导出数据
   * @param {string} format - 导出格式 (json/csv/markdown)
   * @param {Object} options - 导出选项
   * @param {boolean} options.download - 是否下载文件，默认 true
   * @param {boolean} options.includeStats - 是否包含统计（JSON/Markdown），默认 true
   * @param {boolean} options.includeSettings - 是否包含设置（JSON），默认 false
   * @returns {Object} { success: boolean, content?: string, filename?: string, error?: string }
   */
  const exportData = (format = ExportFormat.JSON, options = {}) => {
    const { download = true, includeStats = true, includeSettings = false } = options

    try {
      const allRecords = recordsModule.getAllRecords()

      const exportOptions = {}

      if (includeStats) {
        exportOptions.stats = stats.allTimeStats.value
      }

      if (includeSettings) {
        exportOptions.settings = session.settings.value
      }

      if (download) {
        const result = exportAndDownload(allRecords, format, exportOptions)
        return { success: true, filename: result.filename }
      }

      // 仅返回内容，不下载
      let content
      switch (format) {
        case ExportFormat.JSON:
          content = exportToJSON(allRecords, exportOptions)
          break
        case ExportFormat.CSV:
          content = exportToCSV(allRecords)
          break
        case ExportFormat.MARKDOWN:
          content = exportToMarkdown(allRecords, exportOptions)
          break
        default:
          return { success: false, error: `Unsupported format: ${format}` }
      }

      return { success: true, content }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 导入数据
   * @param {string|Object} data - JSON 字符串或对象
   * @param {Object} options - 导入选项
   * @param {boolean} options.merge - 是否合并（true）或替换（false）
   * @returns {Object} { success: boolean, imported?: number, skipped?: number, error?: string }
   */
  const importData = (data, options = {}) => {
    try {
      let parsed = data

      if (typeof data === 'string') {
        parsed = JSON.parse(data)
      }

      // 支持导出格式（带 records 字段）和纯数组
      const records = Array.isArray(parsed) ? parsed : parsed.records

      if (!records) {
        return { success: false, error: 'No records found in import data' }
      }

      return recordsModule.importRecords(records, options)
    } catch (error) {
      return { success: false, error: `Import failed: ${error.message}` }
    }
  }

  return {
    // ============ 会话状态 ============
    state: session.state,
    mode: session.mode,
    sessionCount: session.sessionCount,

    // 计时器状态
    elapsed: session.elapsed,
    remaining: session.remaining,
    progress: session.progress,
    duration: session.duration,

    // 状态判断
    isRunning: session.isRunning,
    isPaused: session.isPaused,
    isIdle: session.isIdle,

    // ============ 会话操作 ============
    start: session.start,
    pause: session.pause,
    resume: session.resume,
    cancel: session.cancel,
    skip: session.skip,
    setMode: session.setMode,

    // ============ 设置 ============
    settings: session.settings,
    updateSettings: session.updateSettings,
    resetSessionCount: session.resetSessionCount,

    // ============ 中断恢复 ============
    checkInterruptedSession: session.checkInterruptedSession,
    resumeInterruptedSession: session.resumeInterruptedSession,
    discardInterruptedSession: session.discardInterruptedSession,

    // ============ 通知 ============
    requestNotificationPermission: session.requestNotificationPermission,

    // ============ 记录 ============
    records: recordsModule.records,
    queryRecords: recordsModule.queryRecords,
    getRecordsByDate: recordsModule.getRecordsByDate,
    getRecordsByDateRange: recordsModule.getRecordsByDateRange,
    getAllRecords: recordsModule.getAllRecords,
    clearRecords: recordsModule.clearRecords,

    // ============ 统计 ============
    allTimeStats: stats.allTimeStats,
    todayStats: stats.todayStats,
    weekStats: stats.weekStats,
    monthStats: stats.monthStats,
    getHeatmapData: stats.getHeatmapData,
    getDailyTrend: stats.getDailyTrend,
    getHourlyDistribution: stats.getHourlyDistribution,
    getStatsByDateRange: stats.getStatsByDateRange,

    // ============ 数据导入导出 ============
    exportData,
    importData
  }
}

// 导出内部函数供测试使用
export const _internal = {
  resetForTesting: () => {
    sessionInternal.resetForTesting()
    recordsInternal.resetForTesting()
  }
}

// 默认导出
export default useFocus
