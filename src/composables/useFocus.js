/**
 * 番茄钟系统统一入口 (Facade)
 *
 * 整合 useSession、useRecords、useStats 提供统一 API
 */

import { watch } from 'vue'
import { useSession, _internal as sessionInternal } from './focus/useSession.js'
import { useRecords, _internal as recordsInternal } from './focus/useRecords.js'
import { useStats } from './focus/useStats.js'
import {
  exportToJSON,
  exportToCSV,
  exportToMarkdown,
  exportAndDownload
} from '../utils/exportUtils.js'
import { ExportFormat, FocusState, FocusMode } from './focus/constants.js'
import { focusEventBus } from './focus/eventBus.js'
import { useHooks } from './hooks/useHooks.js'

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
// 事件总线集成：标记显式操作，避免 watcher 重复触发
let explicitTransition = false
let prevMode = null
let eventBusInitialized = false

export const useFocus = () => {
  // 获取各模块实例
  const session = useSession()
  const recordsModule = useRecords()
  const stats = useStats()

  // 初始化事件总线（仅一次）
  if (!eventBusInitialized) {
    eventBusInitialized = true

    // 初始化 hook 系统（确保 providers 已注册并订阅 eventBus）
    useHooks()

    // 检测 handleComplete（内部完成，不经过 facade 的操作方法）
    watch(session.state, (newState, oldState) => {
      if (explicitTransition) return
      // RUNNING → IDLE 表示自动完成
      if (oldState === FocusState.RUNNING && newState === FocusState.IDLE) {
        focusEventBus.emit('transition', {
          action: 'complete',
          mode: prevMode || FocusMode.FOCUS,
          completionType: 'completed'
        })
      }
    })

    // 记录当前 mode 用于 complete 事件
    watch(
      session.mode,
      (newMode, oldMode) => {
        if (oldMode) prevMode = oldMode
      },
      { immediate: true }
    )

    // tick 事件
    watch(session.elapsed, (val) => {
      if (session.state.value !== FocusState.RUNNING) return
      focusEventBus.emit('tick', {
        action: 'tick',
        mode: session.mode.value,
        elapsed: val,
        duration: session.duration.value
      })
    })
  }

  // 包装 session 方法，成功后发出事件
  const start = () => {
    const result = session.start()
    if (result.success) {
      focusEventBus.emit('transition', {
        action: 'start',
        mode: session.mode.value
      })
    }
    return result
  }

  const pause = () => {
    const result = session.pause()
    if (result.success) {
      focusEventBus.emit('transition', {
        action: 'pause',
        mode: session.mode.value
      })
    }
    return result
  }

  const resume = () => {
    const result = session.resume()
    if (result.success) {
      focusEventBus.emit('transition', {
        action: 'resume',
        mode: session.mode.value
      })
    }
    return result
  }

  const cancel = () => {
    const currentMode = session.mode.value
    explicitTransition = true
    const result = session.cancel()
    explicitTransition = false
    if (result.success) {
      focusEventBus.emit('transition', {
        action: 'cancel',
        mode: currentMode,
        completionType: 'cancelled'
      })
    }
    return result
  }

  const skip = () => {
    const currentMode = session.mode.value
    explicitTransition = true
    const result = session.skip()
    explicitTransition = false
    if (result.success) {
      focusEventBus.emit('transition', {
        action: 'skip',
        mode: currentMode,
        completionType: 'skipped'
      })
    }
    return result
  }

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
    start,
    pause,
    resume,
    cancel,
    skip,
    setMode: session.setMode,

    // ============ 设置 ============
    settings: session.settings,
    updateSettings: session.updateSettings,
    resetSessionCount: session.resetSessionCount,

    // ============ 中断恢复 ============
    checkInterruptedSession: session.checkInterruptedSession,
    resumeInterruptedSession: session.resumeInterruptedSession,
    discardInterruptedSession: session.discardInterruptedSession,

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
    explicitTransition = false
    prevMode = null
    eventBusInitialized = false
    focusEventBus.clear()
  }
}

// 默认导出
export default useFocus
