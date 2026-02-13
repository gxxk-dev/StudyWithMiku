/**
 * @fileoverview 数据同步管理
 * @module composables/useDataSync
 *
 * 单例模式 Composable，管理用户数据的上传、下载、冲突解决
 * 支持离线队列和自动同步
 */

import { ref, readonly, computed } from 'vue'
import * as dataSyncService from '../services/dataSync.js'
import * as authStorage from '../utils/authStorage.js'
import * as conflictResolver from '../utils/syncConflictResolver.js'
import { safeLocalStorageGetJSON, safeLocalStorageSetJSON } from '../utils/storage.js'
import { AUTH_CONFIG, STORAGE_KEYS } from '../config/constants.js'

// 模块级状态（单例）
const syncStatus = ref({})
const lastSyncTime = ref(null)
const isSyncing = ref(false)
const pendingChanges = ref([])
const error = ref(null)

// 防抖定时器
let syncDebounceTimer = null

/**
 * 获取同步版本存储键
 * @param {string} dataType - 数据类型
 * @returns {string} 存储键
 */
const getSyncVersionKey = (dataType) => {
  return `${STORAGE_KEYS.SYNC_VERSION_PREFIX}_${dataType}`
}

/**
 * 获取本地数据版本
 * @param {string} dataType - 数据类型
 * @returns {number} 版本号
 */
const getLocalVersion = (dataType) => {
  const versionKey = getSyncVersionKey(dataType)
  return parseInt(safeLocalStorageGetJSON(versionKey) || '0', 10)
}

/**
 * 设置本地数据版本
 * @param {string} dataType - 数据类型
 * @param {number} version - 版本号
 */
const setLocalVersion = (dataType, version) => {
  const versionKey = getSyncVersionKey(dataType)
  safeLocalStorageSetJSON(versionKey, version.toString())
}

/**
 * 获取本地数据
 * @param {string} dataType - 数据类型
 * @returns {any} 本地数据
 */
const getLocalData = (dataType) => {
  const storageKey = getStorageKeyForDataType(dataType)
  return safeLocalStorageGetJSON(storageKey)
}

/**
 * 保存本地数据
 * @param {string} dataType - 数据类型
 * @param {any} data - 数据内容
 */
const saveLocalData = (dataType, data) => {
  const storageKey = getStorageKeyForDataType(dataType)
  safeLocalStorageSetJSON(storageKey, data)
}

/**
 * 根据数据类型获取对应的 localStorage 键
 * @param {string} dataType - 数据类型
 * @returns {string} localStorage 键
 */
const getStorageKeyForDataType = (dataType) => {
  switch (dataType) {
    case AUTH_CONFIG.DATA_TYPES.FOCUS_RECORDS:
      return STORAGE_KEYS.FOCUS_RECORDS
    case AUTH_CONFIG.DATA_TYPES.FOCUS_SETTINGS:
      return STORAGE_KEYS.FOCUS_SETTINGS
    case AUTH_CONFIG.DATA_TYPES.PLAYLISTS:
      return STORAGE_KEYS.PLAYLISTS
    case AUTH_CONFIG.DATA_TYPES.USER_SETTINGS:
      return STORAGE_KEYS.USER_SETTINGS
    case AUTH_CONFIG.DATA_TYPES.SHARE_CONFIG:
      return STORAGE_KEYS.SHARE_CARD_CONFIG
    default:
      throw new Error(`未知的数据类型: ${dataType}`)
  }
}

/**
 * 设置错误状态
 * @param {Error} err - 错误对象
 */
const setError = (err) => {
  error.value = {
    code: err.code || err.name || 'SYNC_ERROR',
    message: err.message || '同步失败',
    type: err.type || 'SYNC_ERROR',
    details: err.details || null
  }
}

/**
 * 清除错误状态
 */
const clearError = () => {
  error.value = null
}

/**
 * 更新同步状态
 * @param {string} dataType - 数据类型
 * @param {Partial<import('../types/auth.js').SyncStatus>} status - 状态更新
 */
const updateSyncStatus = (dataType, status) => {
  syncStatus.value = {
    ...syncStatus.value,
    [dataType]: {
      ...syncStatus.value[dataType],
      ...status
    }
  }
}

/**
 * 初始化同步状态
 * @param {string} dataType - 数据类型
 */
const initSyncStatus = (dataType) => {
  if (!syncStatus.value[dataType]) {
    const hasPending = pendingChanges.value.some((c) => c.type === dataType)
    syncStatus.value[dataType] = {
      synced: !hasPending && lastSyncTime.value !== null,
      version: getLocalVersion(dataType),
      lastSyncTime: lastSyncTime.value,
      error: null,
      hasLocalChanges: hasPending
    }
  }
}

