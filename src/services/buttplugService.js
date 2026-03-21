/**
 * Buttplug.io 设备服务
 * 管理 ButtplugClient 生命周期、设备发现和命令发送
 */

import { ref, readonly, computed, shallowReactive } from 'vue'
import { ButtplugConnectionState } from '../composables/buttplug/constants.js'

const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_BASE_DELAY = 1000
const RECONNECT_MAX_DELAY = 30000

// 响应式状态
const connectionState = ref(ButtplugConnectionState.DISCONNECTED)
const devices = shallowReactive(new Map())
const selectedDeviceIndex = ref(null)
const lastError = ref(null)
const isScanning = ref(false)

// 内部状态
let client = null
let reconnectAttempts = 0
let reconnectTimer = null
let currentServerUrl = ''
let intentionalDisconnect = false

const selectedDevice = computed(() => {
  if (selectedDeviceIndex.value === null) return null
  return devices.get(selectedDeviceIndex.value) ?? null
})

/**
 * 获取 ButtplugClient 上的真实设备实例
 */
const getRawDevice = (index) => {
  if (index === null || index === undefined || !client) return null
  return client.devices.get(index) ?? null
}

/**
 * 序列化设备信息
 */
const serializeDevice = async (device, OutputType) => {
  const capabilities = []
  if (device.hasOutput(OutputType.Vibrate)) capabilities.push('vibrate')
  if (device.hasOutput(OutputType.Rotate)) capabilities.push('rotate')
  if (device.hasOutput(OutputType.Oscillate)) capabilities.push('oscillate')
  if (device.hasOutput(OutputType.Position) || device.hasOutput(OutputType.PositionWithDuration)) {
    capabilities.push('linear')
  }
  return {
    name: device.name,
    displayName: device.displayName || device.name,
    index: device.index,
    capabilities
  }
}

/**
 * 计算重连延迟（指数退避）
 */
const getReconnectDelay = () => {
  return Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), RECONNECT_MAX_DELAY)
}

/**
 * 清理连接资源
 */
const cleanup = async () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (client) {
    try {
      if (client.connected) {
        await client.stopAllDevices()
        await client.disconnect()
      }
    } catch {
      // 忽略清理错误
    }
    client.removeAllListeners()
    client = null
  }
  isScanning.value = false
}

/**
 * 安排重连
 */
const scheduleReconnect = () => {
  if (reconnectTimer || intentionalDisconnect) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    connectionState.value = ButtplugConnectionState.ERROR
    lastError.value = `重连失败（已尝试 ${MAX_RECONNECT_ATTEMPTS} 次）`
    return
  }

  reconnectAttempts++
  const delay = getReconnectDelay()
  console.debug(`[ButtplugService] ${delay}ms 后尝试重连 (第 ${reconnectAttempts} 次)`)

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect(currentServerUrl)
  }, delay)
}

// === 公共 API ===

/**
 * 连接到 Intiface Central
 * @param {string} serverUrl - WebSocket 服务器地址
 * @returns {Promise<boolean>} 连接是否成功
 */
const connect = async (serverUrl) => {
  await cleanup()
  intentionalDisconnect = false
  currentServerUrl = serverUrl

  connectionState.value = ButtplugConnectionState.CONNECTING
  lastError.value = null
  devices.clear()
  selectedDeviceIndex.value = null

  console.debug(`[ButtplugService] 正在连接: ${serverUrl}`)

  try {
    const { ButtplugClient, ButtplugBrowserWebsocketClientConnector, Messages } =
      await import('buttplug')
    const OutputType = Messages.OutputType

    client = new ButtplugClient('Study with Miku')
    const connector = new ButtplugBrowserWebsocketClientConnector(serverUrl)

    client.on('deviceadded', async (device) => {
      const serialized = await serializeDevice(device, OutputType)
      devices.set(device.index, serialized)
      // 自动选中第一个设备
      if (selectedDeviceIndex.value === null) {
        selectedDeviceIndex.value = device.index
      }
      console.log('[ButtplugService] 设备已添加:', serialized.displayName)
    })

    client.on('deviceremoved', (device) => {
      devices.delete(device.index)
      // 选中设备被移除时自动切换
      if (selectedDeviceIndex.value === device.index) {
        const remaining = [...devices.keys()]
        selectedDeviceIndex.value = remaining.length > 0 ? remaining[0] : null
      }
      console.log('[ButtplugService] 设备已移除:', device.name)
    })

    client.on('scanningfinished', () => {
      isScanning.value = false
      if (connectionState.value === ButtplugConnectionState.SCANNING) {
        connectionState.value = ButtplugConnectionState.CONNECTED
      }
    })

    client.on('disconnect', () => {
      const wasConnected =
        connectionState.value === ButtplugConnectionState.CONNECTED ||
        connectionState.value === ButtplugConnectionState.SCANNING
      connectionState.value = ButtplugConnectionState.DISCONNECTED
      isScanning.value = false
      console.debug('[ButtplugService] 连接已断开')

      if (wasConnected && !intentionalDisconnect) {
        scheduleReconnect()
      }
    })

    await client.connect(connector)
    connectionState.value = ButtplugConnectionState.CONNECTED
    reconnectAttempts = 0
    console.log('[ButtplugService] 已连接到 Intiface Central')
    return true
  } catch (err) {
    connectionState.value = ButtplugConnectionState.ERROR
    lastError.value = err.message || '连接失败'
    console.error('[ButtplugService] 连接失败:', err)
    client = null
    return false
  }
}

