/**
 * src/composables/useVersionSwitch.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { VERSION_CONFIG } from '@/config/constants.js'

describe('useVersionSwitch.js', () => {
  let unregisterMock

  beforeEach(() => {
    vi.resetModules()

    // 在已有的 serviceWorker mock 上添加 getRegistrations
    unregisterMock = vi.fn(async () => true)
    navigator.serviceWorker.getRegistrations = vi.fn(async () => [{ unregister: unregisterMock }])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const getUseVersionSwitch = async () => {
    const { useVersionSwitch } = await import('@/composables/useVersionSwitch.js')
    return useVersionSwitch()
  }

  describe('初始状态', () => {
    it('versions 应该为空数组', async () => {
      const { versions } = await getUseVersionSwitch()
      expect(versions.value).toEqual([])
    })

    it('currentVersion 应该返回 __APP_VERSION__', async () => {
      const { currentVersion } = await getUseVersionSwitch()
      expect(currentVersion.value).toBe(__APP_VERSION__)
    })

    it('isLoading 应该为 false', async () => {
      const { isLoading } = await getUseVersionSwitch()
      expect(isLoading.value).toBe(false)
    })

    it('error 应该为 null', async () => {
      const { error } = await getUseVersionSwitch()
      expect(error.value).toBeNull()
    })
  })

  describe('fetchVersions', () => {
    it('成功获取版本列表', async () => {
      const mockVersions = [
        { tag: '1.0.0', date: '2026-01-31' },
        { tag: '0.9.0', date: '2026-01-15' }
      ]

      globalThis.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({ latest: '1.0.0', versions: mockVersions })
      }))

      const { versions, isLoading, error, fetchVersions } = await getUseVersionSwitch()
      await fetchVersions()

      expect(fetch).toHaveBeenCalledWith(VERSION_CONFIG.VERSIONS_FILE)
      expect(versions.value).toEqual(mockVersions)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('HTTP 错误应设置 error', async () => {
      globalThis.fetch = vi.fn(async () => ({
        ok: false,
        status: 404
      }))

      const { versions, error, fetchVersions } = await getUseVersionSwitch()
      await fetchVersions()

      expect(error.value).toBe('无法加载版本列表')
      expect(versions.value).toEqual([])
    })

    it('网络错误应设置 error', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('Network Error')
      })

      const { versions, error, fetchVersions } = await getUseVersionSwitch()
      await fetchVersions()

      expect(error.value).toBe('无法加载版本列表')
      expect(versions.value).toEqual([])
    })

    it('响应中无 versions 字段应回退为空数组', async () => {
      globalThis.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({ latest: null })
      }))

      const { versions, fetchVersions } = await getUseVersionSwitch()
      await fetchVersions()

      expect(versions.value).toEqual([])
    })

    it('加载中 isLoading 应该为 true', async () => {
      let resolvePromise
      globalThis.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const { isLoading, fetchVersions } = await getUseVersionSwitch()
      const promise = fetchVersions()

      expect(isLoading.value).toBe(true)

      resolvePromise({
        ok: true,
        json: async () => ({ versions: [] })
      })
      await promise

      expect(isLoading.value).toBe(false)
    })
  })

  describe('switchVersion', () => {
    it('应该清理缓存并跳转到版本路径', async () => {
      // 预填充缓存
      await caches.open('test-cache')

      const { switchVersion } = await getUseVersionSwitch()
      await switchVersion('1.0.0')

      // 验证缓存被清理
      const keys = await caches.keys()
      expect(keys).toHaveLength(0)

      // 验证 Service Worker 被注销
      expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled()
      expect(unregisterMock).toHaveBeenCalled()

      // 验证跳转
      expect(window.location.href).toContain('/v/1.0.0/')
    })
  })

  describe('switchToLatest', () => {
    it('应该清理缓存并跳转到根路径', async () => {
      await caches.open('test-cache')

      const { switchToLatest } = await getUseVersionSwitch()
      await switchToLatest()

      const keys = await caches.keys()
      expect(keys).toHaveLength(0)

      expect(window.location.href).toContain('/')
    })
  })

  describe('isVersionedPath', () => {
    it('在根路径下应该返回 false', async () => {
      const { isVersionedPath } = await getUseVersionSwitch()
      expect(isVersionedPath.value).toBe(false)
    })
  })
})
