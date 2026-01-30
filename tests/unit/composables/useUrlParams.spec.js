/**
 * src/composables/useUrlParams.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('useUrlParams.js', () => {
  // 保存原始的 window.location
  const originalLocation = window.location

  beforeEach(() => {
    // Mock window.location
    delete window.location
    window.location = {
      search: '',
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/'
    }
    vi.clearAllMocks()
    // 重置模块缓存以便每次测试重新导入
    vi.resetModules()
  })

  afterEach(() => {
    window.location = originalLocation
  })

  describe('解析 playlist 参数', () => {
    it('应该正确解析 netease 歌单参数', async () => {
      window.location.search = '?playlist=netease:17543418420'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, hasUrlParams } = useUrlParams()

      expect(hasUrlParams.value).toBe(true)
      expect(urlConfig.value.playlist).toEqual({
        platform: 'netease',
        id: '17543418420'
      })
    })

    it('应该正确解析 tencent 歌单参数', async () => {
      window.location.search = '?playlist=tencent:8888888888'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.playlist).toEqual({
        platform: 'tencent',
        id: '8888888888'
      })
    })

    it('应该正确解析 spotify 歌单参数', async () => {
      window.location.search = '?playlist=spotify:37i9dQZF1DXcBWIGoYBM5M'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.playlist).toEqual({
        platform: 'spotify',
        id: '37i9dQZF1DXcBWIGoYBM5M'
      })
    })

    it('应该处理 URL 编码的参数', async () => {
      window.location.search = '?playlist=netease%3A17543418420'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.playlist).toEqual({
        platform: 'netease',
        id: '17543418420'
      })
    })
  })

  describe('无效参数处理', () => {
    it('无效平台应该被拒绝并产生警告', async () => {
      window.location.search = '?playlist=invalid:12345'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.playlist).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
    })

    it('缺少冒号分隔符应该被拒绝', async () => {
      window.location.search = '?playlist=netease12345'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.playlist).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
    })

    it('空 ID 应该被拒绝', async () => {
      window.location.search = '?playlist=netease:'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.playlist).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
    })
  })

  describe('边缘情况', () => {
    it('没有参数时 hasUrlParams 应该为 false', async () => {
      window.location.search = ''
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { hasUrlParams, urlConfig } = useUrlParams()

      expect(hasUrlParams.value).toBe(false)
      expect(Object.keys(urlConfig.value)).toHaveLength(0)
    })

    it('只有不相关参数时不应该影响结果', async () => {
      window.location.search = '?foo=bar&baz=qux'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { hasUrlParams, urlConfig } = useUrlParams()

      expect(hasUrlParams.value).toBe(false)
      expect(urlConfig.value.playlist).toBeUndefined()
    })

    it('ID 中可以包含下划线和连字符', async () => {
      window.location.search = '?playlist=spotify:abc_123-XYZ'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.playlist).toEqual({
        platform: 'spotify',
        id: 'abc_123-XYZ'
      })
    })
  })

  describe('解析专注配置参数', () => {
    it('应该正确解析 focus 参数（分钟转秒）', async () => {
      window.location.search = '?focus=25'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, hasUrlParams } = useUrlParams()

      expect(hasUrlParams.value).toBe(true)
      expect(urlConfig.value.focus).toEqual({
        focusDuration: 1500 // 25 * 60
      })
    })

    it('应该正确解析 short 参数', async () => {
      window.location.search = '?short=5'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.focus).toEqual({
        shortBreakDuration: 300 // 5 * 60
      })
    })

    it('应该正确解析 long 参数', async () => {
      window.location.search = '?long=15'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.focus).toEqual({
        longBreakDuration: 900 // 15 * 60
      })
    })

    it('应该正确解析 interval 参数', async () => {
      window.location.search = '?interval=4'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.focus).toEqual({
        longBreakInterval: 4
      })
    })

    it('应该正确解析完整的专注配置', async () => {
      window.location.search = '?focus=50&short=10&long=20&interval=3'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.focus).toEqual({
        focusDuration: 3000,
        shortBreakDuration: 600,
        longBreakDuration: 1200,
        longBreakInterval: 3
      })
    })
  })

  describe('解析标志参数', () => {
    it('应该正确解析 autostart=1', async () => {
      window.location.search = '?autostart=1'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, hasUrlParams } = useUrlParams()

      expect(hasUrlParams.value).toBe(true)
      expect(urlConfig.value.autostart).toBe(true)
    })

    it('应该正确解析 save=1', async () => {
      window.location.search = '?save=1'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.save).toBe(true)
    })

    it('autostart=0 不应该设置 autostart', async () => {
      window.location.search = '?autostart=0'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.autostart).toBeUndefined()
    })

    it('save=0 不应该设置 save', async () => {
      window.location.search = '?save=0'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.save).toBeUndefined()
    })
  })

  describe('专注参数验证', () => {
    it('focus 超出最大值应该被拒绝', async () => {
      window.location.search = '?focus=200'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.focus).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
      expect(validationWarnings.value[0]).toContain('focus')
    })

    it('focus 小于最小值应该被拒绝', async () => {
      window.location.search = '?focus=0'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.focus).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
    })

    it('short 超出最大值应该被拒绝', async () => {
      window.location.search = '?short=100'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.focus).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
      expect(validationWarnings.value[0]).toContain('short')
    })

    it('interval 超出最大值应该被拒绝', async () => {
      window.location.search = '?interval=20'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.focus).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
      expect(validationWarnings.value[0]).toContain('interval')
    })

    it('非数字参数应该被拒绝', async () => {
      window.location.search = '?focus=abc'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      expect(urlConfig.value.focus).toBeUndefined()
      expect(validationWarnings.value.length).toBeGreaterThan(0)
    })

    it('部分参数无效时有效参数仍应被解析', async () => {
      window.location.search = '?focus=25&short=100&long=15'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, validationWarnings } = useUrlParams()

      // short=100 超出范围，被拒绝
      expect(validationWarnings.value.length).toBeGreaterThan(0)
      // focus 和 long 有效
      expect(urlConfig.value.focus).toEqual({
        focusDuration: 1500,
        longBreakDuration: 900
      })
    })
  })

  describe('组合参数', () => {
    it('应该正确解析歌单和专注配置的组合', async () => {
      window.location.search = '?playlist=netease:12345&focus=30&autostart=1'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig } = useUrlParams()

      expect(urlConfig.value.playlist).toEqual({
        platform: 'netease',
        id: '12345'
      })
      expect(urlConfig.value.focus).toEqual({
        focusDuration: 1800
      })
      expect(urlConfig.value.autostart).toBe(true)
    })

    it('应该正确解析完整的组合参数', async () => {
      window.location.search =
        '?playlist=spotify:abc123&focus=25&short=5&long=15&interval=4&save=1&autostart=1'
      const { useUrlParams } = await import('@/composables/useUrlParams.js')
      const { urlConfig, hasUrlParams, validationWarnings } = useUrlParams()

      expect(hasUrlParams.value).toBe(true)
      expect(validationWarnings.value).toHaveLength(0)
      expect(urlConfig.value).toEqual({
        playlist: { platform: 'spotify', id: 'abc123' },
        focus: {
          focusDuration: 1500,
          shortBreakDuration: 300,
          longBreakDuration: 900,
          longBreakInterval: 4
        },
        save: true,
        autostart: true
      })
    })
  })
})
