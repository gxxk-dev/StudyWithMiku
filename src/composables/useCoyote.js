/**
 * DG-Lab 郊狼设备控制 composable
 *
 * 单例模式，管理设备连接、钩子调度和设置持久化
 * 不做云同步（设备设置天然本地化）
 *
 * @example
 * ```js
 * const {
 *   settings, hooks, connectionState, clientId, targetId,
 *   strengthA, strengthB,
 *   connect, disconnect, emergencyStop,
 *   updateSettings, addHook, updateHook, removeHook,
 *   applyPreset, clearAllHooks, testFire,
 *   dispatchFocusEvent
 * } = useCoyote()
 * ```
 */

import { ref, readonly } from 'vue'
import { safeLocalStorageGetJSON, safeLocalStorageSetJSON } from '../utils/storage.js'
import { COYOTE_DEFAULTS, COYOTE_STORAGE_KEYS, CoyoteConnectionState } from './coyote/constants.js'
import { coyoteService } from '../services/coyoteService.js'
import { mapTransitionToTrigger, evaluateHooks, executeAction } from './coyote/hookEngine.js'
import { PRESETS } from './coyote/presets.js'
import { focusEventBus } from './focus/eventBus.js'

// 模块级单例状态
const settings = ref({ ...COYOTE_DEFAULTS })
const hooks = ref([])

let initialized = false
let unsubTransition = null
let unsubTick = null

/**
 * 生成唯一 ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

/**
 * 从 localStorage 加载设置
 */
const initializeSettings = () => {
  const savedSettings = safeLocalStorageGetJSON(COYOTE_STORAGE_KEYS.SETTINGS, null)
  if (savedSettings) {
    settings.value = { ...COYOTE_DEFAULTS, ...savedSettings }
  }

  const savedHooks = safeLocalStorageGetJSON(COYOTE_STORAGE_KEYS.HOOKS, null)
  if (savedHooks && Array.isArray(savedHooks)) {
    hooks.value = savedHooks
  }
}

/**
 * 保存设置到 localStorage
 */
const persistSettings = () => {
  safeLocalStorageSetJSON(COYOTE_STORAGE_KEYS.SETTINGS, settings.value)
}

/**
 * 保存钩子到 localStorage
 */
const persistHooks = () => {
  safeLocalStorageSetJSON(COYOTE_STORAGE_KEYS.HOOKS, hooks.value)
}

/**
 * 核心调度：处理 focus 事件
 * @param {string} action - 事件动作
 * @param {Object} context - 上下文
 */
const dispatchFocusEvent = (action, context = {}) => {
  if (!initialized) return
  if (!settings.value.enabled) return
  if (coyoteService.connectionState.value !== CoyoteConnectionState.BOUND) return

  const trigger = mapTransitionToTrigger(action, context.mode, context.completionType)
  if (!trigger) return

  // 使用快照避免执行过程中列表被修改
  const hookSnapshot = [...hooks.value]
  const matched = evaluateHooks(hookSnapshot, trigger, context)

  matched.forEach((hook) => {
    try {
      executeAction(hook, coyoteService, settings.value.maxStrength)
    } catch (err) {
      console.error('[useCoyote] 执行钩子失败:', hook.name, err)
    }
  })
}

/**
 * 订阅事件总线
 */
const subscribeEventBus = () => {
  unsubTransition = focusEventBus.on('transition', (payload) => {
    dispatchFocusEvent(payload.action, payload)
  })

  unsubTick = focusEventBus.on('tick', (payload) => {
    dispatchFocusEvent(payload.action, payload)
  })
}

// === 公共 API ===

/**
 * @returns {Object} useCoyote API
 */
export const useCoyote = () => {
  if (!initialized) {
    initializeSettings()
    subscribeEventBus()
    initialized = true
  }

  /**
   * 连接设备
   * @returns {Promise<boolean>}
   */
  const connect = () => {
    return coyoteService.connect(settings.value.serverUrl)
  }

  /**
   * 断开连接
   */
  const disconnect = () => {
    coyoteService.disconnect()
  }

  /**
   * 紧急停止
   */
  const emergencyStop = () => {
    coyoteService.emergencyStop()
  }

  /**
   * 更新设置
   * @param {Object} newSettings - 新设置
   */
  const updateSettings = (newSettings) => {
    settings.value = { ...settings.value, ...newSettings }
    persistSettings()
  }

  /**
   * 添加钩子
   * @param {Object} hook - 钩子配置
   * @returns {string} 新钩子的 ID
   */
  const addHook = (hook) => {
    const newHook = {
      id: generateId(),
      enabled: true,
      ...hook
    }
    hooks.value = [...hooks.value, newHook]
    persistHooks()
    return newHook.id
  }

  /**
   * 更新钩子
   * @param {string} id - 钩子 ID
   * @param {Object} updates - 更新内容
   */
  const updateHook = (id, updates) => {
    hooks.value = hooks.value.map((h) => (h.id === id ? { ...h, ...updates } : h))
    persistHooks()
  }

  /**
   * 删除钩子
   * @param {string} id - 钩子 ID
   */
  const removeHook = (id) => {
    hooks.value = hooks.value.filter((h) => h.id !== id)
    persistHooks()
  }

  /**
   * 清除所有钩子
   */
  const clearAllHooks = () => {
    hooks.value = []
    persistHooks()
  }

  /**
   * 应用预设
   * @param {Object} preset - 预设对象（来自 PRESETS）
   */
  const applyPreset = (preset) => {
    const newHook = {
      id: generateId(),
      ...preset.hook
    }
    hooks.value = [...hooks.value, newHook]
    persistHooks()
  }

  /**
   * 测试触发钩子
   * @param {Object} hook - 钩子对象
   */
  const testFire = (hook) => {
    if (coyoteService.connectionState.value !== CoyoteConnectionState.BOUND) {
      console.warn('[useCoyote] 设备未连接，无法测试')
      return
    }
    try {
      executeAction(hook, coyoteService, settings.value.maxStrength)
    } catch (err) {
      console.error('[useCoyote] 测试触发失败:', err)
    }
  }

  return {
    // 响应式状态
    settings: readonly(settings),
    hooks: readonly(hooks),
    connectionState: coyoteService.connectionState,
    clientId: coyoteService.clientId,
    targetId: coyoteService.targetId,
    strengthA: coyoteService.strengthA,
    strengthB: coyoteService.strengthB,
    strengthLimitA: coyoteService.strengthLimitA,
    strengthLimitB: coyoteService.strengthLimitB,
    lastError: coyoteService.lastError,

    // 连接
    connect,
    disconnect,
    emergencyStop,

    // 设置
    updateSettings,

    // 钩子 CRUD
    addHook,
    updateHook,
    removeHook,
    clearAllHooks,
    applyPreset,
    testFire,

    // 调度
    dispatchFocusEvent,

    // 预设列表
    presets: PRESETS,

    // 服务引用（用于 StrengthPanel 等）
    service: coyoteService
  }
}

// 导出内部函数供测试使用
export const _internal = {
  resetForTesting: () => {
    settings.value = { ...COYOTE_DEFAULTS }
    hooks.value = []
    initialized = false
    if (unsubTransition) {
      unsubTransition()
      unsubTransition = null
    }
    if (unsubTick) {
      unsubTick()
      unsubTick = null
    }
  }
}

export default useCoyote
