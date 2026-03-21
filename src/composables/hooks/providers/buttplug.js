/**
 * Buttplug.io Provider
 * 通过 Buttplug.io 协议控制振动/旋转/线性/振荡等设备
 * hidden: true — 需要解锁才注册
 */

import { buttplugService } from '../../../services/buttplugService.js'
import { ButtplugConnectionState } from '../../buttplug/constants.js'

const ButtplugActionType = {
  VIBRATE: 'vibrate',
  ROTATE: 'rotate',
  LINEAR: 'linear',
  OSCILLATE: 'oscillate',
  STOP: 'stop'
}

export const buttplugProvider = {
  id: 'buttplug',
  name: 'Buttplug.io',
  icon: 'lucide:vibrate',
  hidden: true,

  actions: [
    {
      type: ButtplugActionType.VIBRATE,
      name: '振动',
      params: [
        { key: 'speed', type: 'number', label: '强度 (%)', default: 50, min: 0, max: 100, step: 5 }
      ]
    },
    {
      type: ButtplugActionType.ROTATE,
      name: '旋转',
      params: [
        { key: 'speed', type: 'number', label: '速度 (%)', default: 50, min: 0, max: 100, step: 5 }
      ]
    },
    {
      type: ButtplugActionType.LINEAR,
      name: '线性移动',
      params: [
        {
          key: 'position',
          type: 'number',
          label: '位置 (%)',
          default: 50,
          min: 0,
          max: 100,
          step: 5
        },
        {
          key: 'durationMs',
          type: 'number',
          label: '持续时间 (ms)',
          default: 500,
          min: 50,
          max: 10000
        }
      ]
    },
    {
      type: ButtplugActionType.OSCILLATE,
      name: '振荡',
      params: [
        { key: 'speed', type: 'number', label: '速度 (%)', default: 50, min: 0, max: 100, step: 5 }
      ]
    },
    {
      type: ButtplugActionType.STOP,
      name: '停止',
      params: []
    }
  ],

  isAvailable() {
    const state = buttplugService.connectionState.value
    const isConnected =
      state === ButtplugConnectionState.CONNECTED || state === ButtplugConnectionState.SCANNING
    return isConnected && buttplugService.selectedDevice.value !== null
  },

  getStatus() {
    const state = buttplugService.connectionState.value
    switch (state) {
      case ButtplugConnectionState.CONNECTED:
      case ButtplugConnectionState.SCANNING: {
        const count = buttplugService.devices.size
        if (count > 0) {
          return { available: true, label: `${count} 台设备` }
        }
        return { available: false, label: '无设备' }
      }
      case ButtplugConnectionState.CONNECTING:
        return { available: false, label: '连接中...' }
      case ButtplugConnectionState.ERROR:
        return { available: false, label: '连接错误' }
      default:
        return { available: false, label: '未连接' }
    }
  },

  execute(hook) {
    const action = hook.action
    if (!action) return

    const device = buttplugService.selectedDevice.value
    if (!device) return

    const capabilities = device.capabilities || []

    switch (action.type) {
      case ButtplugActionType.VIBRATE:
        if (capabilities.includes('vibrate')) {
          buttplugService.vibrate((action.speed || 0) / 100)
        }
        break
      case ButtplugActionType.ROTATE:
        if (capabilities.includes('rotate')) {
          buttplugService.rotate((action.speed || 0) / 100)
        }
        break
      case ButtplugActionType.LINEAR:
        if (capabilities.includes('linear')) {
          buttplugService.linear((action.position || 0) / 100, action.durationMs || 500)
        }
        break
      case ButtplugActionType.OSCILLATE:
        if (capabilities.includes('oscillate')) {
          buttplugService.oscillate((action.speed || 0) / 100)
        }
        break
      case ButtplugActionType.STOP:
        buttplugService.stopDevice()
        break
    }
  }
}
