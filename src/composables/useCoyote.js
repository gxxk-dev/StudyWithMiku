/**
 * DG-Lab 郊狼设备控制 composable
 *
 * 单例模式，管理设备连接和设置持久化
 * Hook 逻辑已迁移到 hooks/useHooks + hooks/providers/estim
 */

import { ref, readonly } from 'vue'
import { safeLocalStorageGetJSON, safeLocalStorageSetJSON } from '../utils/storage.js'
import { COYOTE_DEFAULTS, COYOTE_STORAGE_KEYS } from './coyote/constants.js'
import { coyoteService } from '../services/coyoteService.js'

// 模块级单例状态
const settings = ref({ ...COYOTE_DEFAULTS })

let initialized = false

const initializeSettings = () => {
  const savedSettings = safeLocalStorageGetJSON(COYOTE_STORAGE_KEYS.SETTINGS, null)
  if (savedSettings) {
    settings.value = { ...COYOTE_DEFAULTS, ...savedSettings }
  }
}

const persistSettings = () => {
  safeLocalStorageSetJSON(COYOTE_STORAGE_KEYS.SETTINGS, settings.value)
}

// === 公共 API ===

export const useCoyote = () => {
  if (!initialized) {
    initializeSettings()
    initialized = true
  }

  const connect = () => {
    return coyoteService.connect(settings.value.serverUrl)
  }

  const disconnect = () => {
    coyoteService.disconnect()
  }

  const emergencyStop = () => {
    coyoteService.emergencyStop()
  }

  const updateSettings = (newSettings) => {
    settings.value = { ...settings.value, ...newSettings }
    persistSettings()
  }

  return {
    // 响应式状态
    settings: readonly(settings),
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

    // 服务引用（用于 StrengthPanel 等）
    service: coyoteService
  }
}

export const _internal = {
  resetForTesting: () => {
    settings.value = { ...COYOTE_DEFAULTS }
    initialized = false
  }
}

export default useCoyote
