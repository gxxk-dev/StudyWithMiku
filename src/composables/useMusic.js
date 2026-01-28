import { ref, computed, onUnmounted, getCurrentInstance } from 'vue'
import {
  fetchPlaylist,
  getStoredConfig,
  saveConfig,
  DEFAULT_PLAYLIST_ID,
  getCachedPlaylist,
  cachePlaylist
} from '../services/meting.js'
import { prefetchPlaylistAudios } from '../utils/audioPrefetch.js'
import {
  getSpotifyPlaylistId,
  saveSpotifyPlaylistId,
  resetSpotifyPlaylistId,
  DEFAULT_SPOTIFY_PLAYLIST_ID
} from '../services/spotify.js'
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage.js'
import { getLocalAudioURL } from '../services/localAudioStorage.js'
import { usePlaylistManager } from './usePlaylistManager.js'

/**
 * 模块级状态 - 单例模式 (Singleton Pattern)
 *
 * 这些状态在模块级别定义，所有调用 useMusic() 的组件共享同一份状态。
 * 这是有意的设计，因为应用中只有一个全局音乐播放器，所有组件需要访问同一份歌单数据：
 *
 * - App.vue: 渲染 APlayer/Spotify 播放器，读取 songs 和 isSpotify
 * - PomodoroTimer.vue: 设置面板，修改歌单配置（平台、歌单ID）
 * - PWAPanel.vue: 缓存管理面板，读取 songs 用于显示缓存信息
 *
 * 如果未来需要支持多个独立的音乐播放器实例，需要重构为实例模式。
 */
const songs = ref([])
const loading = ref(false)
const metingConfig = ref(getStoredConfig())
const playlistId = ref(safeLocalStorageGet('playlist_id', DEFAULT_PLAYLIST_ID))
const platform = ref(safeLocalStorageGet('music_platform', 'netease'))
const spotifyPlaylistId = ref(getSpotifyPlaylistId())
const abortController = ref(null)

/**
 * 本地音频 Object URL 缓存
 * key: 歌曲 ID, value: Object URL
 * @type {Map<string, string>}
 */
const localAudioURLs = new Map()

const PLATFORMS = [
  { value: 'netease', label: '网易云' },
  { value: 'tencent', label: 'QQ音乐' },
  { value: 'spotify', label: 'Spotify' }
]

// 是否使用 Spotify 播放器
const isSpotify = computed(() => platform.value === 'spotify')

