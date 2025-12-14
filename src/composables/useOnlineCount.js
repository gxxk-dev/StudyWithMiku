import { ref, onMounted, onUnmounted } from 'vue'

export function useOnlineCount(wsUrl) {
  const onlineCount = ref(0)
  const isConnected = ref(false)
  let ws = null
  let reconnectTimer = null
  let pingTimer = null

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        isConnected.value = true
        console.log('WebSocket connected')
        startPing()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'count') {
            onlineCount.value = data.count
          }
        } catch (err) {
          console.error('Parse message error:', err)
        }
      }

      ws.onclose = () => {
        isConnected.value = false
        console.log('WebSocket disconnected')
        stopPing()
        scheduleReconnect()
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (err) {
      console.error('WebSocket connection error:', err)
      scheduleReconnect()
    }
  }

  const startPing = () => {
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  const stopPing = () => {
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 3000)
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    stopPing()
    if (ws) {
      ws.close()
      ws = null
    }
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
  }
}
