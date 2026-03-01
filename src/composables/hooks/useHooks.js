/**
 * Hook 系统主 composable（单例模式）
 *
 * 管理 hook CRUD、eventBus 订阅、provider 调度、云同步
 */

import { ref, readonly } from 'vue'
import { safeLocalStorageGetJSON, safeLocalStorageSetJSON } from '../../utils/storage.js'
import { HOOKS_STORAGE_KEYS } from './constants.js'
import { providerRegistry } from './providerRegistry.js'
import { mapTransitionToTrigger, evaluateHooks, dispatchToProviders } from './hookEngine.js'
import { focusEventBus } from '../focus/eventBus.js'
import { DEFAULT_HOOKS } from './presets.js'
import { notificationProvider } from './providers/notification.js'
import { soundProvider } from './providers/sound.js'
import { pushProvider } from './providers/push.js'
import { safeLocalStorageGet } from '../../utils/storage.js'

// 模块级单例状态
const hooks = ref([])
let initialized = false
let unsubTransition = null
let unsubTick = null

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

/**
 * 初始化 hooks：从 localStorage 加载，如无数据则种子默认 hooks
 */
const initializeHooks = () => {
  const saved = safeLocalStorageGetJSON(HOOKS_STORAGE_KEYS.HOOKS, null)
  if (saved && Array.isArray(saved) && saved.length > 0) {
    hooks.value = saved
  } else {
    hooks.value = DEFAULT_HOOKS.map((h) => ({ ...h }))
    persistHooks()
  }
}

const persistHooks = () => {
  safeLocalStorageSetJSON(HOOKS_STORAGE_KEYS.HOOKS, hooks.value)
}

/**
 * 条件注册 estim provider
 */
const registerEstimIfUnlocked = () => {
  if (safeLocalStorageGet(HOOKS_STORAGE_KEYS.ESTIM_UNLOCKED) === 'true') {
    if (!providerRegistry.has('estim')) {
      import('./providers/estim.js').then(({ estimProvider }) => {
        providerRegistry.register(estimProvider)
      })
    }
  }
}

/**
 * 核心调度：处理 focus 事件
 */
const handleFocusEvent = (action, context = {}) => {
  const trigger = mapTransitionToTrigger(action, context.mode, context.completionType)
  if (!trigger) return

  const hookSnapshot = [...hooks.value]
  const matched = evaluateHooks(hookSnapshot, trigger, context)
  if (matched.length > 0) {
    dispatchToProviders(matched, context)
  }
}

/**
 * 订阅事件总线
 */
const subscribeEventBus = () => {
  unsubTransition = focusEventBus.on('transition', (payload) => {
    handleFocusEvent(payload.action, payload)
  })

  unsubTick = focusEventBus.on('tick', (payload) => {
    handleFocusEvent(payload.action, payload)
  })
}

// === 公共 API ===

export const useHooks = () => {
  if (!initialized) {
    // 注册内置 providers
    if (!providerRegistry.has('notification')) {
      providerRegistry.register(notificationProvider)
    }
    if (!providerRegistry.has('sound')) {
      providerRegistry.register(soundProvider)
    }
    if (!providerRegistry.has('push')) {
      providerRegistry.register(pushProvider)
    }

    // 条件注册 estim provider（需解锁）
    registerEstimIfUnlocked()

    initializeHooks()
    subscribeEventBus()
    initialized = true
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
      builtIn: false,
      tickInterval: 0,
      action: {},
      ...hook
    }
    hooks.value = [...hooks.value, newHook]
    persistHooks()
    syncToCloud()
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
    syncToCloud()
  }

  /**
   * 删除钩子（built-in 不可删除）
   * @param {string} id - 钩子 ID
   */
  const removeHook = (id) => {
    const hook = hooks.value.find((h) => h.id === id)
    if (hook?.builtIn) return
    hooks.value = hooks.value.filter((h) => h.id !== id)
    persistHooks()
    syncToCloud()
  }

  /**
   * 清除所有非 built-in 钩子
   */
  const clearCustomHooks = () => {
    hooks.value = hooks.value.filter((h) => h.builtIn)
    persistHooks()
    syncToCloud()
  }

  /**
   * 应用预设
   * @param {Object} preset - 预设钩子配置
   */
  const applyPreset = (preset) => {
    const newHook = {
      id: generateId(),
      enabled: true,
      builtIn: false,
      tickInterval: 0,
      action: {},
      ...preset.hook
    }
    hooks.value = [...hooks.value, newHook]
    persistHooks()
    syncToCloud()
  }

  /**
   * 获取指定 provider 类型的所有 hooks
   * @param {string} providerId - Provider 标识符
   * @returns {Object[]} 匹配的 hook 列表
   */
  const getHooksByProvider = (providerId) => {
    return hooks.value.filter((h) => h.provider === providerId)
  }

  /**
   * 从云端加载 hooks 数据
   * @param {Object} cloudData - { hooks: [...] }
   */
  const loadFromCloud = (cloudData) => {
    if (cloudData?.hooks && Array.isArray(cloudData.hooks)) {
      hooks.value = cloudData.hooks
      persistHooks()
    }
  }

  /**
   * 获取用于云同步的数据
   * @returns {{ hooks: Object[] }} 包含 hooks 数组的对象
   */
  const getHooksData = () => {
    return { hooks: hooks.value }
  }

  return {
    hooks: readonly(hooks),
    addHook,
    updateHook,
    removeHook,
    clearCustomHooks,
    applyPreset,
    getHooksByProvider,
    loadFromCloud,
    getHooksData,
    providerRegistry
  }
}

/**
 * 异步同步到云端（不阻塞 UI）
 */
const syncToCloud = () => {
  // 延迟导入避免循环依赖
  import('../useAuth.js').then(({ useAuth }) => {
    const { isAuthenticated } = useAuth()
    if (!isAuthenticated.value) return

    import('../useDataSync.js').then(({ useDataSync }) => {
      const { uploadData } = useDataSync()
      uploadData('hook_settings', { hooks: hooks.value }).catch((err) => {
        console.error('[useHooks] 同步钩子到云端失败:', err)
      })
    })
  })
}

// 测试用重置
export const _internal = {
  resetForTesting: () => {
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
    providerRegistry.clear()
  }
}

export default useHooks