export const useMusic = () => {
  const persistMetingState = (platform, id) => {
    saveConfig(platform, id)
    metingConfig.value = { platform, id }
  }

  // 开始预加载歌单音频
  const startPrefetch = async (playlistSongs, platform, id, forceRefresh) => {
    if (!playlistSongs?.length) return
    const result = await prefetchPlaylistAudios(playlistSongs, {
      platform,
      id,
      force: forceRefresh
    })
    if (result && result.failed > 0) {
      console.warn(`预加载完成: 成功 ${result.success} 首，失败 ${result.failed} 首`)
    }
  }

  // 从缓存加载歌单
  const loadFromCache = (cachedEntry, platform, id, forceRefresh) => {
    songs.value = cachedEntry.songs
    persistMetingState(platform, id)
    startPrefetch(cachedEntry.songs, platform, id, forceRefresh)
    return !forceRefresh && !cachedEntry.isExpired
  }

  // 从网络加载歌单
  const loadFromNetwork = async (platform, id, forceRefresh) => {
    // 取消之前的请求
    if (abortController.value) {
      abortController.value.abort()
    }
    abortController.value = new AbortController()

    try {
      // 将 signal 传递给 fetchPlaylist
      const playlist = await fetchPlaylist(platform, id, abortController.value.signal)
      if (playlist.length > 0) {
        songs.value = playlist
        cachePlaylist(platform, id, playlist)
        persistMetingState(platform, id)
        startPrefetch(playlist, platform, id, forceRefresh)
        return true
      }
      return false
    } catch (error) {
      // 如果是取消请求的错误,静默处理
      if (error.name === 'AbortError') {
        console.log('Request cancelled')
        return false
      }

      // 区分不同类型的错误并记录
      if (error.type === 'NETWORK_ERROR') {
        console.error(`网络错误 (${error.status}):`, error.message)
      } else if (error.type === 'PARSE_ERROR') {
        console.error('API响应解析失败:', error.message)
      } else if (error.type === 'INVALID_DATA') {
        console.error('API返回数据格式错误:', error.message)
      } else {
        console.error('加载歌单失败:', error)
      }
      throw error // 重新抛出错误供上层处理
    }
  }

  // 使用缓存作为后备方案
  const useCacheFallback = (cachedEntry, platform, id, forceRefresh) => {
    persistMetingState(platform, id)
    startPrefetch(cachedEntry.songs, platform, id, forceRefresh)
  }

  const loadMetingSongs = async (platform, id, options = {}) => {
    const { forceRefresh = false } = options
    loading.value = true

    const cachedEntry = getCachedPlaylist(platform, id)
    const hasCachedSongs = Boolean(cachedEntry?.songs?.length)

    // 如果有缓存，先加载缓存
    if (hasCachedSongs) {
      const shouldReturn = loadFromCache(cachedEntry, platform, id, forceRefresh)
      if (shouldReturn) {
        loading.value = false
        return
      }
    }

    // 尝试从网络加载
    try {
      await loadFromNetwork(platform, id, forceRefresh)
    } catch (error) {
      console.error('Load meting songs error:', error.type || 'UNKNOWN', error.message)
      if (hasCachedSongs) {
        console.warn('使用缓存作为后备方案')
        useCacheFallback(cachedEntry, platform, id, forceRefresh)
      }
    } finally {
      loading.value = false
    }
  }

  const loadSongs = async () => {
    // 如果是 Spotify 平台，不需要从 Meting API 加载歌曲
    // Spotify 使用嵌入式播放器，歌曲由 Spotify 自己管理
    if (platform.value === 'spotify') {
      loading.value = false
      return
    }
    await loadMetingSongs(metingConfig.value.platform, playlistId.value)
  }

  const updateMetingPlaylist = async (platform, id) => {
    await loadMetingSongs(platform, id, { forceRefresh: true })
  }

  const setPlaylistId = (id) => {
    playlistId.value = id
    safeLocalStorageSet('playlist_id', id)
  }

  const resetPlaylistId = () => {
    playlistId.value = DEFAULT_PLAYLIST_ID
    safeLocalStorageSet('playlist_id', DEFAULT_PLAYLIST_ID)
  }

  const setPlatform = (p) => {
    platform.value = p
    safeLocalStorageSet('music_platform', p)
  }

  const applyCustomPlaylist = async (p, id) => {
    setPlatform(p)
    setPlaylistId(id)
    await loadMetingSongs(p, id, { forceRefresh: true })
  }

  const resetToDefault = async () => {
    setPlatform('netease')
    resetPlaylistId()
    await loadMetingSongs('netease', DEFAULT_PLAYLIST_ID, { forceRefresh: true })
  }

  // Spotify 相关方法
  const setSpotifyPlaylistId = (id) => {
    spotifyPlaylistId.value = id
    saveSpotifyPlaylistId(id)
  }

  const applySpotifyPlaylist = (id) => {
    setPlatform('spotify')
    setSpotifyPlaylistId(id)
  }

  const resetSpotifyToDefault = () => {
    const defaultId = resetSpotifyPlaylistId()
    spotifyPlaylistId.value = defaultId
  }

  /**
   * 从 URL 参数应用歌单配置
   * @param {string} playlistConfig - 格式：'platform:id'
   * @returns {Promise<boolean>} - 是否成功
   */
  const applyUrlPlaylist = async (playlistConfig) => {
    const [platform, id] = playlistConfig.split(':')

    if (!platform || !id) {
      console.warn('[useMusic] 无效的歌单参数格式:', playlistConfig)
      return false
    }

    if (!['netease', 'tencent', 'spotify'].includes(platform)) {
      console.warn('[useMusic] 不支持的平台:', platform)
      return false
    }

    try {
      if (platform === 'spotify') {
        applySpotifyPlaylist(id)
        console.log('[useMusic] 已切换到 Spotify 歌单:', id)
        return true
      } else {
        await applyCustomPlaylist(platform, id)
        console.log('[useMusic] 已加载歌单:', platform, id)
        return true
      }
    } catch (error) {
      console.error('[useMusic] 应用 URL 歌单失败:', error)
      return false
    }
  }

  // ============ 歌单系统集成 ============

  /**
   * 清理本地音频 Object URLs
   * 释放之前创建的 Blob URLs 以避免内存泄漏
   */
  const cleanupLocalAudioURLs = () => {
    for (const url of localAudioURLs.values()) {
      URL.revokeObjectURL(url)
    }
    localAudioURLs.clear()
  }

  /**
   * 将歌曲转换为 APlayer 格式
   * @param {import('../types/playlist.js').Song} song - 歌曲对象
   * @returns {Promise<Object|null>} APlayer 格式的歌曲，失败返回 null
   */
  const convertSongToAPlayerFormat = async (song) => {
    if (song.type === 'online') {
      // 在线歌曲：需要通过 Meting API 获取播放 URL
      // 这里返回基础信息，实际 URL 由 APlayer 的 customAudioType 或预加载处理
      return {
        name: song.name,
        artist: song.artist,
        cover: song.cover || '',
        // 使用 sourceId 作为标识，让 APlayer 通过 customAudioType 处理
        url: `meting://${song.source}/${song.sourceId}`,
        // 保留原始信息供后续处理
        _source: song.source,
        _sourceId: song.sourceId
      }
    }

    if (song.type === 'local') {
      // 本地歌曲：获取 Object URL
      // 先检查缓存
      if (localAudioURLs.has(song.id)) {
        return {
          name: song.name,
          artist: song.artist,
          cover: '',
          url: localAudioURLs.get(song.id)
        }
      }

      // 获取新的 URL
      const result = await getLocalAudioURL(song)
      if (!result.success) {
        console.warn(`[useMusic] 无法获取本地音频: ${song.name}`, result.error)
        return null
      }

      // 缓存 URL
      localAudioURLs.set(song.id, result.url)

      return {
        name: song.name,
        artist: song.artist,
        cover: '',
        url: result.url
      }
    }

    return null
  }

  /**
   * 从 Playlist 对象加载歌曲
   * @param {import('../types/playlist.js').Playlist} playlist - 歌单对象
   * @returns {Promise<boolean>} 是否成功
   */
  const loadFromPlaylist = async (playlist) => {
    if (!playlist) {
      console.warn('[useMusic] loadFromPlaylist: 歌单为空')
      return false
    }

    loading.value = true

    try {
      // 清理之前的本地音频 URLs
      cleanupLocalAudioURLs()

      if (playlist.mode === 'playlist') {
        // playlist 模式：使用 Meting API 加载
        if (playlist.source === 'spotify') {
          // Spotify 歌单
          applySpotifyPlaylist(playlist.sourceId)
          loading.value = false
          return true
        }

        // 网易云/QQ音乐歌单
        await loadMetingSongs(playlist.source, playlist.sourceId, { forceRefresh: false })
        return true
      }

      if (playlist.mode === 'collection') {
        // collection 模式：转换歌曲格式
        const convertedSongs = []

        for (const song of playlist.songs) {
          const converted = await convertSongToAPlayerFormat(song)
          if (converted) {
            convertedSongs.push(converted)
          }
        }

        songs.value = convertedSongs
        return true
      }

      console.warn('[useMusic] loadFromPlaylist: 未知的歌单模式', playlist.mode)
      return false
    } catch (error) {
      console.error('[useMusic] loadFromPlaylist 失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 从当前选中的歌单加载歌曲
   * 使用 usePlaylistManager 的 currentPlaylist
   * @returns {Promise<boolean>} 是否成功
   */
  const loadFromCurrentPlaylist = async () => {
    const { currentPlaylist, initialize } = usePlaylistManager()

    // 确保 PlaylistManager 已初始化
    initialize()

    if (!currentPlaylist.value) {
      console.warn('[useMusic] loadFromCurrentPlaylist: 没有选中的歌单')
      return false
    }

    return await loadFromPlaylist(currentPlaylist.value)
  }

  // 清理未完成的请求和本地音频 URLs（仅在组件上下文中注册）
  if (getCurrentInstance()) {
    onUnmounted(() => {
      if (abortController.value) {
        abortController.value.abort()
      }
      cleanupLocalAudioURLs()
    })
  }

  return {
    songs,
    loading,
    metingConfig,
    playlistId,
    platform,
    spotifyPlaylistId,
    isSpotify,
    loadSongs,
    updateMetingPlaylist,
    setPlaylistId,
    resetPlaylistId,
    setPlatform,
    applyCustomPlaylist,
    resetToDefault,
    setSpotifyPlaylistId,
    applySpotifyPlaylist,
    resetSpotifyToDefault,
    applyUrlPlaylist,
    // 歌单系统集成
    loadFromPlaylist,
    loadFromCurrentPlaylist,
    cleanupLocalAudioURLs,
    DEFAULT_PLAYLIST_ID,
    DEFAULT_SPOTIFY_PLAYLIST_ID,
    PLATFORMS
  }
}
