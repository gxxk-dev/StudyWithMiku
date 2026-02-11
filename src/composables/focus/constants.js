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
  INTERRUPTED: 'interrupted',
  DISABLED: 'disabled'
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

/**
 * 同步协议版本
 */
export const SYNC_PROTOCOL = {
  /** 当前协议版本 */
  VERSION: 1,
  /** 最低支持版本 */
  MIN_SUPPORTED: 1
}

/**
 * 同步存储键名
 */
export const SYNC_STORAGE_KEYS = {
  QUEUE: 'swm_sync_queue',
  VERSION: 'swm_sync_version_focus_records',
  PROTOCOL: 'swm_sync_protocol',
  LAST_SYNC: 'swm_sync_last_time'
}
