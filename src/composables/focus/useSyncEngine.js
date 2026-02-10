/**
 * @module composables/focus/useSyncEngine
 * @description 专注记录同步引擎
 * 负责版本检查、智能上传、下载合并、变更队列管理
 */

import { ref, readonly, computed } from 'vue'
import {
  safeLocalStorageGetJSON,
  safeLocalStorageSetJSON,
  safeLocalStorageRemove
} from '../../utils/storage.js'
import { mergeFocusRecords } from '../../utils/syncConflictResolver.js'
import { useAuth } from '../useAuth.js'
import * as authStorage from '../../utils/authStorage.js'
import { AUTH_CONFIG, DATA_API } from '../../config/constants.js'
import {
  SYNC_PROTOCOL,
  SYNC_THRESHOLD,
  SYNC_STORAGE_KEYS,
  FOCUS_STORAGE_KEYS
} from './constants.js'

// 模块级单例状态
const syncEnabled = ref(true)
const isSyncing = ref(false)
const lastSyncTime = ref(0)
const serverVersion = ref(0)
const changeQueue = ref([])
const protocolMismatch = ref(false)

let initialized = false

/**
 * 初始化同步引擎
 */
const initialize = () => {
  if (initialized) return

  // 从 localStorage 恢复状态
  lastSyncTime.value = safeLocalStorageGetJSON(SYNC_STORAGE_KEYS.LAST_SYNC, 0)
  serverVersion.value = safeLocalStorageGetJSON(SYNC_STORAGE_KEYS.VERSION, 0)
  changeQueue.value = safeLocalStorageGetJSON(SYNC_STORAGE_KEYS.QUEUE, [])

  // 检查协议版本
  const savedProtocol = safeLocalStorageGetJSON(SYNC_STORAGE_KEYS.PROTOCOL, null)
  if (savedProtocol && savedProtocol < SYNC_PROTOCOL.MIN_SUPPORTED) {
    protocolMismatch.value = true
    syncEnabled.value = false
  }

  initialized = true
}

/**
 * 持久化变更队列
 */
const persistQueue = () => {
  safeLocalStorageSetJSON(SYNC_STORAGE_KEYS.QUEUE, changeQueue.value)
}

/**
 * 持久化同步状态
 */
const persistSyncState = () => {
  safeLocalStorageSetJSON(SYNC_STORAGE_KEYS.VERSION, serverVersion.value)
  safeLocalStorageSetJSON(SYNC_STORAGE_KEYS.LAST_SYNC, lastSyncTime.value)
  safeLocalStorageSetJSON(SYNC_STORAGE_KEYS.PROTOCOL, SYNC_PROTOCOL.VERSION)
}

/**
 * 生成 UUID v4
 * @returns {string}
 */
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 获取认证请求头
 * @returns {Object}
 */
const getAuthHeaders = () => {
  const accessToken = authStorage.getAccessToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  }
}

/**
 * 检查协议版本兼容性
 * @returns {Promise<{compatible: boolean, serverVersion?: number}>}
 */
