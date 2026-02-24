/**
 * 钩子引擎 — 纯函数模块
 * 负责钩子匹配、事件映射和动作执行
 */

import { FocusMode } from '../focus/constants.js'
import { HookTrigger, HookActionType, CoyoteChannel } from './constants.js'

/**
 * 将 focus 事件映射为 HookTrigger
 * @param {string} action - 事件动作 (start/pause/resume/cancel/skip/complete/tick)
 * @param {string} mode - 番茄钟模式 (focus/shortBreak/longBreak)
 * @param {string} [completionType] - 完成类型
 * @returns {string|null} HookTrigger 值
 */
export const mapTransitionToTrigger = (action, mode, _completionType) => {
  const isFocus = mode === FocusMode.FOCUS
  const isBreak = mode === FocusMode.SHORT_BREAK || mode === FocusMode.LONG_BREAK

  switch (action) {
    case 'start':
      return isFocus ? HookTrigger.FOCUS_START : HookTrigger.BREAK_START
    case 'pause':
      return isFocus ? HookTrigger.FOCUS_PAUSE : null
    case 'resume':
      return isFocus ? HookTrigger.FOCUS_RESUME : null
    case 'complete':
      if (isFocus) return HookTrigger.FOCUS_COMPLETED
      if (isBreak) return HookTrigger.BREAK_COMPLETED
      return null
    case 'cancel':
      if (isFocus) return HookTrigger.FOCUS_CANCELLED
      if (isBreak) return HookTrigger.BREAK_CANCELLED
      return null
    case 'skip':
      if (isFocus) return HookTrigger.FOCUS_SKIPPED
      if (isBreak) return HookTrigger.BREAK_SKIPPED
      return null
    case 'tick':
      return isFocus ? HookTrigger.FOCUS_TICK : HookTrigger.BREAK_TICK
    default:
      return null
  }
}

/**
 * 评估钩子列表，返回匹配的钩子
 * @param {Array} hooks - 钩子列表
 * @param {string} trigger - HookTrigger 值
 * @param {Object} context - 上下文 { elapsed, duration }
 * @returns {Array} 匹配的钩子列表
 */
export const evaluateHooks = (hooks, trigger, context = {}) => {
  if (!hooks || !trigger) return []

  return hooks.filter((hook) => {
    if (!hook.enabled) return false
    if (hook.trigger !== trigger) return false

    // tick 类型：检查间隔条件
    if (trigger === HookTrigger.FOCUS_TICK || trigger === HookTrigger.BREAK_TICK) {
      const interval = hook.tickInterval || 0
      if (interval <= 0) return false
      const elapsed = context.elapsed || 0
      // 仅在整数倍时触发
      if (elapsed === 0 || elapsed % interval !== 0) return false
    }

    return true
  })
}

/**
 * 执行钩子动作
 * @param {Object} hook - 钩子对象
 * @param {Object} service - coyoteService 实例
 * @param {number} maxStrength - 最大强度上限
 */
export const executeAction = (hook, service, maxStrength) => {
  const action = hook.action
  if (!action) return

  const channels =
    action.channel === 'both'
      ? [CoyoteChannel.A, CoyoteChannel.B]
      : [action.channel || CoyoteChannel.A]

  const value = Math.max(0, Math.min(action.value || 0, maxStrength))

  switch (action.type) {
    case HookActionType.STRENGTH_SET:
      channels.forEach((ch) => service.setStrength(ch, value, maxStrength))
      break

    case HookActionType.STRENGTH_INCREASE:
      channels.forEach((ch) => service.increaseStrength(ch, value, maxStrength))
      break

    case HookActionType.STRENGTH_DECREASE:
      channels.forEach((ch) => service.decreaseStrength(ch, value, maxStrength))
      break

    case HookActionType.PULSE:
      if (action.patterns && action.patterns.length > 0) {
        channels.forEach((ch) => service.sendPulse(ch, action.patterns))
      }
      break

    case HookActionType.CLEAR:
      channels.forEach((ch) => service.clearChannel(ch))
      break
  }
}
