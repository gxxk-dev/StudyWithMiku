/**
 * APlayer 适配器
 * 包装 APlayer 库，实现统一播放器接口
 */

import APlayer from 'aplayer'
import { PlayerAdapter } from '../PlayerAdapter.js'
import { PlaybackState, PlayerEvent, RepeatMode, AdapterType } from '../constants.js'
import { toAPlayerFormat } from '../../types/music.js'
import { getConfig } from '../../services/runtimeConfig.js'

/**
 * @typedef {import('../../types/music.js').UnifiedTrack} UnifiedTrack
 * @typedef {import('../../types/music.js').APlayerSong} APlayerSong
 */

/**
 * APlayer 适配器
 * @extends PlayerAdapter
 */
export class APlayerAdapter extends PlayerAdapter {
  constructor() {
    super()

    /** @type {APlayer|null} */
    this._aplayer = null

    /** @type {Map<string, Function>} APlayer 事件回调引用（用于清理） */
    this._aplayerListeners = new Map()

    /** @type {HTMLElement|null} */
    this._container = null
  }

  /**
   * 获取适配器类型
   * @returns {string}
   */
  getAdapterType() {
    return AdapterType.APLAYER
  }

  /**
   * 初始化 APlayer
   * @param {HTMLElement} container - 容器元素
   * @param {Object} [options] - APlayer 配置选项
   * @returns {Promise<void>}
   */
  async initialize(container, options = {}) {
    if (this._initialized && this._aplayer) {
      console.warn('[APlayerAdapter] 已经初始化，先销毁旧实例')
      await this.destroy()
    }

    this._container = container

    const defaultOptions = {
      container,
      fixed: true,
      autoplay: false,
      audio: [],
      lrcType: 0,
      theme: '#2980b9',
      loop: 'all',
      order: 'list',
      preload: 'auto',
      volume: getConfig('AUDIO_CONFIG', 'DEFAULT_VOLUME'),
      mutex: true,
      listFolded: false,
      listMaxHeight: '200px',
      width: '300px'
    }

    this._aplayer = new APlayer({
      ...defaultOptions,
      ...options
    })

    // 同步初始曲目列表到内部状态
    // options.audio 可以是 APlayer 格式或 UnifiedTrack 格式
    if (options.audio && Array.isArray(options.audio)) {
      this._tracks = options.audio.map((song, index) => ({
        id: song.id || `aplayer_init_${index}`,
        name: song.name,
        artist: song.artist,
        cover: song.cover || '',
        url: song.url || '',
        lrc: song.lrc || '',
        meta: song.meta || { type: 'online' }
      }))
    }

    this._bindAPlayerEvents()
    this._initialized = true

    // 设置初始循环模式
    this._syncRepeatModeFromAPlayer()

    this.emit(PlayerEvent.READY)
  }

  /**
   * 绑定 APlayer 事件到适配器
   * @private
   */
  _bindAPlayerEvents() {
    if (!this._aplayer) return

    const handlers = {
      play: () => {
        this._setPlaybackState(PlaybackState.PLAYING)
        this.emit(PlayerEvent.PLAY)
      },
      pause: () => {
        this._setPlaybackState(PlaybackState.PAUSED)
        this.emit(PlayerEvent.PAUSE)
      },
      ended: () => {
        this._setPlaybackState(PlaybackState.ENDED)
        this.emit(PlayerEvent.ENDED)
      },
      error: () => {
        this._setPlaybackState(PlaybackState.ERROR)
        this.emit(PlayerEvent.ERROR)
      },
      canplay: () => {
        // 如果之前是 buffering 状态，恢复到 paused
        if (this._state === PlaybackState.BUFFERING) {
          this._setPlaybackState(PlaybackState.PAUSED)
        }
      },
      waiting: () => {
        this._setPlaybackState(PlaybackState.BUFFERING)
      },
      timeupdate: () => {
        this.emit(PlayerEvent.TIME_UPDATE, {
          currentTime: this.getCurrentTime(),
          duration: this.getDuration()
        })
      },
      volumechange: () => {
        this.emit(PlayerEvent.VOLUME_CHANGE, this.getVolume())
      },
      listswitch: (event) => {
        this._currentIndex = event.index
        const track = this._tracks[event.index]
        this.emit(PlayerEvent.TRACK_CHANGE, {
          index: event.index,
          track
        })
      }
    }

    // 绑定事件并保存引用
    Object.entries(handlers).forEach(([event, handler]) => {
      this._aplayer.on(event, handler)
      this._aplayerListeners.set(event, handler)
    })
  }

  /**
   * 从 APlayer 同步循环模式
   * @private
   */
  _syncRepeatModeFromAPlayer() {
    if (!this._aplayer) return

    const loop = this._aplayer.options.loop
    switch (loop) {
      case 'one':
        this._repeatMode = RepeatMode.ONE
        break
      case 'all':
        this._repeatMode = RepeatMode.ALL
        break
      case 'none':
        this._repeatMode = RepeatMode.NONE
        break
    }
  }

