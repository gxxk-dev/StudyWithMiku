/**
 * DG-Lab 郊狼 WebSocket 协议服务
 * 管理与 DG-Lab WebSocket 服务器的连接、心跳、重连和指令发送
 */

import { ref, readonly } from 'vue'
import {
  CoyoteConnectionState,
  CoyoteChannel,
  StrengthMode
} from '../composables/coyote/constants.js'

// 协议常量
const HEARTBEAT_INTERVAL = 20000
const CONNECTION_TIMEOUT = 5000
const MAX_RECONNECT_ATTEMPTS = 10
const MAX_MESSAGE_LENGTH = 1950
const MAX_PULSE_PER_MESSAGE = 100
const RECONNECT_BASE_DELAY = 1000
const RECONNECT_MAX_DELAY = 30000

// 响应式状态
const connectionState = ref(CoyoteConnectionState.DISCONNECTED)
const clientId = ref('')
const targetId = ref('')
const lastError = ref(null)
const strengthA = ref(0)
const strengthB = ref(0)

// 内部状态
let ws = null
let heartbeatInterval = null
let reconnectAttempts = 0
let reconnectTimer = null
let currentServerUrl = ''
let intentionalDisconnect = false

/**
 * 计算重连延迟（指数退避）
 */
const getReconnectDelay = () => {
  return Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), RECONNECT_MAX_DELAY)
}

/**
 * 清理连接资源
 */
const cleanup = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
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
      ws.close(1000, 'Cleanup')
    }
    ws = null
  }
}

/**
 * 发送消息到 WebSocket
 * @param {Object} msg - 消息对象
 */
const sendMessage = (msg) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false
  const json = JSON.stringify(msg)
  if (json.length > MAX_MESSAGE_LENGTH) {
    console.warn('[CoyoteService] 消息超出长度限制:', json.length)
    return false
  }
  ws.send(json)
  return true
}

/**
 * 启动心跳
 */
const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'heartbeat',
        clientId: clientId.value,
        targetId: targetId.value,
        message: ''
      })
    }
  }, HEARTBEAT_INTERVAL)
}

/**
 * 安排重连
 */
const scheduleReconnect = () => {
  if (reconnectTimer || intentionalDisconnect) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    connectionState.value = CoyoteConnectionState.ERROR
    lastError.value = `重连失败（已尝试 ${MAX_RECONNECT_ATTEMPTS} 次）`
    return
  }

  reconnectAttempts++
  const delay = getReconnectDelay()
  console.debug(`[CoyoteService] ${delay}ms 后尝试重连 (第 ${reconnectAttempts} 次)`)

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect(currentServerUrl)
  }, delay)
}

/**
 * 处理服务器消息
 * @param {MessageEvent} event
 */
const handleMessage = (event) => {
  try {
    const data = JSON.parse(event.data)

    switch (data.type) {
      case 'bind':
        if (data.clientId && !clientId.value) {
          // 服务器分配 clientId
          clientId.value = data.clientId
          connectionState.value = CoyoteConnectionState.WAITING_BIND
          console.log('[CoyoteService] 已获取 clientId:', data.clientId)
        }
        if (data.message === '200' && data.targetId) {
          // 设备绑定成功
          targetId.value = data.targetId
          connectionState.value = CoyoteConnectionState.BOUND
          reconnectAttempts = 0
          console.log('[CoyoteService] 设备已绑定:', data.targetId)
        }
        break

      case 'break':
        // 设备端主动断开
        console.log('[CoyoteService] 设备端断开连接')
        targetId.value = ''
        connectionState.value = CoyoteConnectionState.WAITING_BIND
        break

      case 'msg':
        // 解析强度反馈: strength-{channel}+{value}
        if (data.message && data.message.startsWith('strength-')) {
          parseStrengthFeedback(data.message)
        }
        break

      case 'heartbeat':
        // 心跳响应，无需处理
        break

      default:
        console.debug('[CoyoteService] 未知消息类型:', data.type)
    }
  } catch (err) {
    console.warn('[CoyoteService] 解析消息失败:', err)
  }
}

