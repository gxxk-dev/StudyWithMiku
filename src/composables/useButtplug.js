/**
 * Buttplug.io 设备控制 composable
 *
 * 单例模式，管理设备连接和设置持久化
 */

import { ref, readonly } from 'vue'
import { safeLocalStorageGetJSON, safeLocalStorageSetJSON } from '../utils/storage.js'
import { BUTTPLUG_DEFAULTS, BUTTPLUG_STORAGE_KEYS } from './buttplug/constants.js'
import { buttplugService } from '../services/buttplugService.js'

// 模块级单例状态
const settings = ref({ ...BUTTPLUG_DEFAULTS })

let initialized = false

const initializeSettings = () => {
  const savedSettings = safeLocalStorageGetJSON(BUTTPLUG_STORAGE_KEYS.SETTINGS, null)
  if (savedSettings) {
    settings.value = { ...BUTTPLUG_DEFAULTS, ...savedSettings }
  }
}

const persistSettings = () => {
  safeLocalStorageSetJSON(BUTTPLUG_STORAGE_KEYS.SETTINGS, settings.value)
}

// === 公共 API ===

export const useButtplug = () => {
  if (!initialized) {
    initializeSettings()
    initialized = true
  }

  const connect = () => {
    return buttplugService.connect(settings.value.serverUrl)
  }

  const disconnect = () => {
    return buttplugService.disconnect()
  }

  const emergencyStop = () => {
    return buttplugService.emergencyStop()
  }

  const startScanning = () => {
    return buttplugService.startScanning()
  }

  const stopScanning = () => {
    return buttplugService.stopScanning()
  }

  const selectDevice = (index) => {
    buttplugService.selectDevice(index)
  }

  const updateSettings = (newSettings) => {
    settings.value = { ...settings.value, ...newSettings }
    persistSettings()
  }

  return {
    // 响应式状态
    settings: readonly(settings),
    connectionState: buttplugService.connectionState,
    devices: buttplugService.devices,
    selectedDeviceIndex: buttplugService.selectedDeviceIndex,
    selectedDevice: buttplugService.selectedDevice,
    lastError: buttplugService.lastError,
    isScanning: buttplugService.isScanning,

    // 连接
    connect,
    disconnect,
    emergencyStop,
    startScanning,
    stopScanning,
    selectDevice,

    // 设置
    updateSettings,

    // 服务引用
    service: buttplugService
  }
}

export const _internal = {
  resetForTesting: () => {
    settings.value = { ...BUTTPLUG_DEFAULTS }
    initialized = false
  }
}

export default useButtplug
