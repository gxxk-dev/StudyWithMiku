import { CACHE_NAMES, CACHE_CONFIG, STORAGE_KEYS } from '../config/constants.js'

const PREFETCH_CACHE_NAME = CACHE_NAMES.STREAMING_MUSIC
const PREFETCH_KEY_PREFIX = STORAGE_KEYS.PREFETCH_TIMESTAMP_PREFIX
const PREFETCH_DURATION = CACHE_CONFIG.PREFETCH_DURATION
const MAX_PREFETCH_SONGS = CACHE_CONFIG.MAX_PREFETCH_SONGS

const getPrefetchKey = (platform = 'default', id = 'default') => {
  return `${PREFETCH_KEY_PREFIX}:${platform}:${id}`
}

const getLastPrefetch = (platform, id) => {
  try {
    return Number(localStorage.getItem(getPrefetchKey(platform, id)) || 0)
  } catch (err) {
    console.warn(`Failed to get prefetch timestamp (${platform}:${id}):`, err)
    return 0
  }
}

const markPrefetched = (platform, id) => {
  try {
    localStorage.setItem(getPrefetchKey(platform, id), Date.now().toString())
  } catch {
    // ignore quota errors
  }
}

const shouldPrefetch = (platform, id, force = false) => {
  if (force) return true
  const lastPrefetch = getLastPrefetch(platform, id)
  return Date.now() - lastPrefetch > PREFETCH_DURATION
}

const fetchAndCache = async (cache, url) => {
  try {
    const request = new Request(url, { mode: 'no-cors', credentials: 'omit' })
    const existing = await cache.match(request, { ignoreSearch: false })
    if (existing) {
      return true
    }

    const response = await fetch(request)
    if (!response) return false

    // 验证响应状态，opaque 类型是跨域请求的正常情况
    if (!response.ok && response.type !== 'opaque') {
      console.warn(`Fetch failed for ${url}: ${response.status}`)
      return false
    }

    if (response.ok || response.type === 'opaque') {
      await cache.put(request, response.clone())
      return true
    }
  } catch (error) {
    console.warn('缓存歌曲失败:', url, error)
  }
  return false
}

/**
 * 清理所有预加载时间戳
 * 用于缓存清理时重置预加载状态
 */
export const clearPrefetchTimestamps = () => {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREFETCH_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    // 逐个删除，每个操作都有 try-catch 保护
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch (err) {
        console.warn(`删除预加载时间戳失败 (${key}):`, err)
      }
    })
    console.log(`已清理 ${keysToRemove.length} 个预加载时间戳`)
  } catch (error) {
    console.warn('清理预加载时间戳失败:', error)
  }
}

export const prefetchPlaylistAudios = async (songs = [], options = {}) => {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { success: 0, failed: 0, skipped: 0, reason: 'not_supported' }
  }

  const { platform = 'netease', id = 'default', force = false } = options

  if (!Array.isArray(songs) || songs.length === 0) {
    return { success: 0, failed: 0, skipped: 0, reason: 'no_songs' }
  }

  if (!shouldPrefetch(platform, id, force)) {
    return { success: 0, failed: 0, skipped: songs.length, reason: 'recently_prefetched' }
  }

  try {
    const cache = await caches.open(PREFETCH_CACHE_NAME)
    const uniqueUrls = Array.from(new Set(songs.map((song) => song?.url).filter(Boolean))).slice(
      0,
      MAX_PREFETCH_SONGS
    )

    if (uniqueUrls.length === 0) {
      return { success: 0, failed: 0, skipped: 0, reason: 'no_valid_urls' }
    }

    // 并行加载以提升性能
    const results = await Promise.allSettled(uniqueUrls.map((url) => fetchAndCache(cache, url)))
    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length
    const failedCount = results.length - successCount

    markPrefetched(platform, id)

    return {
      success: successCount,
      failed: failedCount,
      skipped: 0,
      total: uniqueUrls.length
    }
  } catch (error) {
    console.error('预缓存歌曲文件失败:', error)
    return {
      success: 0,
      failed: songs.length,
      skipped: 0,
      reason: 'cache_error',
      error: error.message
    }
  }
}
