/**
 * Spotify 数据源提供者
 * Spotify 歌单引用（不获取实际曲目）
 */

import { MusicSourceProvider } from './MusicSourceProvider.js'
import { createUnifiedTrack } from '../../types/music.js'

/**
 * @typedef {import('../../types/music.js').UnifiedTrack} UnifiedTrack
 */

/**
 * Spotify 数据源提供者
 * 返回标记性 UnifiedTrack，实际播放由 SpotifyAdapter 内部管理
 * @extends MusicSourceProvider
 */
export class SpotifyProvider extends MusicSourceProvider {
  /**
   * 获取数据源类型
   * @returns {string}
   */
  getSourceType() {
    return 'spotify'
  }

  /**
   * 是否支持缓存
   * @returns {boolean}
   */
  supportsCaching() {
    // Spotify embed 自己管理缓存
    return false
  }

  /**
   * 获取歌单曲目
   * @param {string} id - Spotify 歌单 ID
   * @param {Object} [_options] - 选项（未使用）
   * @returns {Promise<{tracks: UnifiedTrack[], fromCache: boolean}>}
   */
  async fetchPlaylist(id, _options = {}) {
    // Spotify 不需要获取实际曲目列表
    // 返回一个占位 track 用于 Media Session
    const placeholderTrack = createUnifiedTrack({
      id: `spotify_playlist_${id}`,
      name: 'Spotify Playlist',
      artist: 'Spotify',
      meta: {
        source: 'spotify',
        sourceId: id
      }
    })

    return {
      tracks: [placeholderTrack],
      fromCache: false
    }
  }
}
