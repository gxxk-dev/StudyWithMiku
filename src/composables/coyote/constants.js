/**
 * DG-Lab 郊狼电刺激设备常量定义
 */

/**
 * 连接状态枚举
 */
export const CoyoteConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  WAITING_BIND: 'waitingBind',
  BOUND: 'bound',
  ERROR: 'error'
}

/**
 * 通道枚举
 */
export const CoyoteChannel = {
  A: 'A',
  B: 'B'
}

/**
 * 强度操作模式（协议定义）
 */
export const StrengthMode = {
  DECREASE: 0,
  INCREASE: 1,
  SET: 2
}

/**
 * 钩子触发事件
 */
export const HookTrigger = {
  FOCUS_START: 'focus_start',
  FOCUS_PAUSE: 'focus_pause',
  FOCUS_RESUME: 'focus_resume',
  FOCUS_COMPLETED: 'focus_completed',
  FOCUS_CANCELLED: 'focus_cancelled',
  FOCUS_SKIPPED: 'focus_skipped',
  BREAK_START: 'break_start',
  BREAK_COMPLETED: 'break_completed',
  BREAK_CANCELLED: 'break_cancelled',
  BREAK_SKIPPED: 'break_skipped',
  FOCUS_TICK: 'focus_tick',
  BREAK_TICK: 'break_tick'
}

/**
 * 钩子动作类型
 */
export const HookActionType = {
  STRENGTH_SET: 'strength_set',
  STRENGTH_INCREASE: 'strength_increase',
  STRENGTH_DECREASE: 'strength_decrease',
  PULSE: 'pulse',
  CLEAR: 'clear'
}

/**
 * 默认设置
 */
export const COYOTE_DEFAULTS = {
  enabled: false,
  serverUrl: 'wss://ws.dungeon-lab.cn/',
  maxStrength: 100,
  hooks: []
}

/**
 * 存储键名
 */
export const COYOTE_STORAGE_KEYS = {
  SETTINGS: 'swm_coyote_settings',
  HOOKS: 'swm_coyote_hooks',
  UNLOCKED: 'swm_coyote_unlocked',
  CONFIRMED: 'swm_coyote_confirmed'
}
