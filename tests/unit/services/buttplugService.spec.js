/**
 * buttplugService 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock buttplug 包 — 共享 mock 对象
const mockDevice = {
  name: 'Test Vibrator',
  displayName: 'Test Vibrator',
  index: 0,
  hasOutput: vi.fn(),
  runOutput: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  features: new Map()
}

// 事件处理器收集器
const eventHandlers = {}

const mockClient = {
  connected: false,
  devices: new Map(),
  isScanning: false,
  connect: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
  startScanning: vi.fn().mockResolvedValue(undefined),
  stopScanning: vi.fn().mockResolvedValue(undefined),
  stopAllDevices: vi.fn().mockResolvedValue(undefined),
  on: vi.fn((event, handler) => {
    eventHandlers[event] = handler
  }),
  removeAllListeners: vi.fn()
}

const mockDeviceOutput = {
  Vibrate: { percent: vi.fn().mockReturnValue('vibrate-cmd') },
  Rotate: { percent: vi.fn().mockReturnValue('rotate-cmd') },
  Oscillate: { percent: vi.fn().mockReturnValue('oscillate-cmd') },
  PositionWithDuration: { percent: vi.fn().mockReturnValue('linear-cmd') }
}

const mockOutputType = {
  Vibrate: 'Vibrate',
  Rotate: 'Rotate',
  Oscillate: 'Oscillate',
  Position: 'Position',
  PositionWithDuration: 'PositionWithDuration'
}

vi.mock('buttplug', () => {
  const ClientConstructor = function () {
    return mockClient
  }
  const ConnectorConstructor = function () {}

  return {
    ButtplugClient: ClientConstructor,
    ButtplugBrowserWebsocketClientConnector: ConnectorConstructor,
    DeviceOutput: mockDeviceOutput,
    Messages: { OutputType: mockOutputType }
  }
})

import { buttplugService } from '@/services/buttplugService.js'

describe('buttplugService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // 重置 mock 状态
    mockClient.connected = false
    mockClient.devices.clear()
    mockClient.connect.mockResolvedValue(undefined)
    mockDevice.hasOutput.mockReturnValue(false)
    mockDevice.runOutput.mockResolvedValue(undefined)
    mockDevice.stop.mockResolvedValue(undefined)
    // 重置事件处理器
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k])
    // 重新绑定 on mock
    mockClient.on.mockImplementation((event, handler) => {
      eventHandlers[event] = handler
    })
    // 断开连接以重置服务状态
    await buttplugService.disconnect()
  })

  describe('初始状态', () => {
    it('connectionState 为 disconnected', () => {
      expect(buttplugService.connectionState.value).toBe('disconnected')
    })

    it('devices 为空', () => {
      expect(buttplugService.devices.size).toBe(0)
    })

    it('selectedDeviceIndex 为 null', () => {
      expect(buttplugService.selectedDeviceIndex.value).toBeNull()
    })
  })

  describe('connect', () => {
    it('成功连接后 connectionState 为 connected', async () => {
      mockClient.connect.mockImplementation(() => {
        mockClient.connected = true
        return Promise.resolve()
      })

      const result = await buttplugService.connect('ws://localhost:12345')
      expect(result).toBe(true)
      expect(buttplugService.connectionState.value).toBe('connected')
    })

    it('连接失败后 connectionState 为 error', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection refused'))

      const result = await buttplugService.connect('ws://localhost:12345')
      expect(result).toBe(false)
      expect(buttplugService.connectionState.value).toBe('error')
      expect(buttplugService.lastError.value).toBe('Connection refused')
    })
  })

  describe('disconnect', () => {
    it('断开后清理状态', async () => {
      mockClient.connect.mockImplementation(() => {
        mockClient.connected = true
        return Promise.resolve()
      })
      await buttplugService.connect('ws://localhost:12345')
      await buttplugService.disconnect()

      expect(buttplugService.connectionState.value).toBe('disconnected')
      expect(buttplugService.devices.size).toBe(0)
      expect(buttplugService.selectedDeviceIndex.value).toBeNull()
    })
  })

  describe('设备管理', () => {
    beforeEach(async () => {
      mockClient.connect.mockImplementation(() => {
        mockClient.connected = true
        return Promise.resolve()
      })
      mockDevice.hasOutput.mockReturnValue(false)
      await buttplugService.connect('ws://localhost:12345')
    })

    it('deviceadded 事件更新 devices 并自动选中首个设备', async () => {
      await eventHandlers.deviceadded(mockDevice)

      expect(buttplugService.devices.size).toBe(1)
      expect(buttplugService.selectedDeviceIndex.value).toBe(0)
    })

    it('deviceremoved 事件更新 devices，选中设备被移除时自动切换', async () => {
      const device2 = { ...mockDevice, index: 1, name: 'Device 2', hasOutput: vi.fn() }
      device2.hasOutput.mockReturnValue(false)

      await eventHandlers.deviceadded(mockDevice)
      await eventHandlers.deviceadded(device2)

      expect(buttplugService.devices.size).toBe(2)
      expect(buttplugService.selectedDeviceIndex.value).toBe(0)

      // 移除选中的设备
      eventHandlers.deviceremoved(mockDevice)
      expect(buttplugService.devices.size).toBe(1)
      expect(buttplugService.selectedDeviceIndex.value).toBe(1)
    })

    it('selectDevice 更新 selectedDeviceIndex', async () => {
      const device2 = { ...mockDevice, index: 1, name: 'Device 2', hasOutput: vi.fn() }
      device2.hasOutput.mockReturnValue(false)

      await eventHandlers.deviceadded(mockDevice)
      await eventHandlers.deviceadded(device2)

      buttplugService.selectDevice(1)
      expect(buttplugService.selectedDeviceIndex.value).toBe(1)
    })
  })

  describe('命令方法', () => {
    beforeEach(async () => {
      mockClient.connect.mockImplementation(() => {
        mockClient.connected = true
        return Promise.resolve()
      })
      mockDevice.hasOutput.mockReturnValue(true)
      mockClient.devices.set(0, mockDevice)

      await buttplugService.connect('ws://localhost:12345')
      await eventHandlers.deviceadded(mockDevice)
    })

    it('vibrate 调用 device.runOutput', async () => {
      await buttplugService.vibrate(0.5)
      expect(mockDeviceOutput.Vibrate.percent).toHaveBeenCalledWith(0.5)
      expect(mockDevice.runOutput).toHaveBeenCalledWith('vibrate-cmd')
    })

    it('rotate 调用 device.runOutput', async () => {
      await buttplugService.rotate(0.75)
      expect(mockDeviceOutput.Rotate.percent).toHaveBeenCalledWith(0.75)
      expect(mockDevice.runOutput).toHaveBeenCalledWith('rotate-cmd')
    })

    it('oscillate 调用 device.runOutput', async () => {
      await buttplugService.oscillate(0.6)
      expect(mockDeviceOutput.Oscillate.percent).toHaveBeenCalledWith(0.6)
      expect(mockDevice.runOutput).toHaveBeenCalledWith('oscillate-cmd')
    })

    it('linear 调用 device.runOutput', async () => {
      await buttplugService.linear(0.5, 1000)
      expect(mockDeviceOutput.PositionWithDuration.percent).toHaveBeenCalledWith(0.5, 1000)
      expect(mockDevice.runOutput).toHaveBeenCalledWith('linear-cmd')
    })

    it('stopDevice 调用 device.stop', async () => {
      await buttplugService.stopDevice()
      expect(mockDevice.stop).toHaveBeenCalled()
    })

    it('无设备时静默返回', async () => {
      buttplugService.selectDevice(999)
      await buttplugService.vibrate(0.5)
      // 不应该抛错，且 runOutput 不应被调用（新调用）
    })
  })

  describe('emergencyStop', () => {
    it('调用后状态变为 disconnected', async () => {
      mockClient.connect.mockImplementation(() => {
        mockClient.connected = true
        return Promise.resolve()
      })

      await buttplugService.connect('ws://localhost:12345')
      await buttplugService.emergencyStop()

      expect(buttplugService.connectionState.value).toBe('disconnected')
    })
  })
})
