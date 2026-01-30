/**
 * 歌单管理 Composable
 * 提供歌单的 CRUD 操作、持久化和状态管理
 */

import { ref, computed } from 'vue'
import { STORAGE_KEYS, PLAYLIST_CONFIG } from '../config/constants.js'
import { safeLocalStorageGetJSON, safeLocalStorageSetJSON } from '../utils/storage.js'
import { ErrorTypes } from '../types/playlist.js'
import { deleteFromOPFS, deleteFileHandle } from '../services/localAudioStorage.js'

// ============ 模块级状态（单例模式）============

/** @type {import('vue').Ref<import('../types/playlist.js').Playlist[]>} */
const playlists = ref([])

/** @type {import('vue').Ref<string|null>} */
const currentPlaylistId = ref(null)

/** @type {import('vue').Ref<string|null>} */
const defaultPlaylistId = ref(null)

/** @type {boolean} */
let initialized = false

// ============ 工具函数 ============

/**
 * 生成唯一 ID
 * @returns {string}
 */
const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 持久化歌单数据到 localStorage
 */
const persist = () => {
  safeLocalStorageSetJSON(STORAGE_KEYS.PLAYLISTS, playlists.value)
  safeLocalStorageSetJSON(STORAGE_KEYS.CURRENT_PLAYLIST, currentPlaylistId.value)
  safeLocalStorageSetJSON(STORAGE_KEYS.DEFAULT_PLAYLIST, defaultPlaylistId.value)
}

/**
 * 删除本地歌曲的存储文件
 * @param {import('../types/playlist.js').LocalSong} song
 */
const deleteLocalSongStorage = async (song) => {
  if (song.storage === 'managed') {
    await deleteFromOPFS(song.fileName)
  } else if (song.storage === 'reference') {
    await deleteFileHandle(song.handleKey)
  }
}

// ============ Composable ============

