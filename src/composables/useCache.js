import { ref } from 'vue'
import { clearCache as clearMemoryCache, clearAllCache as clearAllMemoryCache, cache } from '../utils/cache.js'
import { prefetchPlaylistAudios } from '../utils/audioPrefetch.js'
import { isPWAMode } from '../utils/pwaDetector.js'

const CACHE_NAMES = [
  'video-cache',
  'r2-video-cache',
  'image-font-cache',
  'audio-cache',
  'api-cache',
  'streaming-music-cache'
]

const LOCALSTORAGE_PATTERNS = {
  playlist: /^meting_playlist_cache:/,
  prefetch: /^meting_playlist_prefetch:/,
  settings: /^study_with_miku_settings$/,
  musicConfig: /^music_(platform|id|source)$/
}

export const useCache = () => {
  const cacheStats = ref({
    serviceWorker: {},
    localStorage: {},
    memory: {}
  })
  const loading = ref(false)
  const isPWA = ref(isPWAMode()) // 新增：PWA 模式状态

  // 格式化字节数
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // 获取Service Worker缓存统计
  const getServiceWorkerCacheStats = async () => {
    if (!('caches' in window)) {
      console.warn('Cache API not supported')
      return {}
    }

    const stats = {}

    for (const name of CACHE_NAMES) {
      try {
        const cache = await caches.open(name)
        const keys = await cache.keys()

        let totalSize = 0
        const items = []

        // 限制只读取前50个条目，避免性能问题
        const limitedKeys = keys.slice(0, 50)

        for (const request of limitedKeys) {
          const response = await cache.match(request)
          if (response) {
            try {
              const blob = await response.blob()
              const size = blob.size
              totalSize += size

              items.push({
                url: request.url,
                size: size,
                sizeFormatted: formatBytes(size),
                timestamp: response.headers.get('date') || 'unknown'
              })
            } catch (err) {
              // 可能是opaque response，无法获取大小
              items.push({
                url: request.url,
                size: 0,
                sizeFormatted: '未知',
                timestamp: 'unknown'
              })
            }
          }
        }

        stats[name] = {
          count: keys.length,
          totalSize: totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          items: items.sort((a, b) => b.size - a.size),
          hasMore: keys.length > 50
        }
      } catch (error) {
        console.error(`Failed to get stats for ${name}:`, error)
        stats[name] = {
          count: 0,
          totalSize: 0,
          totalSizeFormatted: '0 B',
          items: [],
          hasMore: false,
          error: error.message
        }
      }
    }

    return stats
  }

  // 获取localStorage统计
  const getLocalStorageCacheStats = () => {
    const stats = {}

    for (const [category, pattern] of Object.entries(LOCALSTORAGE_PATTERNS)) {
      const items = []
      let categorySize = 0

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (pattern.test(key)) {
          try {
            const value = localStorage.getItem(key)
            const size = new Blob([value]).size
            categorySize += size

            items.push({
              key,
              size,
              sizeFormatted: formatBytes(size)
            })
          } catch (err) {
            console.error(`Error reading localStorage key ${key}:`, err)
          }
        }
      }

      stats[category] = {
        count: items.length,
        totalSize: categorySize,
        totalSizeFormatted: formatBytes(categorySize),
        items
      }
    }

    return stats
  }

  // 获取内存缓存统计
  const getMemoryCacheStats = () => {
    return {
      scripts: {
        count: cache.scripts.size,
        items: Array.from(cache.scripts)
      },
      styles: {
        count: cache.styles.size,
        items: Array.from(cache.styles)
      },
      videos: {
        count: cache.videos.size,
        items: Array.from(cache.videos.keys())
      },
      audios: {
        count: cache.audios.size,
        items: Array.from(cache.audios.keys())
      }
    }
  }

  // 刷新所有缓存统计
  const refreshCacheStats = async () => {
    loading.value = true
    try {
      const [swStats, lsStats, memStats] = await Promise.all([
        getServiceWorkerCacheStats(),
        Promise.resolve(getLocalStorageCacheStats()),
        Promise.resolve(getMemoryCacheStats())
      ])

      cacheStats.value = {
        serviceWorker: swStats,
        localStorage: lsStats,
        memory: memStats
      }
    } catch (error) {
      console.error('Failed to refresh cache stats:', error)
    } finally {
      loading.value = false
    }
  }

  // 清除指定Service Worker缓存
  const clearServiceWorkerCache = async (cacheName) => {
    if (!('caches' in window)) {
      console.warn('Cache API not supported')
      return false
    }

    try {
      const deleted = await caches.delete(cacheName)
      if (deleted) {
        await refreshCacheStats()
        return true
      }
      return false
    } catch (error) {
      console.error(`Failed to clear ${cacheName}:`, error)
      return false
    }
  }

  // 清除localStorage分类
  const clearLocalStorageCategory = (category) => {
    const pattern = LOCALSTORAGE_PATTERNS[category]
    if (!pattern) {
      console.error(`Unknown category: ${category}`)
      return
    }

    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (pattern.test(key)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (err) {
        console.error(`Failed to remove key ${key}:`, err)
      }
    })

    refreshCacheStats()
  }

  // 清除内存缓存
  const clearMemoryCacheType = (type) => {
    clearMemoryCache(type)
    refreshCacheStats()
  }

  // 清除所有缓存
  const clearAllCaches = async () => {
    // 清除所有Service Worker缓存
    if ('caches' in window) {
      for (const name of CACHE_NAMES) {
        try {
          await caches.delete(name)
        } catch (error) {
          console.error(`Failed to delete ${name}:`, error)
        }
      }
    }

    // 清除所有localStorage（保留settings）
    Object.keys(LOCALSTORAGE_PATTERNS).forEach(category => {
      if (category !== 'settings') {
        clearLocalStorageCategory(category)
      }
    })

    // 清除所有内存缓存
    clearAllMemoryCache()

    await refreshCacheStats()
  }

  // 手动触发预加载
  const triggerPrefetch = async (songs, platform, playlistId) => {
    if (!songs || songs.length === 0) {
      throw new Error('没有可预加载的歌曲')
    }

    await prefetchPlaylistAudios(songs, { platform, id: playlistId, force: true })
  }

  // 重置预加载时间戳
  const clearPrefetchTimestamp = (platform, playlistId) => {
    const key = `meting_playlist_prefetch:${platform}:${playlistId}`
    try {
      localStorage.removeItem(key)
    } catch (err) {
      console.error('Failed to clear prefetch timestamp:', err)
    }
  }

  return {
    cacheStats,
    loading,
    isPWA,  // 新增：暴露 PWA 模式状态
    refreshCacheStats,
    clearServiceWorkerCache,
    clearLocalStorageCategory,
    clearMemoryCacheType,
    clearAllCaches,
    triggerPrefetch,
    clearPrefetchTimestamp,
    formatBytes
  }
}
