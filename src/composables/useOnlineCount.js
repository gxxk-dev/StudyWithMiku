import { ref, onMounted, onUnmounted } from 'vue'
import { RECONNECT_CONFIG } from '../config/constants.js'

const MAX_RECONNECT_ATTEMPTS = RECONNECT_CONFIG.MAX_ATTEMPTS

export function useOnlineCount(wsUrl) {
  const onlineCount = ref(0)
  const isConnected = ref(false)

  // 将模块级变量改为 composable 内部管理，避免跨实例污染
  const ws = ref(null)
  const reconnectTimer = ref(null)
  const pingTimer = ref(null)
  const reconnectAttempts = ref(0)
  const currentWsUrl = ref(typeof wsUrl === 'string' ? wsUrl : wsUrl.value)

  // 指数退避配置：1s, 2s, 4s, 8s, 16s, 30s(最大)
  const INITIAL_RECONNECT_DELAY = RECONNECT_CONFIG.BASE_DELAY
  const MAX_RECONNECT_DELAY = RECONNECT_CONFIG.MAX_DELAY

  const getReconnectDelay = () => {
    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.value)
    return Math.min(delay, MAX_RECONNECT_DELAY)
  }

  const connect = (url = null) => {
    if (url) currentWsUrl.value = url

    stopPing()

    try {
      ws.value = new WebSocket(currentWsUrl.value)

      ws.value.onopen = () => {
        isConnected.value = true
        reconnectAttempts.value = 0 // 连接成功后重置重连次数
        console.log('WebSocket connected')
        startPing()
      }

      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'count') {
            onlineCount.value = data.count
          }
        } catch (err) {
          console.error('Parse message error:', err)
        }
      }

      ws.value.onclose = () => {
        isConnected.value = false
        console.log('WebSocket disconnected')
        stopPing()
        scheduleReconnect()
      }

      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (err) {
      console.error('WebSocket connection error:', err)
      scheduleReconnect()
    }
  }

  const startPing = () => {
    // 先清理现有的定时器
    stopPing()

    pingTimer.value = setInterval(() => {
      if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        ws.value.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  const stopPing = () => {
    if (pingTimer.value) {
      clearInterval(pingTimer.value)
      pingTimer.value = null
    }
  }

  const scheduleReconnect = () => {
    // 检查是否超过最大重连次数
    if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('Maximum reconnection attempts reached, stopping reconnect')
      return
    }

    // 清理现有的重连定时器
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value)
      reconnectTimer.value = null
    }

    const delay = getReconnectDelay()
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts.value + 1}/${MAX_RECONNECT_ATTEMPTS})`)

    reconnectTimer.value = setTimeout(() => {
      reconnectTimer.value = null
      reconnectAttempts.value++
      connect()
    }, delay)
  }

  const disconnect = () => {
    // 清理重连定时器
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value)
      reconnectTimer.value = null
    }

    // 清理 ping 定时器
    stopPing()

    // 关闭 WebSocket 连接
    if (ws.value) {
      try {
        ws.value.close(1000, 'Normal closure')
      } catch (err) {
        console.warn('Error closing WebSocket:', err)
      }
      ws.value = null
    }

    // 重置重连次数
    reconnectAttempts.value = 0
  }

  const reconnectToServer = async (newUrl) => {
    disconnect()
    currentWsUrl.value = newUrl
    // 等待一小段时间确保断开完成
    await new Promise(resolve => setTimeout(resolve, 100))
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
    reconnectToServer,
  }
}