/**
 * 断开连接
 */
const disconnect = async () => {
  intentionalDisconnect = true
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS
  await cleanup()
  connectionState.value = ButtplugConnectionState.DISCONNECTED
  devices.clear()
  selectedDeviceIndex.value = null
  lastError.value = null
  console.debug('[ButtplugService] 已断开连接')
}

/**
 * 开始扫描设备
 */
const startScanning = async () => {
  if (!client?.connected) return
  try {
    await client.startScanning()
    isScanning.value = true
    connectionState.value = ButtplugConnectionState.SCANNING
  } catch (err) {
    console.warn('[ButtplugService] 扫描启动失败:', err)
    lastError.value = err.message
  }
}

/**
 * 停止扫描
 */
const stopScanning = async () => {
  if (!client?.connected) return
  try {
    await client.stopScanning()
    isScanning.value = false
    if (connectionState.value === ButtplugConnectionState.SCANNING) {
      connectionState.value = ButtplugConnectionState.CONNECTED
    }
  } catch (err) {
    console.warn('[ButtplugService] 停止扫描失败:', err)
  }
}

/**
 * 选择设备
 * @param {number} index - 设备索引
 */
const selectDevice = (index) => {
  if (devices.has(index)) {
    selectedDeviceIndex.value = index
  }
}

/**
 * 振动
 * @param {number} speed - 速度 (0-1)
 */
const vibrate = async (speed) => {
  const device = getRawDevice(selectedDeviceIndex.value)
  if (!device) return
  try {
    const { DeviceOutput } = await import('buttplug')
    await device.runOutput(DeviceOutput.Vibrate.percent(speed))
  } catch (err) {
    console.warn('[ButtplugService] 振动命令失败:', err)
  }
}

/**
 * 旋转
 * @param {number} speed - 速度 (0-1)
 */
const rotate = async (speed) => {
  const device = getRawDevice(selectedDeviceIndex.value)
  if (!device) return
  try {
    const { DeviceOutput } = await import('buttplug')
    await device.runOutput(DeviceOutput.Rotate.percent(speed))
  } catch (err) {
    console.warn('[ButtplugService] 旋转命令失败:', err)
  }
}

/**
 * 振荡
 * @param {number} speed - 速度 (0-1)
 */
const oscillate = async (speed) => {
  const device = getRawDevice(selectedDeviceIndex.value)
  if (!device) return
  try {
    const { DeviceOutput } = await import('buttplug')
    await device.runOutput(DeviceOutput.Oscillate.percent(speed))
  } catch (err) {
    console.warn('[ButtplugService] 振荡命令失败:', err)
  }
}

/**
 * 线性移动
 * @param {number} position - 位置 (0-1)
 * @param {number} durationMs - 持续时间 (ms)
 */
const linear = async (position, durationMs) => {
  const device = getRawDevice(selectedDeviceIndex.value)
  if (!device) return
  try {
    const { DeviceOutput } = await import('buttplug')
    await device.runOutput(DeviceOutput.PositionWithDuration.percent(position, durationMs))
  } catch (err) {
    console.warn('[ButtplugService] 线性移动命令失败:', err)
  }
}

/**
 * 停止当前设备
 */
const stopDevice = async () => {
  const device = getRawDevice(selectedDeviceIndex.value)
  if (!device) return
  try {
    await device.stop()
  } catch (err) {
    console.warn('[ButtplugService] 停止设备失败:', err)
  }
}

/**
 * 停止所有设备
 */
const stopAllDevices = async () => {
  if (!client?.connected) return
  try {
    await client.stopAllDevices()
  } catch (err) {
    console.warn('[ButtplugService] 停止所有设备失败:', err)
  }
}

/**
 * 紧急停止：停止所有设备 + 断开连接
 */
const emergencyStop = async () => {
  await stopAllDevices()
  await disconnect()
}

// beforeunload 清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (client?.connected) {
      try {
        client.stopAllDevices()
        client.disconnect()
      } catch {
        // 忽略卸载时的错误
      }
    }
  })
}

export const buttplugService = {
  // 响应式状态（只读）
  connectionState: readonly(connectionState),
  devices,
  selectedDeviceIndex: readonly(selectedDeviceIndex),
  selectedDevice,
  lastError: readonly(lastError),
  isScanning: readonly(isScanning),

  // 连接
  connect,
  disconnect,
  startScanning,
  stopScanning,
  selectDevice,

  // 命令
  vibrate,
  rotate,
  oscillate,
  linear,
  stopDevice,
  stopAllDevices,
  emergencyStop
}

export default buttplugService