/**
 * 解析强度反馈消息
 * @param {string} message - 强度消息
 */
const parseStrengthFeedback = (message) => {
  const match = message.match(/strength-(\d)\+(\d+)/)
  if (!match) return
  const channel = parseInt(match[1])
  const value = parseInt(match[2])
  if (channel === 1) strengthA.value = value
  else if (channel === 2) strengthB.value = value
}

/**
 * 将通道标识转换为协议编号
 * @param {string} channel - 'A' 或 'B'
 * @returns {number} 1 或 2
 */
const channelToNumber = (channel) => {
  return channel === CoyoteChannel.B ? 2 : 1
}

/**
 * 限制强度值到安全范围
 * @param {number} value - 强度值
 * @param {number} maxStrength - 最大强度上限
 * @returns {number}
 */
const clampStrength = (value, maxStrength) => {
  return Math.max(0, Math.min(value, maxStrength, 200))
}

// === 公共 API ===

/**
 * 连接到 DG-Lab WebSocket 服务器
 * @param {string} serverUrl - 服务器地址
 * @returns {Promise<boolean>} 连接是否成功
 */
const connect = (serverUrl) => {
  return new Promise((resolve) => {
    cleanup()
    intentionalDisconnect = false
    currentServerUrl = serverUrl

    connectionState.value = CoyoteConnectionState.CONNECTING
    lastError.value = null
    clientId.value = ''
    targetId.value = ''

    console.debug(`[CoyoteService] 正在连接: ${serverUrl}`)

    try {
      ws = new WebSocket(serverUrl)
    } catch (err) {
      connectionState.value = CoyoteConnectionState.ERROR
      lastError.value = err.message
      console.error('[CoyoteService] 创建 WebSocket 失败:', err)
      resolve(false)
      return
    }

    const connectionTimeout = setTimeout(() => {
      if (connectionState.value === CoyoteConnectionState.CONNECTING) {
        connectionState.value = CoyoteConnectionState.ERROR
        lastError.value = '连接超时'
        cleanup()
        resolve(false)
      }
    }, CONNECTION_TIMEOUT)

    ws.onopen = () => {
      clearTimeout(connectionTimeout)
      console.log('[CoyoteService] WebSocket 连接已建立')
      startHeartbeat()
      resolve(true)
    }

    ws.onmessage = handleMessage

    ws.onclose = () => {
      clearTimeout(connectionTimeout)
      const wasBound = connectionState.value === CoyoteConnectionState.BOUND
      const wasWaiting = connectionState.value === CoyoteConnectionState.WAITING_BIND
      connectionState.value = CoyoteConnectionState.DISCONNECTED
      console.debug('[CoyoteService] 连接关闭')

      if ((wasBound || wasWaiting) && !intentionalDisconnect) {
        scheduleReconnect()
      }
    }

    ws.onerror = (event) => {
      clearTimeout(connectionTimeout)
      connectionState.value = CoyoteConnectionState.ERROR
      lastError.value = '连接错误'
      console.error('[CoyoteService] WebSocket 错误:', event)
    }
  })
}

/**
 * 断开连接
 */
const disconnect = () => {
  intentionalDisconnect = true
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS
  cleanup()
  connectionState.value = CoyoteConnectionState.DISCONNECTED
  clientId.value = ''
  targetId.value = ''
  strengthA.value = 0
  strengthB.value = 0
  console.debug('[CoyoteService] 已断开连接')
}

/**
 * 设置通道强度
 * @param {string} channel - 通道 'A' 或 'B'
 * @param {number} value - 强度值
 * @param {number} maxStrength - 最大强度上限
 */
const setStrength = (channel, value, maxStrength) => {
  if (connectionState.value !== CoyoteConnectionState.BOUND) return
  const clamped = clampStrength(value, maxStrength)
  const ch = channelToNumber(channel)
  sendMessage({
    type: 'msg',
    clientId: clientId.value,
    targetId: targetId.value,
    message: `strength-${ch}+${StrengthMode.SET}+${clamped}`
  })
}

