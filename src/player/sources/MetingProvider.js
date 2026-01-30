/**
 * Meting API 数据源提供者
 * 支持网易云、QQ音乐等平台
 */

import { MusicSourceProvider } from './MusicSourceProvider.js'
import {
  fetchPlaylist as metingFetch,
  getCachedPlaylist,
  cachePlaylist
} from '../../services/meting.js'
import { prefetchPlaylistAudios } from '../../utils/audioPrefetch.js'
import { createUnifiedTrack } from '../../types/music.js'

/**
 * @typedef {import('../../types/music.js').UnifiedTrack} UnifiedTrack
 */

/**
 * Meting 数据源提供者
 * @extends MusicSourceProvider
 */
export class MetingProvider extends MusicSourceProvider {
  /**
   * @param {string} [platform='netease'] - 音乐平台
   */
  constructor(platform = 'netease') {
    super()

    /** @type {string} */
    this._platform = platform
  }

  /**
   * 获取数据源类型
   * @returns {string}
   */
  getSourceType() {
    return this._platform
  }

  /**
   * 设置平台
   * @param {string} platform - 平台名称 (netease/tencent)
   */
  setPlatform(platform) {
    this._platform = platform
  }

  /**
   * 获取当前平台
   * @returns {string}
   */
  getPlatform() {
    return this._platform
  }

  /**
   * 是否支持缓存
   * @returns {boolean}
   */
  supportsCaching() {
    return true
  }

  /**
   * 获取歌单曲目
   * @param {string} id - 歌单 ID
   * @param {Object} [options] - 选项
   * @param {boolean} [options.forceRefresh=false] - 是否强制刷新
   * @param {AbortSignal} [options.signal] - 取消信号
   * @param {boolean} [options.prefetch=true] - 是否预加载音频
   * @returns {Promise<{tracks: UnifiedTrack[], fromCache: boolean}>}
   */
  async fetchPlaylist(id, options = {}) {
    const { forceRefresh = false, signal, prefetch = true } = options

    // 尝试从缓存加载
    if (!forceRefresh) {
      const cachedEntry = getCachedPlaylist(this._platform, id)
      if (cachedEntry?.songs?.length && !cachedEntry.isExpired) {
        const tracks = this._convertToUnifiedTracks(cachedEntry.songs)

        if (prefetch) {
          this._startPrefetch(cachedEntry.songs, id)
        }

        return { tracks, fromCache: true }
      }
    }

    // 从网络加载
    try {
      const songs = await metingFetch(this._platform, id, signal)

      if (songs.length > 0) {
        // 缓存结果
        cachePlaylist(this._platform, id, songs)

        const tracks = this._convertToUnifiedTracks(songs)

        if (prefetch) {
          this._startPrefetch(songs, id)
        }

        return { tracks, fromCache: false }
      }

      return { tracks: [], fromCache: false }
    } catch (error) {
      // 如果网络失败，尝试使用过期缓存
      const cachedEntry = getCachedPlaylist(this._platform, id)
      if (cachedEntry?.songs?.length) {
        console.warn('[MetingProvider] 网络请求失败，使用过期缓存')
        const tracks = this._convertToUnifiedTracks(cachedEntry.songs)
        return { tracks, fromCache: true }
      }

      throw error
    }
  }

  /**
   * 将 Meting 格式转换为 UnifiedTrack
   * @param {Object[]} songs - Meting API 返回的歌曲列表
   * @returns {UnifiedTrack[]}
   * @private
   */
  _convertToUnifiedTracks(songs) {
    return songs.map((song, index) =>
      createUnifiedTrack({
        id: `${this._platform}_${index}_${Date.now()}`,
        name: song.name,
        artist: song.artist,
        cover: song.cover,
        url: song.url,
        lrc: song.lrc,
        meta: {
          source: this._platform,
          type: 'online'
        }
      })
    )
  }

  /**
   * 开始预加载音频
   * @param {Object[]} songs - Meting 格式歌曲列表
   * @param {string} id - 歌单 ID
   * @private
   */
  _startPrefetch(songs, id) {
    prefetchPlaylistAudios(songs, {
      platform: this._platform,
      id
    }).catch((error) => {
      console.warn('[MetingProvider] 预加载失败:', error)
    })
  }
}