/**
 * 数据同步管理 Composable
 * @returns {Object} 数据同步相关的状态和方法
 */
export const useDataSync = () => {
  /**
   * 初始化数据同步
   * 恢复待同步队列和同步状态
   */
  const initialize = () => {
    // 恢复待同步队列
    const savedQueue = safeLocalStorageGetJSON('swm_sync_queue') || []
    pendingChanges.value = savedQueue

    // 恢复最后同步时间
    const savedSyncTime = safeLocalStorageGetJSON('swm_last_sync_time')
    if (savedSyncTime) {
      lastSyncTime.value = savedSyncTime
    }

    // 初始化各数据类型的同步状态
    Object.values(AUTH_CONFIG.DATA_TYPES).forEach((dataType) => {
      initSyncStatus(dataType)
    })
  }

  /**
   * 保存待同步队列到 localStorage
   */
  const persistQueue = () => {
    safeLocalStorageSetJSON('swm_sync_queue', pendingChanges.value)
  }

  /**
   * 上传单个数据类型
   * @param {string} dataType - 数据类型
   * @param {any} data - 数据内容
   * @param {boolean} [force=false] - 是否强制上传（忽略版本检查）
   * @returns {Promise<Object|undefined>} 上传成功的响应，未登录时加入队列返回 undefined
   */
  const uploadData = async (dataType, data, force = false) => {
    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      // 未登录，加入离线队列
      queueChange(dataType, data)
      return
    }

    initSyncStatus(dataType)
    clearError()

    try {
      const localVersion = force ? null : getLocalVersion(dataType)
      const response = await dataSyncService.updateData(accessToken, dataType, data, localVersion)

      // 后端返回 { success: true, version, merged }
      if (response.success) {
        // 更新本地版本
        setLocalVersion(dataType, response.version)

        // 更新同步状态
        updateSyncStatus(dataType, {
          synced: true,
          version: response.version,
          lastSyncTime: Date.now(),
          error: null,
          hasLocalChanges: false
        })

        // 从队列中移除相关变更
        pendingChanges.value = pendingChanges.value.filter((change) => change.type !== dataType)
        persistQueue()

        return response
      } else {
        throw new Error(response.error || '上传失败')
      }
    } catch (error) {
      // 处理冲突 — 后端 409 返回 { conflict: true, serverData, serverVersion } 在 error.details 中
      if (error.code === 'CONFLICT_ERROR' && error.details && error.details.conflict) {
        const resolvedData = await resolveConflict(
          dataType,
          data,
          error.details.serverData,
          getLocalVersion(dataType),
          error.details.serverVersion
        )

        // 使用解决后的数据重新上传
        return uploadData(dataType, resolvedData, true)
      }

      // 其他错误，加入离线队列
      queueChange(dataType, data)
      updateSyncStatus(dataType, {
        error: error.message,
        hasLocalChanges: true
      })
      setError(error)
      throw error
    }
  }

  /**
   * 下载单个数据类型
   * @param {string} dataType - 数据类型
   * @returns {Promise<any>} 下载的数据内容
   */
  const downloadData = async (dataType) => {
    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    initSyncStatus(dataType)
    clearError()

    try {
      const response = await dataSyncService.getData(accessToken, dataType)

      // 后端返回 { type, data, version }，不包含 success 字段
      if (response.data !== null && response.data !== undefined) {
        const localData = getLocalData(dataType)
        const localVersion = getLocalVersion(dataType)

        // 检查是否需要合并
        if (localData && response.version !== localVersion) {
          const mergedData = conflictResolver.resolveConflict(
            dataType,
            localData,
            response.data,
            localVersion,
            response.version
          )

          // 保存合并后的数据
          saveLocalData(dataType, mergedData)
        } else {
          // 直接使用服务器数据
          saveLocalData(dataType, response.data)
        }

        // 更新版本和同步状态
        setLocalVersion(dataType, response.version)
        updateSyncStatus(dataType, {
          synced: true,
          version: response.version,
          lastSyncTime: Date.now(),
          error: null,
          hasLocalChanges: false
        })

        return response.data
      } else {
        // 服务器没有数据，本地数据即为最新
        updateSyncStatus(dataType, {
          synced: true,
          lastSyncTime: Date.now(),
          error: null
        })
        return getLocalData(dataType)
      }
    } catch (error) {
      updateSyncStatus(dataType, {
        error: error.message
      })
      setError(error)
      throw error
    }
  }

  /**
   * 处理离线队列（逐个上传待同步的变更）
   * @returns {Promise<void>}
   */
  const syncChanges = async () => {
    if (pendingChanges.value.length === 0) {
      return
    }

    const accessToken = authStorage.getAccessToken()

    if (!accessToken) {
      throw new Error('未登录')
    }

    isSyncing.value = true
    clearError()

    try {
      // 逐个上传队列中的变更
      const changesToProcess = [...pendingChanges.value]

      for (const change of changesToProcess) {
        try {
          await uploadData(change.type, change.data)
        } catch {
          // 单个失败不影响其他类型
          console.error(`同步 ${change.type} 失败`)
        }
      }

      lastSyncTime.value = Date.now()
      safeLocalStorageSetJSON('swm_last_sync_time', lastSyncTime.value)
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * 冲突解决
   * @param {string} dataType - 数据类型
   * @param {any} localData - 本地数据
   * @param {any} serverData - 服务器数据
   * @param {number} localVersion - 本地版本
   * @param {number} serverVersion - 服务器版本
   * @returns {any} 解决后的数据
   */
  const resolveConflict = async (dataType, localData, serverData, localVersion, serverVersion) => {
    // 使用自动冲突解决策略
    const resolvedData = conflictResolver.resolveConflict(
      dataType,
      localData,
      serverData,
      localVersion,
      serverVersion
    )

    // 保存解决后的数据到本地
    saveLocalData(dataType, resolvedData)

    return resolvedData
  }

  /**
   * 将变更加入离线队列
   * @param {string} dataType - 数据类型
   * @param {any} data - 数据内容
   */
  const queueChange = (dataType, data) => {
    const change = {
      id: `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: dataType,
      data,
      version: getLocalVersion(dataType) + 1,
      timestamp: Date.now(),
      operation: 'update'
    }

    // 移除同类型的旧变更
    pendingChanges.value = pendingChanges.value.filter((c) => c.type !== dataType)

    // 添加新变更
    pendingChanges.value.push(change)
    persistQueue()

    // 更新同步状态
    updateSyncStatus(dataType, {
      hasLocalChanges: true
    })

    // 防抖处理自动同步
    debouncedAutoSync()
  }

  /**
   * 处理离线队列
   * @returns {Promise<void>}
   */
  const processQueue = async () => {
    if (pendingChanges.value.length === 0) {
      return
    }

    try {
      await syncChanges()
    } catch (error) {
      console.error('处理离线队列失败:', error)
      // 不抛出错误，避免影响其他操作
    }
  }

  /**
   * 防抖的自动同步
   */
  const debouncedAutoSync = () => {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
    }

    syncDebounceTimer = setTimeout(() => {
      if (authStorage.hasValidAuth()) {
        processQueue().catch((error) => {
          console.error('自动同步失败:', error)
        })
      }
    }, AUTH_CONFIG.SYNC_DEBOUNCE_DELAY)
  }

  /**
   * 手动触发完整同步（上传待同步变更 + 下载所有数据类型）
   * @returns {Promise<void>}
   */
  const triggerSync = async () => {
    if (!authStorage.hasValidAuth()) {
      throw new Error('未登录')
    }

    isSyncing.value = true
    clearError()

    try {
      // 1. 上传待同步变更
      if (pendingChanges.value.length > 0) {
        const changesToProcess = [...pendingChanges.value]
        for (const change of changesToProcess) {
          try {
            await uploadData(change.type, change.data)
          } catch {
            console.error(`上传 ${change.type} 失败`)
          }
        }
      }

      // 2. 下载所有数据类型，确保本地与云端一致
      const dataTypes = Object.values(AUTH_CONFIG.DATA_TYPES)
      for (const dataType of dataTypes) {
        try {
          await downloadData(dataType)
        } catch {
          console.error(`下载 ${dataType} 失败`)
        }
      }

      lastSyncTime.value = Date.now()
      safeLocalStorageSetJSON('swm_last_sync_time', lastSyncTime.value)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSyncing.value = false
    }
  }

  // 计算属性
  const hasPendingChanges = computed(() => pendingChanges.value.length > 0)
  const isOnline = computed(() => navigator.onLine)
  const canSync = computed(() => authStorage.hasValidAuth() && isOnline.value)

  return {
    // 状态
    syncStatus: readonly(syncStatus),
    lastSyncTime: readonly(lastSyncTime),
    isSyncing: readonly(isSyncing),
    pendingChanges: readonly(pendingChanges),
    error: readonly(error),

    // 计算属性
    hasPendingChanges,
    isOnline,
    canSync,

    // 方法
    initialize,
    uploadData,
    downloadData,
    syncChanges,
    resolveConflict,
    queueChange,
    processQueue,
    triggerSync,
    clearError
  }
}
