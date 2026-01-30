/**
 * Spotify 适配器
 * 当前为 iframe 嵌入模式的薄包装
 * 预留未来接入 Spotify Web Playback SDK
 */

import { PlayerAdapter } from '../PlayerAdapter.js'
import { PlaybackState, PlayerEvent, AdapterType } from '../constants.js'
import { createUnifiedTrack } from '../../types/music.js'

/**
 * @typedef {import('../../types/music.js').UnifiedTrack} UnifiedTrack
 */

/**
 * Spotify 适配器
 * iframe 模式下大部分控制方法为 no-op
 * @extends PlayerAdapter
 */
export class SpotifyAdapter extends PlayerAdapter {
  constructor() {
    super()

    /** @type {string|null} 当前歌单 ID */
    this._playlistId = null

    /** @type {number} 模拟音量值 */
    this._volume = 0.7
  }

  /**
   * 获取适配器类型
   * @returns {string}
   */
  getAdapterType() {
    return AdapterType.SPOTIFY
  }

  /**
   * 初始化 Spotify 适配器
   * iframe 模式下不需要创建实际播放器实例
   * @param {HTMLElement} [_container] - 未使用，iframe 在 Vue 组件中渲染
   * @param {Object} [options] - 配置选项
   * @param {string} [options.playlistId] - Spotify 歌单 ID
   * @returns {Promise<void>}
   */
  async initialize(_container, options = {}) {
    this._playlistId = options.playlistId || null
    this._initialized = true
    this._setPlaybackState(PlaybackState.IDLE)

    // 如果有歌单 ID，创建占位曲目
    if (this._playlistId) {
      this._tracks = [this._createPlaceholderTrack()]
    }

    this.emit(PlayerEvent.READY)
  }

  /**
   * 创建占位曲目（用于 Media Session 显示）
   * @returns {UnifiedTrack}
   * @private
   */
  _createPlaceholderTrack() {
    return createUnifiedTrack({
      id: `spotify_playlist_${this._playlistId}`,
      name: 'Spotify Playlist',
      artist: 'Spotify',
      meta: {
        source: 'spotify',
        sourceId: this._playlistId
      }
    })
  }

  /**
   * 销毁适配器
   * @returns {Promise<void>}
   */
  async destroy() {
    this._playlistId = null
    await super.destroy()
  }

  // ================== 播放控制（iframe 模式下为 no-op） ==================

  async play() {
    // iframe 模式下无法控制 Spotify 播放
    // 用户需要在 Spotify embed 内点击播放
    console.debug('[SpotifyAdapter] play() - iframe 模式无法控制')
  }

  async pause() {
    console.debug('[SpotifyAdapter] pause() - iframe 模式无法控制')
  }

  async stop() {
    console.debug('[SpotifyAdapter] stop() - iframe 模式无法控制')
  }

  async seek(_time) {
    console.debug('[SpotifyAdapter] seek() - iframe 模式无法控制')
  }

  // ================== 音量控制 ==================

  getVolume() {
    // 返回模拟值，实际 Spotify embed 音量由用户在 iframe 内控制
    return this._volume
  }

  setVolume(volume) {
    // 保存模拟值，但无法影响实际 Spotify 播放
    this._volume = Math.max(0, Math.min(1, volume))
    this.emit(PlayerEvent.VOLUME_CHANGE, this._volume)
  }

  // ================== 进度查询 ==================

  getCurrentTime() {
    // iframe 模式无法获取播放进度
    return 0
  }

  getDuration() {
    // iframe 模式无法获取时长
    return 0
  }

  // ================== 曲目列表管理 ==================

  /**
   * 加载 Spotify 歌单
   * @param {UnifiedTrack[]} tracks - 不使用，Spotify 歌单由 embed 内部管理
   * @returns {Promise<void>}
   */
  async loadPlaylist(tracks) {
    // Spotify iframe 模式下，歌单由 embed 内部管理
    // 这里只保存引用供 Media Session 使用
    if (tracks && tracks.length > 0) {
      this._tracks = [...tracks]
      this._currentIndex = 0
    }
    this.emit(PlayerEvent.PLAYLIST_LOADED, { tracks: this._tracks })
  }

  /**
   * 设置 Spotify 歌单 ID
   * @param {string} playlistId - Spotify 歌单 ID
   */
  setPlaylistId(playlistId) {
    this._playlistId = playlistId
    this._tracks = [this._createPlaceholderTrack()]
    this._currentIndex = 0
    this.emit(PlayerEvent.PLAYLIST_LOADED, {
      tracks: this._tracks,
      playlistId
    })
  }

  /**
   * 获取当前歌单 ID
   * @returns {string|null}
   */
  getPlaylistId() {
    return this._playlistId
  }

  // ================== 切歌控制 ==================

  async skipNext() {
    console.debug('[SpotifyAdapter] skipNext() - iframe 模式无法控制')
  }

  async skipPrevious() {
    console.debug('[SpotifyAdapter] skipPrevious() - iframe 模式无法控制')
  }

  async switchTrack(_index) {
    console.debug('[SpotifyAdapter] switchTrack() - iframe 模式无法控制')
  }

  // ================== 能力查询 ==================

  supportsLyrics() {
    // Spotify embed 有自己的歌词显示
    return false
  }

  supportsSeek() {
    // iframe 模式无法控制跳转
    return false
  }

  hasBuiltInUI() {
    return true
  }

  hasInternalPlaylist() {
    // Spotify embed 完全内部管理播放列表
    return true
  }
}