/**
 * 增加通道强度
 * @param {string} channel - 通道 'A' 或 'B'
 * @param {number} value - 增加值
 * @param {number} maxStrength - 最大强度上限
 */
const increaseStrength = (channel, value, maxStrength) => {
  if (connectionState.value !== CoyoteConnectionState.BOUND) return
  const ch = channelToNumber(channel)
  const currentVal = ch === 1 ? strengthA.value : strengthB.value
  const clamped = clampStrength(value, maxStrength - currentVal)
  if (clamped <= 0) return
  sendMessage({
    type: 'msg',
    clientId: clientId.value,
    targetId: targetId.value,
    message: `strength-${ch}+${StrengthMode.INCREASE}+${clamped}`
  })
}

/**
 * 减少通道强度
 * @param {string} channel - 通道 'A' 或 'B'
 * @param {number} value - 减少值
 * @param {number} maxStrength - 最大强度上限
 */
const decreaseStrength = (channel, value, _maxStrength) => {
  if (connectionState.value !== CoyoteConnectionState.BOUND) return
  const clamped = Math.max(0, Math.min(value, 200))
  const ch = channelToNumber(channel)
  sendMessage({
    type: 'msg',
    clientId: clientId.value,
    targetId: targetId.value,
    message: `strength-${ch}+${StrengthMode.DECREASE}+${clamped}`
  })
}

/**
 * 发送脉冲波形
 * @param {string} channel - 通道 'A' 或 'B'
 * @param {string[]} hexPatterns - hex 波形数据数组
 */
const sendPulse = (channel, hexPatterns) => {
  if (connectionState.value !== CoyoteConnectionState.BOUND) return
  if (!hexPatterns || hexPatterns.length === 0) return

  const ch = channel === CoyoteChannel.B ? 'B' : 'A'

  // 分包发送，每包最多 MAX_PULSE_PER_MESSAGE 条
  for (let i = 0; i < hexPatterns.length; i += MAX_PULSE_PER_MESSAGE) {
    const chunk = hexPatterns.slice(i, i + MAX_PULSE_PER_MESSAGE)
    const patternsJson = JSON.stringify(chunk)
    sendMessage({
      type: 'msg',
      clientId: clientId.value,
      targetId: targetId.value,
      message: `pulse-${ch}:${patternsJson}`
    })
  }
}

/**
 * 清除通道队列
 * @param {string} channel - 通道 'A' 或 'B'
 */
const clearChannel = (channel) => {
  if (connectionState.value !== CoyoteConnectionState.BOUND) return
  const ch = channelToNumber(channel)
  sendMessage({
    type: 'msg',
    clientId: clientId.value,
    targetId: targetId.value,
    message: `clear-${ch}`
  })
}

/**
 * 获取用于生成二维码的绑定数据
 * 格式: https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#wss://ws.dungeon-lab.cn/{clientId}
 * @returns {string|null} 绑定数据字符串
 */
const getBindQrData = () => {
  if (!clientId.value || !currentServerUrl) return null
  // 拼接服务器地址和 clientId（去掉末尾斜杠后追加）
  const base = currentServerUrl.replace(/\/+$/, '')
  return `https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${base}/${clientId.value}`
}

/**
 * 紧急停止：清除双通道 + 断开连接
 */
const emergencyStop = () => {
  if (connectionState.value === CoyoteConnectionState.BOUND) {
    clearChannel(CoyoteChannel.A)
    clearChannel(CoyoteChannel.B)
  }
  disconnect()
}

export const coyoteService = {
  // 响应式状态（只读）
  connectionState: readonly(connectionState),
  clientId: readonly(clientId),
  targetId: readonly(targetId),
  lastError: readonly(lastError),
  strengthA: readonly(strengthA),
  strengthB: readonly(strengthB),

  // 连接
  connect,
  disconnect,

  // 指令
  setStrength,
  increaseStrength,
  decreaseStrength,
  sendPulse,
  clearChannel,

  // 辅助
  getBindQrData,
  emergencyStop
}

export default coyoteService
