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
})
