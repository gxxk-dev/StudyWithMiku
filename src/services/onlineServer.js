/**
 * 在线服务器连接服务
 * 管理 WebSocket 连接到在线计数服务器
 */

import { ref, readonly } from 'vue'
import { STORAGE_KEYS, WS_CONFIG, RECONNECT_CONFIG } from '../config/constants.js'
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage.js'

/**
 * 根据当前页面 location 生成默认服务器地址
 * @returns {string} WebSocket 服务器地址
 */
const getDefaultServer = () => {
  const { protocol, host } = window.location
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${host}`
}

// 状态
const serverUrl = ref(safeLocalStorageGet(STORAGE_KEYS.COUNT_SERVER) || getDefaultServer())
const onlineCount = ref(0)
const connectionStatus = ref('disconnected') // 'disconnected' | 'connecting' | 'connected' | 'error'
const lastError = ref(null)

// WebSocket 实例
let ws = null
let pingInterval = null
let reconnectAttempts = 0
let reconnectTimer = null

/**
 * 计算重连延迟（指数退避）
 */
const getReconnectDelay = () => {
  const delay = Math.min(
    RECONNECT_CONFIG.BASE_DELAY * Math.pow(2, reconnectAttempts),
    RECONNECT_CONFIG.MAX_DELAY
  )
  return delay
}

/**
 * 清理连接资源
 */
const cleanup = () => {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.onopen = null
    ws.onmessage = null
    ws.onclose = null
    ws.onerror = null
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Manual disconnect')
    }
    ws = null
  }
}

/**
 * 启动心跳
 */
const startPing = () => {
  if (pingInterval) {
    clearInterval(pingInterval)
  }
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }))
    }
  }, WS_CONFIG.PING_INTERVAL)
}

/**
 * 连接到服务器
 * @param {string} [url] - 可选的服务器地址，不传则使用当前配置
 * @returns {Promise<boolean>} 连接是否成功
 */
const connect = (url) => {
  return new Promise((resolve) => {
    cleanup()

    if (url) {
      serverUrl.value = url
      safeLocalStorageSet(STORAGE_KEYS.COUNT_SERVER, url)
    }

    const targetUrl = serverUrl.value + '/ws'
    connectionStatus.value = 'connecting'
    lastError.value = null

    console.debug(`[OnlineServer] 正在连接: ${targetUrl}`)

    try {
      ws = new WebSocket(targetUrl)
    } catch (err) {
      connectionStatus.value = 'error'
      lastError.value = err.message
      console.error('[OnlineServer] 创建 WebSocket 失败:', err)
      resolve(false)
      return
    }

    const connectionTimeout = setTimeout(() => {
      if (connectionStatus.value === 'connecting') {
        connectionStatus.value = 'error'
        lastError.value = '连接超时'
        cleanup()
        resolve(false)
      }
    }, WS_CONFIG.CONNECTION_TIMEOUT)

    ws.onopen = () => {
      clearTimeout(connectionTimeout)
      connectionStatus.value = 'connected'
      reconnectAttempts = 0
      console.log('[OnlineServer] 连接成功')
      startPing()
      resolve(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'count') {
          onlineCount.value = data.count
        }
      } catch (err) {
        console.warn('[OnlineServer] 解析消息失败:', err)
      }
    }

    ws.onclose = () => {
      clearTimeout(connectionTimeout)
      const wasConnected = connectionStatus.value === 'connected'
      connectionStatus.value = 'disconnected'
      console.debug('[OnlineServer] 连接关闭')

      if (wasConnected && reconnectAttempts < RECONNECT_CONFIG.MAX_ATTEMPTS) {
        scheduleReconnect()
      }
    }

    ws.onerror = (event) => {
      clearTimeout(connectionTimeout)
      connectionStatus.value = 'error'
      lastError.value = '连接错误'
      console.error('[OnlineServer] WebSocket 错误:', event)
    }
  })
}

/**
 * 安排重连
 */
const scheduleReconnect = () => {
  if (reconnectTimer) return

  reconnectAttempts++
  const delay = getReconnectDelay()
  console.debug(`[OnlineServer] ${delay}ms 后尝试重连 (第 ${reconnectAttempts} 次)`)

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

/**
 * 断开连接
 */
const disconnect = () => {
  reconnectAttempts = RECONNECT_CONFIG.MAX_ATTEMPTS // 阻止自动重连
  cleanup()
  connectionStatus.value = 'disconnected'
  onlineCount.value = 0
  console.debug('[OnlineServer] 已断开连接')
}

/**
 * 设置服务器地址
 * @param {string} url - 服务器地址
 */
const setServer = (url) => {
  serverUrl.value = url
  safeLocalStorageSet(STORAGE_KEYS.COUNT_SERVER, url)
  console.debug(`[OnlineServer] 服务器地址已设置: ${url}`)
}

/**
 * 获取当前状态
 */
const getStatus = () => ({
  serverUrl: serverUrl.value,
  onlineCount: onlineCount.value,
  connectionStatus: connectionStatus.value,
  lastError: lastError.value,
  reconnectAttempts
})

/**
 * 导出的 API
 */
export const onlineServer = {
  // 响应式状态（只读）
  serverUrl: readonly(serverUrl),
  onlineCount: readonly(onlineCount),
  connectionStatus: readonly(connectionStatus),
  lastError: readonly(lastError),

  // 方法
  connect,
  disconnect,
  setServer,
  getStatus,
  getDefaultServer
}

export default onlineServer
