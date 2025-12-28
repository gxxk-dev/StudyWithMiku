import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/storage.js'
import { API_CONFIG, CACHE_CONFIG, STORAGE_KEYS } from '../config/constants.js'

const { METING_API, DEFAULT_PLAYLIST_ID, FETCH_TIMEOUT } = API_CONFIG
const { PLAYLIST_DURATION: PLAYLIST_CACHE_DURATION } = CACHE_CONFIG
const PLAYLIST_CACHE_PREFIX = STORAGE_KEYS.PLAYLIST_CACHE_PREFIX

export { DEFAULT_PLAYLIST_ID }

const getCacheKey = (platform, id) => {
  return `${PLAYLIST_CACHE_PREFIX}:${platform}:${id}`
}

const isCacheExpired = (timestamp = 0) => {
  return Date.now() - timestamp > PLAYLIST_CACHE_DURATION
}

export const fetchPlaylist = async (server = 'netease', id = DEFAULT_PLAYLIST_ID, signal) => {
  const url = `${METING_API}?server=${server}&type=playlist&id=${id}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  // 如果传入了外部 signal，需要同时监听
  const combinedSignal = signal || controller.signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, { signal: combinedSignal })
    if (!response.ok) {
      const error = new Error('网络错误/(ㄒoㄒ)/~~')
      error.type = 'NETWORK_ERROR'
      error.status = response.status
      throw error
    }

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      const error = new Error('响应解析失败')
      error.type = 'PARSE_ERROR'
      error.originalError = parseError
      throw error
    }

    if (!Array.isArray(data)) {
      const error = new Error('API返回数据格式错误')
      error.type = 'INVALID_DATA'
      throw error
    }

    // 映射并过滤不完整的歌曲数据
    return data
      .map(song => ({
        name: song.title || song.name,
        artist: song.author || song.artist,
        url: song.url,
        cover: song.pic || song.cover,
        lrc: song.lrc
      }))
      .filter(song => {
        // 检查必需属性是否存在
        const hasRequiredFields = song.name && song.artist && song.url
        if (!hasRequiredFields) {
          console.warn('过滤不完整的歌曲数据:', song)
        }
        return hasRequiredFields
      })
  } catch (error) {
    if (error.name === 'AbortError') {
      error.type = 'TIMEOUT_ERROR'
      error.message = '请求超时'
    }
    // 为未分类的错误添加默认类型
    if (!error.type) {
      error.type = 'UNKNOWN_ERROR'
    }
    console.error('Meting API错误:', error.type, error.message, error)
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const getCachedPlaylist = (platform, id) => {
  // 外层 try-catch 捕获 localStorage 访问异常
  try {
    const key = getCacheKey(platform, id)
    const cached = safeLocalStorageGet(key)
    if (!cached) {
      return null
    }

    // 内层 try-catch 捕获 JSON 解析异常
    try {
      const parsed = JSON.parse(cached)
      const songs = Array.isArray(parsed?.songs) ? parsed.songs : []
      const timestamp = parsed?.timestamp || 0

      return {
        songs,
        timestamp,
        isExpired: isCacheExpired(timestamp)
      }
    } catch (parseError) {
      console.error('解析歌单缓存失败:', parseError)
      safeLocalStorageRemove(key)
      return null
    }
  } catch (error) {
    console.error('读取歌单缓存失败:', error)
    return null
  }
}

export const cachePlaylist = (platform, id, playlist) => {
  try {
    const key = getCacheKey(platform, id)
    const payload = JSON.stringify({
      timestamp: Date.now(),
      songs: playlist
    })
    safeLocalStorageSet(key, payload)
  } catch (error) {
    console.error('缓存歌单失败:', error)
  }
}

/**
 * 清除指定平台和ID的歌单缓存
 * @public 公开 API - 预留供缓存管理功能使用
 * @param {string} platform - 音乐平台 (如 'netease', 'tencent' 等)
 * @param {string} id - 歌单ID
 */
export const clearPlaylistCache = (platform, id) => {
  safeLocalStorageRemove(getCacheKey(platform, id))
}

export const getStoredConfig = () => {
  return {
    platform: safeLocalStorageGet(STORAGE_KEYS.MUSIC_PLATFORM, 'netease') || 'netease',
    id: DEFAULT_PLAYLIST_ID
  }
}

export const saveConfig = (platform, id) => {
  safeLocalStorageSet(STORAGE_KEYS.MUSIC_PLATFORM, platform)
  safeLocalStorageSet(STORAGE_KEYS.MUSIC_ID, id)
}
