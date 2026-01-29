/**
 * useOnlineCount - 在线人数统计
 *
 * 通过 WebSocket 连接到计数服务器获取实时在线人数
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { RECONNECT_CONFIG, WS_CONFIG } from '../config/constants.js'

const MAX_RECONNECT_ATTEMPTS = RECONNECT_CONFIG.MAX_ATTEMPTS

/**
 * 获取 WebSocket URL
 * 开发环境使用本地 worker，生产环境使用相对路径
 */
const getDefaultWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws`
}

/**
 * useOnlineCount - 获取在线人数
 *
 * @param {string} wsUrl - WebSocket URL（可选，默认自动检测）
 * @returns {{ onlineCount: Ref<number>, isConnected: Ref<boolean>, reconnectToServer: Function }}
 *
 * @example
 * ```js
 * const { onlineCount, isConnected } = useOnlineCount()
 * ```
 */
export function useOnlineCount(wsUrl) {
  const onlineCount = ref(0)
  const isConnected = ref(false)

  // WebSocket 实例和定时器
  let ws = null
  let reconnectTimer = null
  let pingTimer = null
  let reconnectAttempts = 0
  let currentWsUrl = wsUrl || getDefaultWsUrl()

  // 指数退避配置
  const INITIAL_RECONNECT_DELAY = RECONNECT_CONFIG.BASE_DELAY
  const MAX_RECONNECT_DELAY = RECONNECT_CONFIG.MAX_DELAY

  const getReconnectDelay = () => {
    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts)
    return Math.min(delay, MAX_RECONNECT_DELAY)
  }

  const connect = (url = null) => {
    if (url) currentWsUrl = url

    stopPing()

    try {
      ws = new WebSocket(currentWsUrl)

      ws.onopen = () => {
        isConnected.value = true
        reconnectAttempts = 0
        console.log('[OnlineCount] WebSocket connected')
        startPing()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'count') {
            onlineCount.value = data.count
          }
        } catch (err) {
          console.error('[OnlineCount] Parse message error:', err)
        }
      }

      ws.onclose = () => {
        isConnected.value = false
        console.log('[OnlineCount] WebSocket disconnected')
        stopPing()
        scheduleReconnect()
      }

      ws.onerror = (error) => {
        console.error('[OnlineCount] WebSocket error:', error)
      }
    } catch (err) {
      console.error('[OnlineCount] WebSocket connection error:', err)
      scheduleReconnect()
    }
  }

  const startPing = () => {
    stopPing()

    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, WS_CONFIG.PING_INTERVAL)
  }

  const stopPing = () => {
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[OnlineCount] Maximum reconnection attempts reached')
      return
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    const delay = getReconnectDelay()
    console.log(
      `[OnlineCount] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`
    )

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      reconnectAttempts++
      connect()
    }, delay)
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    stopPing()

    if (ws) {
      try {
        ws.close(1000, 'Normal closure')
      } catch (err) {
        console.warn('[OnlineCount] Error closing WebSocket:', err)
      }
      ws = null
    }

    reconnectAttempts = 0
  }

  const reconnectToServer = async (newUrl) => {
    disconnect()
    currentWsUrl = newUrl
    await new Promise((resolve) => setTimeout(resolve, 100))
    connect(newUrl)
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    onlineCount,
    isConnected,
    reconnectToServer
  }
}

// 导出内部函数供测试使用
export const _internal = {
  getDefaultWsUrl
}

export default useOnlineCount
