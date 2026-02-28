/**
 * Hook 系统常量定义
 */

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
 * 钩子 Provider 类型
 */
export const HookProvider = {
  NOTIFICATION: 'notification',
  SOUND: 'sound',
  PUSH: 'push',
  ESTIM: 'estim'
}

/**
 * 触发事件分组（UI 展示用）
 */
export const TRIGGER_GROUPS = [
  {
    label: '专注',
    triggers: [
      { value: HookTrigger.FOCUS_START, label: '专注开始' },
      { value: HookTrigger.FOCUS_PAUSE, label: '专注暂停' },
      { value: HookTrigger.FOCUS_RESUME, label: '专注恢复' },
      { value: HookTrigger.FOCUS_COMPLETED, label: '专注完成' },
      { value: HookTrigger.FOCUS_CANCELLED, label: '专注取消' },
      { value: HookTrigger.FOCUS_SKIPPED, label: '专注跳过' },
      { value: HookTrigger.FOCUS_TICK, label: '专注计时 (每 N 秒)' }
    ]
  },
  {
    label: '休息',
    triggers: [
      { value: HookTrigger.BREAK_START, label: '休息开始' },
      { value: HookTrigger.BREAK_COMPLETED, label: '休息结束' },
      { value: HookTrigger.BREAK_CANCELLED, label: '休息取消' },
      { value: HookTrigger.BREAK_SKIPPED, label: '休息跳过' },
      { value: HookTrigger.BREAK_TICK, label: '休息计时 (每 N 秒)' }
    ]
  }
]

/**
 * 存储键名
 */
export const HOOKS_STORAGE_KEYS = {
  HOOKS: 'swm_hooks',
  ESTIM_UNLOCKED: 'swm_coyote_unlocked'
}
