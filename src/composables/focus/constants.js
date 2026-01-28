/**
 * Focus 番茄钟系统常量定义
 */

/**
 * 番茄钟状态枚举
 */
export const FocusState = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused'
}

/**
 * 番茄钟模式枚举
 */
export const FocusMode = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
}

/**
 * 记录完成类型
 */
export const CompletionType = {
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  INTERRUPTED: 'interrupted'
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS = {
  focusDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  notificationEnabled: true,
  notificationSound: true
}

/**
 * 存储键名
 */
export const FOCUS_STORAGE_KEYS = {
  RECORDS: 'swm_focus_records',
  SETTINGS: 'swm_focus_settings',
  CURRENT: 'swm_focus_current'
}

/**
 * 记录查询默认参数
 */
export const QUERY_DEFAULTS = {
  limit: 100,
  offset: 0
}

/**
 * 导出格式
 */
export const ExportFormat = {
  JSON: 'json',
  CSV: 'csv',
  MARKDOWN: 'markdown'
}