const checkProtocol = async () => {
  try {
    const response = await fetch(DATA_API.GET_VERSION(AUTH_CONFIG.DATA_TYPES.FOCUS_RECORDS), {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      return { compatible: true } // 网络错误时假设兼容
    }

    const serverProtocolVersion = response.headers.get('X-Sync-Protocol-Version')
    if (serverProtocolVersion) {
      const version = parseInt(serverProtocolVersion, 10)
      if (version < SYNC_PROTOCOL.MIN_SUPPORTED) {
        protocolMismatch.value = true
        syncEnabled.value = false
        return { compatible: false, serverVersion: version }
      }
    }

    return { compatible: true }
  } catch (error) {
    console.error('检查协议版本失败:', error)
    return { compatible: true }
  }
}

/**
 * 获取服务端版本号
 * @returns {Promise<{version: number, data?: Array}>}
 */
const fetchServerVersion = async () => {
  try {
    const response = await fetch(DATA_API.GET_VERSION(AUTH_CONFIG.DATA_TYPES.FOCUS_RECORDS), {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()
    return { version: result.version || 0 }
  } catch (error) {
    console.error('获取服务端版本失败:', error)
    return { version: -1 }
  }
}

/**
 * 下载服务端全量数据
 * @returns {Promise<{data: Array, version: number}>}
 */
const downloadFullData = async () => {
  try {
    const response = await fetch(DATA_API.GET_DATA(AUTH_CONFIG.DATA_TYPES.FOCUS_RECORDS), {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()
    return {
      data: result.data || [],
      version: result.version || 0
    }
  } catch (error) {
    console.error('下载全量数据失败:', error)
    return { data: [], version: -1 }
  }
}

/**
 * 上传全量数据
 * @param {Array} records - 记录数组
 * @returns {Promise<{success: boolean, version?: number}>}
 */
const uploadFullData = async (records) => {
  try {
    const response = await fetch(DATA_API.UPDATE_DATA(AUTH_CONFIG.DATA_TYPES.FOCUS_RECORDS), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        data: records,
        version: serverVersion.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()

    if (result.conflict) {
      // 版本冲突，需要合并
      return {
        success: false,
        conflict: true,
        serverData: result.serverData,
        serverVersion: result.serverVersion
      }
    }

    return { success: true, version: result.version }
  } catch (error) {
    console.error('上传全量数据失败:', error)
    return { success: false }
  }
}

/**
 * 上传增量数据
 * @param {Array} changes - 变更数组
 * @returns {Promise<{success: boolean, version?: number}>}
 */
const uploadDelta = async (changes) => {
  try {
    const response = await fetch(DATA_API.APPLY_DELTA(AUTH_CONFIG.DATA_TYPES.FOCUS_RECORDS), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        changes,
        version: serverVersion.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()
    return { success: result.success, version: result.version }
  } catch (error) {
    console.error('上传增量数据失败:', error)
    return { success: false }
  }
}

/**
 * 添加变更到队列
 * @param {string} action - 操作类型 (add|update|delete)
 * @param {Object} record - 记录数据
 */
const queueChange = (action, record) => {
  initialize()

  const change = {
    action,
    record: { ...record },
    timestamp: Date.now()
  }

  // 如果队列中已有同 ID 的变更，替换它
  const existingIndex = changeQueue.value.findIndex((c) => c.record.id === record.id)

  if (existingIndex !== -1) {
    // delete 操作优先级最高
    if (action === 'delete') {
      changeQueue.value[existingIndex] = change
    } else if (changeQueue.value[existingIndex].action !== 'delete') {
      changeQueue.value[existingIndex] = change
    }
  } else {
    changeQueue.value.push(change)
  }

  persistQueue()
}

/**
 * 清空变更队列
 */
const clearQueue = () => {
  changeQueue.value = []
  persistQueue()
}

/**
 * 获取本地记录
 * @returns {Array}
 */
const getLocalRecords = () => {
  return safeLocalStorageGetJSON(FOCUS_STORAGE_KEYS.RECORDS, [])
}

/**
 * 保存本地记录
 * @param {Array} records
 */
const saveLocalRecords = (records) => {
  safeLocalStorageSetJSON(FOCUS_STORAGE_KEYS.RECORDS, records)
}

/**
 * 执行同步
 * @returns {Promise<{success: boolean, merged?: boolean}>}
 */
const sync = async () => {
  initialize()

  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value || !syncEnabled.value || isSyncing.value) {
    return { success: false }
  }

  isSyncing.value = true

  try {
    // 1. 检查协议兼容性
    const protocolCheck = await checkProtocol()
    if (!protocolCheck.compatible) {
      return { success: false, protocolMismatch: true }
    }

    // 2. 获取服务端版本
    const { version: remoteVersion } = await fetchServerVersion()
    if (remoteVersion === -1) {
      return { success: false }
    }

    const localRecords = getLocalRecords()
    const hasLocalChanges = changeQueue.value.length > 0

    // 3. 决定同步策略
    if (remoteVersion === serverVersion.value && !hasLocalChanges) {
      // 版本一致且无本地变更，无需同步
      lastSyncTime.value = Date.now()
      persistSyncState()
      return { success: true }
    }

    // 4. 下载服务端数据
    const { data: serverData, version: downloadedVersion } = await downloadFullData()
    if (downloadedVersion === -1) {
      return { success: false }
    }

    // 5. 合并数据
    const mergedRecords = mergeFocusRecords(localRecords, serverData)
    saveLocalRecords(mergedRecords)

    // 6. 上传合并后的数据
    const recordCount = mergedRecords.length
    let uploadResult

    if (recordCount <= SYNC_THRESHOLD || changeQueue.value.length === 0) {
      // 全量上传
      uploadResult = await uploadFullData(mergedRecords)
    } else {
      // 增量上传
      uploadResult = await uploadDelta(changeQueue.value)
      if (!uploadResult.success) {
        // 增量失败，回退到全量
        uploadResult = await uploadFullData(mergedRecords)
      }
    }

    if (uploadResult.success) {
      serverVersion.value = uploadResult.version
      clearQueue()
      lastSyncTime.value = Date.now()
      persistSyncState()
      return { success: true, merged: true }
    }

    // 处理冲突
    if (uploadResult.conflict) {
      if (uploadResult.serverVersion) {
        serverVersion.value = uploadResult.serverVersion
      }
      const remerged = mergeFocusRecords(mergedRecords, uploadResult.serverData)
      saveLocalRecords(remerged)
      // 重试上传
      const retryResult = await uploadFullData(remerged)
      if (retryResult.success) {
        serverVersion.value = retryResult.version
        clearQueue()
        lastSyncTime.value = Date.now()
        persistSyncState()
        return { success: true, merged: true }
      }
    }

    return { success: false }
  } catch (error) {
    console.error('同步失败:', error)
    return { success: false }
  } finally {
    isSyncing.value = false
  }
}

/**
 * 处理离线队列
 * @returns {Promise<{success: boolean, processed: number}>}
 */
const processQueue = async () => {
  initialize()

  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value || !syncEnabled.value) {
    return { success: false, processed: 0 }
  }

  if (changeQueue.value.length === 0) {
    return { success: true, processed: 0 }
  }

  // 触发完整同步来处理队列
  const result = await sync()
  return {
    success: result.success,
    processed: result.success ? changeQueue.value.length : 0
  }
}

/**
 * 启用/禁用云同步
 * @param {boolean} enabled
 */
const setSyncEnabled = (enabled) => {
  if (protocolMismatch.value && enabled) {
    console.warn('协议版本不兼容，无法启用云同步')
    return
  }
  syncEnabled.value = enabled
}

/**
 * 重置同步状态（用于测试）
 */
const resetForTesting = () => {
  syncEnabled.value = true
  isSyncing.value = false
  lastSyncTime.value = 0
  serverVersion.value = 0
  changeQueue.value = []
  protocolMismatch.value = false
  initialized = false
  safeLocalStorageRemove(SYNC_STORAGE_KEYS.QUEUE)
  safeLocalStorageRemove(SYNC_STORAGE_KEYS.VERSION)
  safeLocalStorageRemove(SYNC_STORAGE_KEYS.LAST_SYNC)
  safeLocalStorageRemove(SYNC_STORAGE_KEYS.PROTOCOL)
}

/**
 * Vue Composable
 */
export const useSyncEngine = () => {
  initialize()

  return {
    // 状态
    syncEnabled: readonly(syncEnabled),
    isSyncing: readonly(isSyncing),
    lastSyncTime: readonly(lastSyncTime),
    serverVersion: readonly(serverVersion),
    queueLength: computed(() => changeQueue.value.length),
    protocolMismatch: readonly(protocolMismatch),

    // 方法
    checkProtocol,
    sync,
    queueChange,
    processQueue,
    clearQueue,
    setSyncEnabled,
    generateUUID
  }
}

// 导出内部函数供测试使用
export const _internal = {
  initialize,
  fetchServerVersion,
  downloadFullData,
  uploadFullData,
  uploadDelta,
  getLocalRecords,
  saveLocalRecords,
  resetForTesting
}
