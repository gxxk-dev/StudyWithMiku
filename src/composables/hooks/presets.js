/**
 * 钩子预设
 * 包含 built-in 默认钩子和各 provider 的可选预设
 */

import { HookTrigger, HookProvider } from './constants.js'

/**
 * 默认 built-in hooks（首次初始化时种子）
 */
export const DEFAULT_HOOKS = [
  {
    id: '__builtin_focus_complete_notif',
    enabled: true,
    name: '专注完成通知',
    provider: HookProvider.NOTIFICATION,
    trigger: HookTrigger.FOCUS_COMPLETED,
    tickInterval: 0,
    builtIn: true,
    action: { title: '', body: '', tag: 'focus-notification' }
  },
  {
    id: '__builtin_break_complete_notif',
    enabled: true,
    name: '休息结束通知',
    provider: HookProvider.NOTIFICATION,
    trigger: HookTrigger.BREAK_COMPLETED,
    tickInterval: 0,
    builtIn: true,
    action: { title: '', body: '', tag: 'focus-notification' }
  },
  {
    id: '__builtin_focus_complete_sound',
    enabled: true,
    name: '专注完成提示音',
    provider: HookProvider.SOUND,
    trigger: HookTrigger.FOCUS_COMPLETED,
    tickInterval: 0,
    builtIn: true,
    action: { soundId: 'chime', volume: 0.7 }
  },
  {
    id: '__builtin_break_complete_sound',
    enabled: true,
    name: '休息结束提示音',
    provider: HookProvider.SOUND,
    trigger: HookTrigger.BREAK_COMPLETED,
    tickInterval: 0,
    builtIn: true,
    action: { soundId: 'ding', volume: 0.7 }
  }
]

/**
 * Estim 预设
 */
export const ESTIM_PRESETS = [
  {
    name: '暂停惩罚',
    description: '暂停专注时发送 3s 电击',
    hook: {
      name: '暂停惩罚',
      provider: HookProvider.ESTIM,
      trigger: HookTrigger.FOCUS_PAUSE,
      action: {
        type: 'pulse',
        channel: 'A',
        patterns: Array(30).fill('6464646464646464'),
        durationMs: 3000
      }
    }
  },
  {
    name: '取消惩罚',
    description: '取消专注时发送更强电击',
    hook: {
      name: '取消惩罚',
      provider: HookProvider.ESTIM,
      trigger: HookTrigger.FOCUS_CANCELLED,
      action: {
        type: 'pulse',
        channel: 'A',
        patterns: Array(50).fill('c8c8c8c864646464'),
        durationMs: 5000
      }
    }
  },
  {
    name: '完成奖励',
    description: '完成番茄钟后设置舒适强度',
    hook: {
      name: '完成奖励',
      provider: HookProvider.ESTIM,
      trigger: HookTrigger.FOCUS_COMPLETED,
      action: {
        type: 'strength_set',
        channel: 'both',
        value: 30
      }
    }
  },
  {
    name: '专注渐增',
    description: '专注期间每 5 分钟增加强度 5',
    hook: {
      name: '专注渐增',
      provider: HookProvider.ESTIM,
      trigger: HookTrigger.FOCUS_TICK,
      tickInterval: 300,
      action: {
        type: 'strength_increase',
        channel: 'A',
        value: 5
      }
    }
  }
]

/**
 * 通知/提示音预设
 */
export const GENERAL_PRESETS = [
  {
    name: '专注开始通知',
    description: '开始专注时发送桌面通知',
    hook: {
      name: '专注开始通知',
      provider: HookProvider.NOTIFICATION,
      trigger: HookTrigger.FOCUS_START,
      action: { title: '专注开始', body: '加油！保持专注' }
    }
  },
  {
    name: '休息开始提示音',
    description: '休息开始时播放提示音',
    hook: {
      name: '休息开始提示音',
      provider: HookProvider.SOUND,
      trigger: HookTrigger.BREAK_START,
      action: { soundId: 'ding', volume: 0.5 }
    }
  }
]
