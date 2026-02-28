/**
 * 钩子引擎 — 纯函数模块
 * 负责钩子匹配、事件映射和 provider 调度
 */

import { FocusMode } from '../focus/constants.js'
import { HookTrigger } from './constants.js'
import { providerRegistry } from './providerRegistry.js'

/**
 * 将 focus 事件映射为 HookTrigger
 * @param {string} action - 事件动作 (start/pause/resume/cancel/skip/complete/tick)
 * @param {string} mode - 番茄钟模式 (focus/shortBreak/longBreak)
 * @returns {string|null} HookTrigger 值
 */
export const mapTransitionToTrigger = (action, mode) => {
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

    if (trigger === HookTrigger.FOCUS_TICK || trigger === HookTrigger.BREAK_TICK) {
      const interval = hook.tickInterval || 0
      if (interval <= 0) return false
      const elapsed = context.elapsed || 0
      if (elapsed === 0 || elapsed % interval !== 0) return false
    }

    return true
  })
}

/**
 * 将匹配的钩子分发到对应的 provider 执行
 * @param {Array} matchedHooks - 匹配的钩子列表
 * @param {Object} context - 事件上下文
 */
export const dispatchToProviders = (matchedHooks, context) => {
  matchedHooks.forEach((hook) => {
    const provider = providerRegistry.get(hook.provider)
    if (!provider) return
    if (provider.isAvailable && !provider.isAvailable()) return

    try {
      provider.execute(hook, context)
    } catch (err) {
      console.error(`[hookEngine] provider "${hook.provider}" 执行失败:`, hook.name, err)
    }
  })
}
