import { ref, onUnmounted } from 'vue'
import {
  clearCache as clearMemoryCache,
  clearAllCache as clearAllMemoryCache,
  cache
} from '../utils/cache.js'
import { prefetchPlaylistAudios, clearPrefetchTimestamps } from '../utils/audioPrefetch.js'
import { isPWAMode } from '../utils/pwaDetector.js'
import { ALL_CACHE_NAMES } from '../config/constants.js'

const CACHE_NAMES = ALL_CACHE_NAMES

const LOCALSTORAGE_PATTERNS = {
  playlist: /^meting_playlist_cache:/,
  prefetch: /^meting_playlist_prefetch:/,
  settings: /^study_with_miku_settings$/,
  musicConfig: /^music_(platform|id|source)$/
}

// 节流函数：限制函数在指定时间内只执行一次
const createThrottledFunction = (func, delay) => {
  let lastCall = 0
  let timeout = null

  const throttled = function (...args) {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeSinceLastCall >= delay) {
      lastCall = now
      return func.apply(this, args)
    } else {
      // 如果在延迟期间，清除之前的超时并设置新的
      if (timeout) clearTimeout(timeout)
      return new Promise((resolve) => {
        timeout = setTimeout(() => {
          lastCall = Date.now()
          resolve(func.apply(this, args))
        }, delay - timeSinceLastCall)
      })
    }
  }

  // 添加清理方法
  throttled.cleanup = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return throttled
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
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
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
          hasMore: keys.length > 50,
          // 注意: 为了性能考虑，totalSize 仅基于前50个缓存项计算
          // 如果 hasMore 为 true，实际总大小可能更大
          isSampled: keys.length > 50
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

  // 获取localStorage统计（优化版：单次遍历）
  const getLocalStorageCacheStats = () => {
    const stats = {}

    // 初始化所有分类
    for (const category of Object.keys(LOCALSTORAGE_PATTERNS)) {
      stats[category] = {
        count: 0,
        totalSize: 0,
        totalSizeFormatted: '0 B',
        items: []
      }
    }

    // 单次遍历 localStorage，避免 O(n*m) 复杂度
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      // 对每个 key 检查所有模式
      for (const [category, pattern] of Object.entries(LOCALSTORAGE_PATTERNS)) {
        if (pattern.test(key)) {
          try {
            const value = localStorage.getItem(key)
            const size = new Blob([value]).size

            stats[category].count++
            stats[category].totalSize += size
            stats[category].items.push({
              key,
              size,
              sizeFormatted: formatBytes(size)
            })
          } catch (err) {
            console.error(`Error reading localStorage key ${key}:`, err)
          }
          break // 找到匹配后跳出内层循环
        }
      }
    }

    // 格式化总大小
    for (const category of Object.keys(stats)) {
      stats[category].totalSizeFormatted = formatBytes(stats[category].totalSize)
    }

    return stats
  }

  // 获取内存缓存统计
  const getMemoryCacheStats = () => {
    return {
      videos: {
        count: cache.videos?.size || 0,
        items: cache.videos ? Array.from(cache.videos.keys()) : []
      },
      audios: {
        count: cache.audios?.size || 0,
        items: cache.audios ? Array.from(cache.audios.keys()) : []
      }
    }
  }

  // 刷新所有缓存统计（内部实现）
  const _refreshCacheStats = async () => {
    loading.value = true
    try {
      const results = await Promise.allSettled([
        getServiceWorkerCacheStats(),
        Promise.resolve(getLocalStorageCacheStats()),
        Promise.resolve(getMemoryCacheStats())
      ])

      // 检查失败的操作
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        console.warn(
          'Some cache stats operations failed:',
          failed.map((f) => f.reason)
        )
      }

      cacheStats.value = {
        serviceWorker: results[0].status === 'fulfilled' ? results[0].value : {},
        localStorage: results[1].status === 'fulfilled' ? results[1].value : {},
        memory: results[2].status === 'fulfilled' ? results[2].value : {}
      }
    } catch (error) {
      console.error('Failed to refresh cache stats:', error)
    } finally {
      loading.value = false
    }
  }

  // 节流版本的 refreshCacheStats（1秒内最多执行一次）
  const refreshCacheStats = createThrottledFunction(_refreshCacheStats, 1000)

  // 添加清理逻辑
  onUnmounted(() => {
    refreshCacheStats.cleanup?.()
  })

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
  const clearLocalStorageCategory = async (category) => {
    const pattern = LOCALSTORAGE_PATTERNS[category]
    if (!pattern) {
      console.error(`Unknown category: ${category}`)
      return
    }

    // 先收集所有需要删除的 key，避免遍历过程中索引变化导致的竞态条件
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (pattern.test(key)) {
        keysToRemove.push(key)
      }
    }

    // 统一删除收集到的 key
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch (err) {
        console.error(`Failed to remove key ${key}:`, err)
      }
    })

    await refreshCacheStats()
  }

  // 清除内存缓存
  const clearMemoryCacheType = async (type) => {
    clearMemoryCache(type)
    await refreshCacheStats()
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
    // 使用 Promise.all 确保所有异步清除操作都被等待
    const clearPromises = Object.keys(LOCALSTORAGE_PATTERNS)
      .filter((category) => category !== 'settings')
      .map((category) => clearLocalStorageCategory(category))
    await Promise.all(clearPromises)

    // 清除预加载时间戳（确保用户清理缓存后可以重新预加载）
    clearPrefetchTimestamps()

    // 清除所有内存缓存
    clearAllMemoryCache()

    await refreshCacheStats()
  }

  // 手动触发预加载
  const triggerPrefetch = async (songs, platform, playlistId) => {
    if (!songs || songs.length === 0) {
      throw new Error('没有可预加载的歌曲')
    }

    const PREFETCH_TIMEOUT = 60000 // 60秒
    let timeoutId = null

    const prefetchPromise = prefetchPlaylistAudios(songs, { platform, id: playlistId, force: true })
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('预加载超时（60秒）')), PREFETCH_TIMEOUT)
    })

    try {
      const result = await Promise.race([prefetchPromise, timeoutPromise])

      if (result.reason) {
        if (result.reason === 'not_supported') {
          throw new Error('当前浏览器不支持缓存功能')
        } else if (result.reason === 'cache_error') {
          throw new Error(`预加载失败: ${result.error}`)
        }
      }

      return result
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
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
    isPWA, // 新增：暴露 PWA 模式状态
    refreshCacheStats,
    clearServiceWorkerCache,
    clearLocalStorageCategory,
    clearMemoryCacheType,
    clearAllCaches,
    triggerPrefetch,
    clearPrefetchTimestamp
  }
}
