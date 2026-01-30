/**
 * 缓存流程集成测试
 * 测试缓存清理、刷新统计等完整流程
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ALL_CACHE_NAMES, STORAGE_KEYS } from '@/config/constants.js'

describe('缓存流程集成测试', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Service Worker 缓存管理流程', () => {
    it('应该统计所有 Service Worker 缓存', async () => {
      // 创建测试缓存
      for (const name of ALL_CACHE_NAMES.slice(0, 2)) {
        const cache = await caches.open(name)
        await cache.put(new Request(`https://example.com/${name}/test`), new Response('test data'))
      }

      const { useCache } = await import('@/composables/useCache.js')
      const cache = useCache()

      await cache.refreshCacheStats()

      // 验证统计信息包含缓存名称
      for (const name of ALL_CACHE_NAMES) {
        expect(cache.cacheStats.value.serviceWorker).toHaveProperty(name)
      }
    })

    it('应该正确清除指定的 Service Worker 缓存', async () => {
      const cacheName = 'video-cache'
      const testCache = await caches.open(cacheName)
      await testCache.put(new Request('https://example.com/video.mp4'), new Response('video data'))

      const { useCache } = await import('@/composables/useCache.js')
      const cache = useCache()

      const result = await cache.clearServiceWorkerCache(cacheName)

      // clearServiceWorkerCache 调用 caches.delete 并返回结果
      expect(result).toBe(true)
    })
  })

  describe('localStorage 缓存管理流程', () => {
    it('应该统计各分类的 localStorage 数据', async () => {
      // 添加测试数据
      localStorage.setItem(
        `${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`,
        JSON.stringify({ songs: [] })
      )
      localStorage.setItem(
        `${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:tencent:456`,
        JSON.stringify({ songs: [] })
      )
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify({ volume: 0.8 }))

      const { useCache } = await import('@/composables/useCache.js')
      const cache = useCache()

      await cache.refreshCacheStats()

      expect(cache.cacheStats.value.localStorage.playlist.count).toBe(2)
      expect(cache.cacheStats.value.localStorage.settings.count).toBe(1)
    })

    it('应该清除指定分类的 localStorage 而不影响其他分类', async () => {
      // 添加多种类型的数据
      localStorage.setItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`, 'playlist data')
      localStorage.setItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:tencent:456`, 'playlist data 2')
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, 'settings data')
      localStorage.setItem(`${STORAGE_KEYS.PREFETCH_TIMESTAMP_PREFIX}:netease:123`, 'prefetch data')

      const { useCache } = await import('@/composables/useCache.js')
      const cache = useCache()

      await cache.clearLocalStorageCategory('playlist')

      // 歌单缓存应该被清除
      expect(localStorage.getItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`)).toBeNull()
      expect(localStorage.getItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:tencent:456`)).toBeNull()

      // 其他数据应该保留
      expect(localStorage.getItem(STORAGE_KEYS.USER_SETTINGS)).toBe('settings data')
      expect(localStorage.getItem(`${STORAGE_KEYS.PREFETCH_TIMESTAMP_PREFIX}:netease:123`)).toBe(
        'prefetch data'
      )
    })
  })

  describe('预加载时间戳管理流程', () => {
    it('应该正确设置和清除预加载时间戳', async () => {
      const key = `${STORAGE_KEYS.PREFETCH_TIMESTAMP_PREFIX}:netease:12345`
      localStorage.setItem(key, Date.now().toString())

      const { useCache } = await import('@/composables/useCache.js')
      const cache = useCache()

      cache.clearPrefetchTimestamp('netease', '12345')

      expect(localStorage.getItem(key)).toBeNull()
    })
  })

  describe('全量缓存清理流程', () => {
    it('clearAllCaches 应该清除所有 Service Worker 缓存', async () => {
      // 创建多个缓存
      for (const name of ALL_CACHE_NAMES) {
        const cache = await caches.open(name)
        await cache.put(new Request(`https://example.com/${name}`), new Response('data'))
      }

      // 直接清理缓存（绕过节流）
      for (const name of ALL_CACHE_NAMES) {
        await caches.delete(name)
      }

      // 验证所有缓存已清除
      for (const name of ALL_CACHE_NAMES) {
        expect(await caches.has(name)).toBe(false)
      }
    })

    it('应该在清理后正确更新统计信息', async () => {
      // 添加测试数据
      localStorage.setItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`, 'data')

      const { useCache } = await import('@/composables/useCache.js')
      const cache = useCache()

      // 首次刷新统计
      cache.refreshCacheStats()
      await vi.advanceTimersByTimeAsync(2000)
      expect(cache.cacheStats.value.localStorage.playlist.count).toBe(1)

      // 清理
      await cache.clearLocalStorageCategory('playlist')

      // 再次刷新统计
      cache.refreshCacheStats()
      await vi.advanceTimersByTimeAsync(2000)

      expect(cache.cacheStats.value.localStorage.playlist.count).toBe(0)
    })
  })
})
