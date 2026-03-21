/**
 * buttplug provider 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/buttplugService.js', () => {
  const { ref, computed } = require('vue')

  const connectionState = ref('disconnected')
  const devices = new Map()
  const selectedDeviceIndex = ref(null)
  const selectedDevice = computed(() => {
    if (selectedDeviceIndex.value === null) return null
    return devices.get(selectedDeviceIndex.value) ?? null
  })

  return {
    buttplugService: {
      connectionState,
      devices,
      selectedDeviceIndex,
      selectedDevice,
      lastError: ref(null),
      isScanning: ref(false),
      vibrate: vi.fn(),
      rotate: vi.fn(),
      oscillate: vi.fn(),
      linear: vi.fn(),
      stopDevice: vi.fn(),
      stopAllDevices: vi.fn(),
      emergencyStop: vi.fn(),
      _connectionState: connectionState,
      _selectedDeviceIndex: selectedDeviceIndex
    }
  }
})

import { buttplugProvider } from '@/composables/hooks/providers/buttplug.js'
import { buttplugService } from '@/services/buttplugService.js'

describe('buttplugProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buttplugService._connectionState.value = 'disconnected'
    buttplugService._selectedDeviceIndex.value = null
    buttplugService.devices.clear()
  })

  it('id 为 buttplug', () => {
    expect(buttplugProvider.id).toBe('buttplug')
  })

  it('hidden 为 true', () => {
    expect(buttplugProvider.hidden).toBe(true)
  })

  describe('isAvailable', () => {
    it('CONNECTED + 有设备时返回 true', () => {
      buttplugService._connectionState.value = 'connected'
      buttplugService.devices.set(0, {
        name: 'Test',
        displayName: 'Test',
        index: 0,
        capabilities: ['vibrate']
      })
      buttplugService._selectedDeviceIndex.value = 0
      expect(buttplugProvider.isAvailable()).toBe(true)
    })

    it('CONNECTED + 无设备时返回 false', () => {
      buttplugService._connectionState.value = 'connected'
      expect(buttplugProvider.isAvailable()).toBe(false)
    })

    it('DISCONNECTED 时返回 false', () => {
      expect(buttplugProvider.isAvailable()).toBe(false)
    })

    it('SCANNING + 有设备时返回 true', () => {
      buttplugService._connectionState.value = 'scanning'
      buttplugService.devices.set(0, {
        name: 'Test',
        displayName: 'Test',
        index: 0,
        capabilities: ['vibrate']
      })
      buttplugService._selectedDeviceIndex.value = 0
      expect(buttplugProvider.isAvailable()).toBe(true)
    })
  })

  describe('getStatus', () => {
    it('CONNECTED + 2 台设备', () => {
      buttplugService._connectionState.value = 'connected'
      buttplugService.devices.set(0, { name: 'A', index: 0, capabilities: [] })
      buttplugService.devices.set(1, { name: 'B', index: 1, capabilities: [] })
      const status = buttplugProvider.getStatus()
      expect(status.available).toBe(true)
      expect(status.label).toBe('2 台设备')
    })

    it('CONNECTED + 0 设备', () => {
      buttplugService._connectionState.value = 'connected'
      const status = buttplugProvider.getStatus()
      expect(status.available).toBe(false)
      expect(status.label).toBe('无设备')
    })

    it('CONNECTING', () => {
      buttplugService._connectionState.value = 'connecting'
      const status = buttplugProvider.getStatus()
      expect(status.available).toBe(false)
      expect(status.label).toBe('连接中...')
    })

    it('ERROR', () => {
      buttplugService._connectionState.value = 'error'
      const status = buttplugProvider.getStatus()
      expect(status.available).toBe(false)
      expect(status.label).toBe('连接错误')
    })

    it('DISCONNECTED', () => {
      buttplugService._connectionState.value = 'disconnected'
      const status = buttplugProvider.getStatus()
      expect(status.available).toBe(false)
      expect(status.label).toBe('未连接')
    })
  })

  describe('execute', () => {
    beforeEach(() => {
      buttplugService._connectionState.value = 'connected'
      buttplugService.devices.set(0, {
        name: 'Test',
        displayName: 'Test',
        index: 0,
        capabilities: ['vibrate', 'rotate', 'oscillate', 'linear']
      })
      buttplugService._selectedDeviceIndex.value = 0
    })

    it('vibrate action 调用 buttplugService.vibrate', () => {
      buttplugProvider.execute({ action: { type: 'vibrate', speed: 50 } })
      expect(buttplugService.vibrate).toHaveBeenCalledWith(0.5)
    })

    it('rotate action 调用 buttplugService.rotate', () => {
      buttplugProvider.execute({ action: { type: 'rotate', speed: 80 } })
      expect(buttplugService.rotate).toHaveBeenCalledWith(0.8)
    })

    it('linear action 调用 buttplugService.linear', () => {
      buttplugProvider.execute({ action: { type: 'linear', position: 100, durationMs: 1000 } })
      expect(buttplugService.linear).toHaveBeenCalledWith(1, 1000)
    })

    it('oscillate action 调用 buttplugService.oscillate', () => {
      buttplugProvider.execute({ action: { type: 'oscillate', speed: 60 } })
      expect(buttplugService.oscillate).toHaveBeenCalledWith(0.6)
    })

    it('stop action 调用 buttplugService.stopDevice', () => {
      buttplugProvider.execute({ action: { type: 'stop' } })
      expect(buttplugService.stopDevice).toHaveBeenCalled()
    })

    it('设备不支持的能力不调用方法', () => {
      buttplugService.devices.set(0, {
        name: 'Test',
        displayName: 'Test',
        index: 0,
        capabilities: ['vibrate']
      })
      buttplugProvider.execute({ action: { type: 'rotate', speed: 50 } })
      expect(buttplugService.rotate).not.toHaveBeenCalled()
    })

    it('无 selectedDevice 时不调用任何方法', () => {
      buttplugService._selectedDeviceIndex.value = null
      buttplugProvider.execute({ action: { type: 'vibrate', speed: 50 } })
      expect(buttplugService.vibrate).not.toHaveBeenCalled()
    })

    it('无 action 时静默返回', () => {
      buttplugProvider.execute({})
      expect(buttplugService.vibrate).not.toHaveBeenCalled()
      expect(buttplugService.rotate).not.toHaveBeenCalled()
      expect(buttplugService.stopDevice).not.toHaveBeenCalled()
    })
  })
})