  /**
   * 销毁 APlayer
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this._aplayer) {
      // 移除 APlayer 事件监听器
      this._aplayerListeners.forEach((handler, event) => {
        try {
          this._aplayer.off(event, handler)
        } catch {
          // 静默处理
        }
      })
      this._aplayerListeners.clear()

      // 销毁 APlayer 实例
      try {
        this._aplayer.destroy()
      } catch (error) {
        console.warn('[APlayerAdapter] 销毁 APlayer 时出错:', error)
      }
      this._aplayer = null
    }

    this._container = null
    await super.destroy()
  }

  // ================== 播放控制 ==================

  async play() {
    if (!this._aplayer) return
    this._aplayer.play()
  }

  async pause() {
    if (!this._aplayer) return
    this._aplayer.pause()
  }

  async stop() {
    if (!this._aplayer) return
    this._aplayer.pause()
    this._aplayer.seek(0)
    this._setPlaybackState(PlaybackState.IDLE)
    this.emit(PlayerEvent.STOP)
  }

  async seek(time) {
    if (!this._aplayer) return
    const clampedTime = Math.max(0, Math.min(time, this.getDuration()))
    this._aplayer.seek(clampedTime)
  }

  // ================== 音量控制 ==================

  getVolume() {
    if (!this._aplayer?.audio) return 0
    return this._aplayer.audio.volume
  }

  setVolume(volume) {
    if (!this._aplayer?.audio) return
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this._aplayer.audio.volume = clampedVolume
  }

  // ================== 进度查询 ==================

  getCurrentTime() {
    if (!this._aplayer?.audio) return 0
    return this._aplayer.audio.currentTime || 0
  }

  getDuration() {
    if (!this._aplayer?.audio) return 0
    const duration = this._aplayer.audio.duration
    return isFinite(duration) ? duration : 0
  }

  // ================== 曲目列表管理 ==================

  /**
   * 加载播放列表
   * @param {UnifiedTrack[]} tracks - 统一格式曲目列表
   * @returns {Promise<void>}
   */
  async loadPlaylist(tracks) {
    if (!this._aplayer) {
      console.warn('[APlayerAdapter] 播放器未初始化，无法加载播放列表')
      return
    }

    // 保存 UnifiedTrack 列表
    this._tracks = [...tracks]

    // 转换为 APlayer 格式
    const aplayerSongs = tracks.map(toAPlayerFormat)

    // 清空现有列表并添加新曲目
    this._aplayer.list.clear()
    this._aplayer.list.add(aplayerSongs)

    this._currentIndex = 0
    this.emit(PlayerEvent.PLAYLIST_LOADED, { tracks: this._tracks })
  }

  // ================== 切歌控制 ==================

  async skipNext() {
    if (!this._aplayer) return
    this._aplayer.skipForward()
  }

  async skipPrevious() {
    if (!this._aplayer) return
    this._aplayer.skipBack()
  }

  async switchTrack(index) {
    if (!this._aplayer) return
    if (index < 0 || index >= this._tracks.length) {
      console.warn('[APlayerAdapter] 无效的曲目索引:', index)
      return
    }
    this._aplayer.list.switch(index)
  }

  // ================== 循环模式 ==================

  setRepeatMode(mode) {
    super.setRepeatMode(mode)

    if (!this._aplayer) return

    // 同步到 APlayer
    let aplayerLoop
    switch (mode) {
      case RepeatMode.ONE:
        aplayerLoop = 'one'
        break
      case RepeatMode.ALL:
        aplayerLoop = 'all'
        break
      case RepeatMode.NONE:
        aplayerLoop = 'none'
        break
      default:
        aplayerLoop = 'all'
    }

    // APlayer 需要通过设置 options 来改变循环模式
    // 注意：APlayer 的 loop 模式在初始化后可能无法直接修改
    // 这里只更新内部状态，实际效果可能需要重新初始化
    this._aplayer.options.loop = aplayerLoop
  }

  // ================== 能力查询 ==================

  supportsLyrics() {
    return true
  }

  supportsSeek() {
    return true
  }

  hasBuiltInUI() {
    return true
  }

  hasInternalPlaylist() {
    return false
  }

  // ================== 内部访问（逃生舱） ==================

  /**
   * 获取原始 APlayer 实例
   * 仅供内部使用，不应在抽象层外部调用
   * @returns {APlayer|null}
   * @internal
   */
  _getRawInstance() {
    return this._aplayer
  }

  /**
   * 获取容器元素
   * @returns {HTMLElement|null}
   */
  getContainer() {
    return this._container
  }
}