export const usePlaylistManager = () => {
  // ============ Computed ============

  /**
   * 当前选中的歌单
   * @returns {Playlist|null}
   */
  const currentPlaylist = computed(() => {
    if (!currentPlaylistId.value) return null
    return playlists.value.find((p) => p.id === currentPlaylistId.value) || null
  })

  /**
   * 默认歌单
   * @returns {Playlist|null}
   */
  const defaultPlaylist = computed(() => {
    if (!defaultPlaylistId.value) return null
    return playlists.value.find((p) => p.id === defaultPlaylistId.value) || null
  })

  /**
   * 按 order 排序的歌单列表
   * @returns {Playlist[]}
   */
  const sortedPlaylists = computed(() => {
    return [...playlists.value].sort((a, b) => a.order - b.order)
  })

  // ============ 初始化 ============

  /**
   * 初始化歌单管理器，从 localStorage 加载数据
   * @returns {{success: boolean, error?: string}}
   */
  const initialize = () => {
    if (initialized) {
      return { success: true }
    }

    try {
      playlists.value = safeLocalStorageGetJSON(STORAGE_KEYS.PLAYLISTS, [])
      currentPlaylistId.value = safeLocalStorageGetJSON(STORAGE_KEYS.CURRENT_PLAYLIST, null)
      defaultPlaylistId.value = safeLocalStorageGetJSON(STORAGE_KEYS.DEFAULT_PLAYLIST, null)

      // 验证 currentPlaylistId 是否有效
      if (
        currentPlaylistId.value &&
        !playlists.value.find((p) => p.id === currentPlaylistId.value)
      ) {
        currentPlaylistId.value = null
      }

      // 验证 defaultPlaylistId 是否有效
      if (
        defaultPlaylistId.value &&
        !playlists.value.find((p) => p.id === defaultPlaylistId.value)
      ) {
        defaultPlaylistId.value = null
      }

      initialized = true
      return { success: true }
    } catch (err) {
      console.error('[PlaylistManager] 初始化失败:', err)
      return { success: false, error: ErrorTypes.STORAGE_ERROR }
    }
  }

  // ============ CRUD 操作 ============

  /**
   * 创建新歌单
   * @param {Object} data - 歌单数据
   * @param {string} data.name - 歌单名称
   * @param {string} [data.cover] - 封面 URL
   * @param {'playlist'|'collection'} data.mode - 歌单模式
   * @param {string} [data.source] - playlist 模式的音乐源
   * @param {string} [data.sourceId] - playlist 模式的源歌单 ID
   * @param {import('../types/playlist.js').Song[]} [data.songs] - collection 模式的歌曲列表
   * @returns {{success: boolean, playlist?: import('../types/playlist.js').Playlist, error?: string}}
   */
  const createPlaylist = (data) => {
    if (playlists.value.length >= PLAYLIST_CONFIG.MAX_PLAYLISTS) {
      return { success: false, error: ErrorTypes.MAX_PLAYLISTS_REACHED }
    }

    const maxOrder = playlists.value.reduce((max, p) => Math.max(max, p.order), -1)

    /** @type {import('../types/playlist.js').Playlist} */
    let playlist

    if (data.mode === 'playlist') {
      playlist = {
        id: generateId(),
        name: data.name,
        cover: data.cover,
        order: maxOrder + 1,
        mode: 'playlist',
        source: data.source,
        sourceId: data.sourceId
      }
    } else if (data.mode === 'collection') {
      playlist = {
        id: generateId(),
        name: data.name,
        cover: data.cover,
        order: maxOrder + 1,
        mode: 'collection',
        songs: data.songs || []
      }
    } else {
      return { success: false, error: ErrorTypes.INVALID_PLAYLIST_MODE }
    }

    playlists.value.push(playlist)
    persist()

    return { success: true, playlist }
  }

  /**
   * 更新歌单
   * @param {string} id - 歌单 ID
   * @param {Object} updates - 要更新的字段
   * @returns {{success: boolean, playlist?: import('../types/playlist.js').Playlist, error?: string}}
   */
  const updatePlaylist = (id, updates) => {
    const index = playlists.value.findIndex((p) => p.id === id)
    if (index === -1) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    // 不允许更改 id 和 mode
    const safeUpdates = { ...updates }
    delete safeUpdates.id
    delete safeUpdates.mode

    playlists.value[index] = {
      ...playlists.value[index],
      ...safeUpdates
    }

    persist()
    return { success: true, playlist: playlists.value[index] }
  }

  /**
   * 删除歌单
   * @param {string} id - 歌单 ID
   * @param {Object} [options]
   * @param {boolean} [options.deleteLocalFiles=false] - 是否删除关联的本地音频文件
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const deletePlaylist = async (id, options = {}) => {
    const { deleteLocalFiles = false } = options
    const index = playlists.value.findIndex((p) => p.id === id)

    if (index === -1) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    const playlist = playlists.value[index]

    // 如果是 collection 模式且需要删除本地文件
    if (deleteLocalFiles && playlist.mode === 'collection') {
      for (const song of playlist.songs) {
        if (song.type === 'local') {
          await deleteLocalSongStorage(song)
        }
      }
    }

    // 从数组中移除
    playlists.value.splice(index, 1)

    // 清理引用
    if (currentPlaylistId.value === id) {
      currentPlaylistId.value = null
    }
    if (defaultPlaylistId.value === id) {
      defaultPlaylistId.value = null
    }

    persist()
    return { success: true }
  }

  /**
   * 获取歌单
   * @param {string} id - 歌单 ID
   * @returns {import('../types/playlist.js').Playlist|null}
   */
  const getPlaylist = (id) => {
    return playlists.value.find((p) => p.id === id) || null
  }

  // ============ 歌曲操作（仅 collection 模式）============

  /**
   * 添加歌曲到歌单
   * @param {string} playlistId - 歌单 ID
   * @param {import('../types/playlist.js').Song} song - 歌曲对象
   * @returns {{success: boolean, error?: string}}
   */
  const addSong = (playlistId, song) => {
    const playlist = playlists.value.find((p) => p.id === playlistId)

    if (!playlist) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    if (playlist.mode !== 'collection') {
      return { success: false, error: ErrorTypes.INVALID_PLAYLIST_MODE }
    }

    if (playlist.songs.length >= PLAYLIST_CONFIG.MAX_SONGS_PER_COLLECTION) {
      return { success: false, error: ErrorTypes.MAX_SONGS_REACHED }
    }

    // 确保歌曲有 ID
    const songWithId = {
      ...song,
      id: song.id || generateId()
    }

    playlist.songs.push(songWithId)
    persist()

    return { success: true }
  }

  /**
   * 批量添加歌曲到歌单
   * @param {string} playlistId - 歌单 ID
   * @param {import('../types/playlist.js').Song[]} songs - 歌曲数组
   * @returns {{success: boolean, added?: number, error?: string}}
   */
  const addSongs = (playlistId, songs) => {
    const playlist = playlists.value.find((p) => p.id === playlistId)

    if (!playlist) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    if (playlist.mode !== 'collection') {
      return { success: false, error: ErrorTypes.INVALID_PLAYLIST_MODE }
    }

    const remaining = PLAYLIST_CONFIG.MAX_SONGS_PER_COLLECTION - playlist.songs.length
    const toAdd = songs.slice(0, remaining).map((song) => ({
      ...song,
      id: song.id || generateId()
    }))

    playlist.songs.push(...toAdd)
    persist()

    return { success: true, added: toAdd.length }
  }

  /**
   * 从歌单移除歌曲
   * @param {string} playlistId - 歌单 ID
   * @param {string} songId - 歌曲 ID
   * @param {Object} [options]
   * @param {boolean} [options.deleteLocalFile=false] - 是否删除本地音频文件
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const removeSong = async (playlistId, songId, options = {}) => {
    const { deleteLocalFile = false } = options
    const playlist = playlists.value.find((p) => p.id === playlistId)

    if (!playlist) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    if (playlist.mode !== 'collection') {
      return { success: false, error: ErrorTypes.INVALID_PLAYLIST_MODE }
    }

    const songIndex = playlist.songs.findIndex((s) => s.id === songId)
    if (songIndex === -1) {
      return { success: false, error: ErrorTypes.SONG_NOT_FOUND }
    }

    const song = playlist.songs[songIndex]

    // 删除本地文件
    if (deleteLocalFile && song.type === 'local') {
      await deleteLocalSongStorage(song)
    }

    playlist.songs.splice(songIndex, 1)
    persist()

    return { success: true }
  }

  /**
   * 重新排序歌曲
   * @param {string} playlistId - 歌单 ID
   * @param {number} fromIndex - 原位置
   * @param {number} toIndex - 目标位置
   * @returns {{success: boolean, error?: string}}
   */
  const reorderSongs = (playlistId, fromIndex, toIndex) => {
    const playlist = playlists.value.find((p) => p.id === playlistId)

    if (!playlist) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    if (playlist.mode !== 'collection') {
      return { success: false, error: ErrorTypes.INVALID_PLAYLIST_MODE }
    }

    if (
      fromIndex < 0 ||
      fromIndex >= playlist.songs.length ||
      toIndex < 0 ||
      toIndex >= playlist.songs.length
    ) {
      return { success: false, error: ErrorTypes.INVALID_DATA }
    }

    const [song] = playlist.songs.splice(fromIndex, 1)
    playlist.songs.splice(toIndex, 0, song)
    persist()

    return { success: true }
  }

  // ============ 选择操作 ============

  /**
   * 设置当前歌单
   * @param {string|null} id - 歌单 ID，null 表示清除选择
   * @returns {{success: boolean, error?: string}}
   */
  const setCurrentPlaylist = (id) => {
    if (id !== null && !playlists.value.find((p) => p.id === id)) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    currentPlaylistId.value = id
    persist()
    return { success: true }
  }

  /**
   * 设置默认歌单
   * @param {string|null} id - 歌单 ID，null 表示清除默认
   * @returns {{success: boolean, error?: string}}
   */
  const setDefaultPlaylist = (id) => {
    if (id !== null && !playlists.value.find((p) => p.id === id)) {
      return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
    }

    defaultPlaylistId.value = id
    persist()
    return { success: true }
  }

  /**
   * 重新排序歌单
   * @param {string[]} orderedIds - 按新顺序排列的歌单 ID 数组
   * @returns {{success: boolean, error?: string}}
   */
  const reorderPlaylists = (orderedIds) => {
    // 验证所有 ID 都存在
    for (const id of orderedIds) {
      if (!playlists.value.find((p) => p.id === id)) {
        return { success: false, error: ErrorTypes.PLAYLIST_NOT_FOUND }
      }
    }

    // 更新 order
    orderedIds.forEach((id, index) => {
      const playlist = playlists.value.find((p) => p.id === id)
      if (playlist) {
        playlist.order = index
      }
    })

    persist()
    return { success: true }
  }

  // ============ 导出 ============

  return {
    // 状态
    playlists,
    currentPlaylistId,
    defaultPlaylistId,

    // Computed
    currentPlaylist,
    defaultPlaylist,
    sortedPlaylists,

    // 初始化
    initialize,

    // CRUD
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylist,

    // 歌曲操作
    addSong,
    addSongs,
    removeSong,
    reorderSongs,

    // 选择
    setCurrentPlaylist,
    setDefaultPlaylist,
    reorderPlaylists
  }
}
