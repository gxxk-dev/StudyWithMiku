/**
 * Buttplug.io 设备常量定义
 */

/**
 * 连接状态枚举
 */
export const ButtplugConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SCANNING: 'scanning',
  ERROR: 'error'
}

/**
 * 默认设置
 */
export const BUTTPLUG_DEFAULTS = {
  serverUrl: 'ws://localhost:12345',
  selectedDeviceIndex: null,
  autoScan: true
}

/**
 * 存储键名
 */
export const BUTTPLUG_STORAGE_KEYS = {
  SETTINGS: 'swm_buttplug_settings',
  UNLOCKED: 'swm_buttplug_unlocked',
  CONFIRMED: 'swm_buttplug_confirmed'
}
