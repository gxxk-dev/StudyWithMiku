/**
 * 本地音频数据源提供者
 * 管理 Object URL 创建和释放
 */

import { MusicSourceProvider } from './MusicSourceProvider.js'
import { getLocalAudioURL } from '../../services/localAudioStorage.js'
import { createUnifiedTrack } from '../../types/music.js'

/**
 * @typedef {import('../../types/music.js').UnifiedTrack} UnifiedTrack
 * @typedef {import('../../types/playlist.js').Song} Song
 */

/**
 * 本地音频数据源提供者
 * @extends MusicSourceProvider
 */
export class LocalProvider extends MusicSourceProvider {
  constructor() {
    super()

    /**
     * Object URL 缓存
     * @type {Map<string, string>}
     */
    this._urlCache = new Map()
  }

  /**
   * 获取数据源类型
   * @returns {string}
   */
  getSourceType() {
    return 'local'
  }

  /**
   * 是否支持缓存
   * @returns {boolean}
   */
  supportsCaching() {
    return false
  }

  /**
   * 从 Song 列表获取曲目
   * @param {string} _id - 未使用
   * @param {Object} options - 选项
   * @param {Song[]} options.songs - 歌曲列表
   * @returns {Promise<{tracks: UnifiedTrack[], fromCache: boolean}>}
   */
  async fetchPlaylist(_id, options = {}) {
    const { songs = [] } = options

    if (!songs.length) {
      return { tracks: [], fromCache: false }
    }

    const tracks = []

    for (const song of songs) {
      const track = await this._convertSongToTrack(song)
      if (track) {
        tracks.push(track)
      }
    }

    return { tracks, fromCache: false }
  }

  /**
   * 将 Song 转换为 UnifiedTrack
   * @param {Song} song - 歌曲对象
   * @returns {Promise<UnifiedTrack|null>}
   * @private
   */
  async _convertSongToTrack(song) {
    if (song.type !== 'local') {
      // 非本地歌曲，直接转换
      return createUnifiedTrack({
        id: song.id,
        name: song.name,
        artist: song.artist,
        cover: song.cover,
        url: song.url,
        meta: {
          source: song.source,
          sourceId: song.sourceId,
          type: song.type
        }
      })
    }

    // 本地歌曲：获取 Object URL
    // 先检查缓存
    if (this._urlCache.has(song.id)) {
      return createUnifiedTrack({
        id: song.id,
        name: song.name,
        artist: song.artist,
        url: this._urlCache.get(song.id),
        meta: {
          source: 'local',
          type: 'local',
          fileName: song.fileName,
          handleKey: song.handleKey,
          storage: song.storage
        }
      })
    }

    // 获取新的 URL
    const result = await getLocalAudioURL(song)
    if (!result.success) {
      console.warn(`[LocalProvider] 无法获取本地音频: ${song.name}`, result.error)
      return null
    }

    // 缓存 URL
    this._urlCache.set(song.id, result.url)

    return createUnifiedTrack({
      id: song.id,
      name: song.name,
      artist: song.artist,
      url: result.url,
      meta: {
        source: 'local',
        type: 'local',
        fileName: song.fileName,
        handleKey: song.handleKey,
        storage: song.storage
      }
    })
  }

  /**
   * 清理所有 Object URL
   */
  cleanup() {
    for (const url of this._urlCache.values()) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // 静默处理
      }
    }
    this._urlCache.clear()
  }

  /**
   * 清理指定歌曲的 Object URL
   * @param {string} songId - 歌曲 ID
   */
  cleanupSong(songId) {
    const url = this._urlCache.get(songId)
    if (url) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // 静默处理
      }
      this._urlCache.delete(songId)
    }
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  getCacheSize() {
    return this._urlCache.size
  }
}
