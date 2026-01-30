/**
 * src/services/runtimeConfig.js 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  UI_CONFIG as DEFAULT_UI_CONFIG,
  AUDIO_CONFIG as DEFAULT_AUDIO_CONFIG,
  CACHE_CONFIG as DEFAULT_CACHE_CONFIG,
  WS_CONFIG as DEFAULT_WS_CONFIG,
  RECONNECT_CONFIG as DEFAULT_RECONNECT_CONFIG,
  API_CONFIG as DEFAULT_API_CONFIG
} from '@/config/constants.js'

describe('runtimeConfig.js', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const getModule = async () => {
    return await import('@/services/runtimeConfig.js')
  }

  describe('getConfig 函数', () => {
    it('应该获取单个配置值', async () => {
      const { getConfig } = await getModule()

      const value = getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')

      expect(value).toBe(DEFAULT_UI_CONFIG.TOAST_DEFAULT_DURATION)
    })

    it('应该获取整个配置组', async () => {
      const { getConfig } = await getModule()

      const config = getConfig('UI_CONFIG')

      expect(config).toEqual(DEFAULT_UI_CONFIG)
    })

    it('无效配置组应该返回 undefined', async () => {
      const { getConfig } = await getModule()

      const result = getConfig('INVALID_CONFIG')

      expect(result).toBeUndefined()
    })

    it('无效配置键应该返回 undefined', async () => {
      const { getConfig } = await getModule()

      const result = getConfig('UI_CONFIG', 'INVALID_KEY')

      expect(result).toBeUndefined()
    })
  })

  describe('get 方法', () => {
    it('应该获取指定配置组的副本', async () => {
      const { runtimeConfigService } = await getModule()

      const config = runtimeConfigService.get('UI_CONFIG')

      expect(config).toEqual(DEFAULT_UI_CONFIG)
    })

    it('不传参数应该返回所有配置', async () => {
      const { runtimeConfigService } = await getModule()

      const allConfig = runtimeConfigService.get()

      expect(allConfig).toHaveProperty('UI_CONFIG')
      expect(allConfig).toHaveProperty('AUDIO_CONFIG')
      expect(allConfig).toHaveProperty('CACHE_CONFIG')
      expect(allConfig).toHaveProperty('WS_CONFIG')
      expect(allConfig).toHaveProperty('RECONNECT_CONFIG')
      expect(allConfig).toHaveProperty('API_CONFIG')
    })

    it('无效配置组应该返回 null 并输出警告', async () => {
      const { runtimeConfigService } = await getModule()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = runtimeConfigService.get('INVALID_CONFIG')

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith('[RuntimeConfig] 未知的配置组: INVALID_CONFIG')
    })

    it('返回的配置应该是副本而非原始引用', async () => {
      const { runtimeConfigService } = await getModule()

      const config1 = runtimeConfigService.get('UI_CONFIG')
      config1.TOAST_DEFAULT_DURATION = 99999

      const config2 = runtimeConfigService.get('UI_CONFIG')
      expect(config2.TOAST_DEFAULT_DURATION).toBe(DEFAULT_UI_CONFIG.TOAST_DEFAULT_DURATION)
    })
  })

  describe('set 方法', () => {
    it('应该成功设置配置值并返回 true', async () => {
      const { runtimeConfigService } = await getModule()
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 5000)

      expect(result).toBe(true)
    })

    it('无效配置组应该返回 false 并输出错误', async () => {
      const { runtimeConfigService } = await getModule()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = runtimeConfigService.set('INVALID_CONFIG', 'KEY', 123)

      expect(result).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith('[RuntimeConfig] 未知的配置组: INVALID_CONFIG')
    })

    it('无效配置键应该返回 false 并输出错误', async () => {
      const { runtimeConfigService } = await getModule()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = runtimeConfigService.set('UI_CONFIG', 'INVALID_KEY', 123)

      expect(result).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith('[RuntimeConfig] 未知的配置键: UI_CONFIG.INVALID_KEY')
    })

    it('设置后值应该立即生效', async () => {
      const { runtimeConfigService, getConfig } = await getModule()
      vi.spyOn(console, 'log').mockImplementation(() => {})

      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 8000)

      expect(getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')).toBe(8000)
      expect(runtimeConfigService.get('UI_CONFIG').TOAST_DEFAULT_DURATION).toBe(8000)
    })

    it('设置时应该输出变更日志', async () => {
      const { runtimeConfigService } = await getModule()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 5000)

      expect(logSpy).toHaveBeenCalledWith(
        `[RuntimeConfig] UI_CONFIG.TOAST_DEFAULT_DURATION: ${DEFAULT_UI_CONFIG.TOAST_DEFAULT_DURATION} → 5000`
      )
    })
  })

  describe('reset 方法', () => {
    it('应该重置单个配置组', async () => {
      const { runtimeConfigService, getConfig } = await getModule()
      vi.spyOn(console, 'log').mockImplementation(() => {})

      // 先修改配置
      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 9999)
      expect(getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')).toBe(9999)

      // 重置
      const result = runtimeConfigService.reset('UI_CONFIG')

      expect(result).toBe(true)
      expect(getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')).toBe(
        DEFAULT_UI_CONFIG.TOAST_DEFAULT_DURATION
      )
    })

    it('应该重置所有配置', async () => {
      const { runtimeConfigService, getConfig } = await getModule()
      vi.spyOn(console, 'log').mockImplementation(() => {})

      // 修改多个配置组
      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 9999)
      runtimeConfigService.set('AUDIO_CONFIG', 'DEFAULT_VOLUME', 0.1)

      // 重置所有
      const result = runtimeConfigService.reset()

      expect(result).toBe(true)
      expect(getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')).toBe(
        DEFAULT_UI_CONFIG.TOAST_DEFAULT_DURATION
      )
      expect(getConfig('AUDIO_CONFIG', 'DEFAULT_VOLUME')).toBe(DEFAULT_AUDIO_CONFIG.DEFAULT_VOLUME)
    })

    it('无效配置组应该返回 false 并输出错误', async () => {
      const { runtimeConfigService } = await getModule()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = runtimeConfigService.reset('INVALID_CONFIG')

      expect(result).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith('[RuntimeConfig] 未知的配置组: INVALID_CONFIG')
    })

    it('重置后应该恢复默认值', async () => {
      const { runtimeConfigService, getConfig } = await getModule()
      vi.spyOn(console, 'log').mockImplementation(() => {})

      // 修改多个值
      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 1000)
      runtimeConfigService.set('UI_CONFIG', 'TOAST_ERROR_DURATION', 2000)
      runtimeConfigService.set('UI_CONFIG', 'INACTIVITY_HIDE_DELAY', 500)

      // 重置
      runtimeConfigService.reset('UI_CONFIG')

      // 验证所有值都恢复
      const config = getConfig('UI_CONFIG')
      expect(config).toEqual(DEFAULT_UI_CONFIG)
    })

    it('重置时应该输出日志', async () => {
      const { runtimeConfigService } = await getModule()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runtimeConfigService.reset('UI_CONFIG')

      expect(logSpy).toHaveBeenCalledWith('[RuntimeConfig] 已重置 UI_CONFIG')
    })

    it('重置所有时应该输出日志', async () => {
      const { runtimeConfigService } = await getModule()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runtimeConfigService.reset()

      expect(logSpy).toHaveBeenCalledWith('[RuntimeConfig] 已重置所有配置')
    })
  })

  describe('list 方法', () => {
    it('应该调用 console.log 输出配置', async () => {
      const { runtimeConfigService } = await getModule()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'group').mockImplementation(() => {})
      vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      runtimeConfigService.list()

      expect(logSpy).toHaveBeenCalled()
    })

    it('修改后的值应该有特殊标记', async () => {
      const { runtimeConfigService } = await getModule()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'group').mockImplementation(() => {})
      vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      // 修改一个值
      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 5000)
      logSpy.mockClear()

      // 列出配置
      runtimeConfigService.list()

      // 检查是否有带颜色的输出（修改后的值）
      const calls = logSpy.mock.calls
      const modifiedCall = calls.find(
        (call) => call[0]?.includes?.('TOAST_DEFAULT_DURATION') && call[0]?.includes?.('默认:')
      )
      expect(modifiedCall).toBeDefined()
    })
  })

  describe('响应式特性', () => {
    it('配置修改后应该响应式更新', async () => {
      const { runtimeConfigService, getConfig } = await getModule()
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const originalValue = getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 7777)

      // 通过 getConfig 验证
      expect(getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')).toBe(7777)
      expect(getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')).not.toBe(originalValue)

      // 通过 readonly 引用验证
      expect(runtimeConfigService.UI_CONFIG.TOAST_DEFAULT_DURATION).toBe(7777)
    })

    it('默认配置不应该被修改（深拷贝验证）', async () => {
      const { runtimeConfigService } = await getModule()
      vi.spyOn(console, 'log').mockImplementation(() => {})

      // 修改运行时配置
      runtimeConfigService.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 1234)

      // 验证原始常量未被修改
      expect(DEFAULT_UI_CONFIG.TOAST_DEFAULT_DURATION).toBe(3000)
    })

    it('readonly 引用应该防止直接赋值', async () => {
      const { runtimeConfigService } = await getModule()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const originalValue = runtimeConfigService.UI_CONFIG.TOAST_DEFAULT_DURATION

      // 尝试直接修改 readonly 引用（Vue readonly 会输出警告并静默失败）
      runtimeConfigService.UI_CONFIG.TOAST_DEFAULT_DURATION = 9999

      // 值应该保持不变
      expect(runtimeConfigService.UI_CONFIG.TOAST_DEFAULT_DURATION).toBe(originalValue)
      // 应该输出 Vue 警告
      expect(warnSpy).toHaveBeenCalled()
    })

    it('_writable 引用应该允许内部修改', async () => {
      const { runtimeConfigService } = await getModule()

      // 内部可写引用应该存在
      expect(runtimeConfigService._writable).toBeDefined()
      expect(runtimeConfigService._writable.UI_CONFIG).toBeDefined()

      // 通过 _writable 修改应该生效
      runtimeConfigService._writable.UI_CONFIG.TOAST_DEFAULT_DURATION = 6666
      expect(runtimeConfigService.UI_CONFIG.TOAST_DEFAULT_DURATION).toBe(6666)
    })
  })

  describe('所有配置组', () => {
    it('应该包含所有预期的配置组', async () => {
      const { runtimeConfigService } = await getModule()

      expect(runtimeConfigService.UI_CONFIG).toBeDefined()
      expect(runtimeConfigService.AUDIO_CONFIG).toBeDefined()
      expect(runtimeConfigService.CACHE_CONFIG).toBeDefined()
      expect(runtimeConfigService.WS_CONFIG).toBeDefined()
      expect(runtimeConfigService.RECONNECT_CONFIG).toBeDefined()
      expect(runtimeConfigService.API_CONFIG).toBeDefined()
    })

    it('各配置组应该与默认值匹配', async () => {
      const { runtimeConfigService } = await getModule()

      expect({ ...runtimeConfigService.UI_CONFIG }).toEqual(DEFAULT_UI_CONFIG)
      expect({ ...runtimeConfigService.AUDIO_CONFIG }).toEqual(DEFAULT_AUDIO_CONFIG)
      expect({ ...runtimeConfigService.CACHE_CONFIG }).toEqual(DEFAULT_CACHE_CONFIG)
      expect({ ...runtimeConfigService.WS_CONFIG }).toEqual(DEFAULT_WS_CONFIG)
      expect({ ...runtimeConfigService.RECONNECT_CONFIG }).toEqual(DEFAULT_RECONNECT_CONFIG)
      expect({ ...runtimeConfigService.API_CONFIG }).toEqual(DEFAULT_API_CONFIG)
    })
  })

  describe('默认导出', () => {
    it('默认导出应该是 runtimeConfigService', async () => {
      const module = await getModule()

      expect(module.default).toBe(module.runtimeConfigService)
    })
  })
})
