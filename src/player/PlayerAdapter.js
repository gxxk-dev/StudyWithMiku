/**
 * 播放器适配器抽象基类
 * 定义统一的播放器接口，所有具体适配器必须实现这些方法
 */

import { PlaybackState, PlayerEvent, RepeatMode } from './constants.js'

/**
 * @typedef {import('../types/music.js').UnifiedTrack} UnifiedTrack
 */

/**
 * 播放器适配器抽象基类
 * 内置简单事件发射器，提供统一播放接口
 */
export class PlayerAdapter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map()

    /** @type {PlaybackState} */
    this._state = PlaybackState.IDLE

    /** @type {UnifiedTrack[]} */
    this._tracks = []

    /** @type {number} */
    this._currentIndex = 0

    /** @type {RepeatMode} */
    this._repeatMode = RepeatMode.ALL

    /** @type {boolean} */
    this._initialized = false
  }

  // ================== 事件发射器 ==================

  /**
   * 注册事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event).add(callback)

    // 返回取消监听的函数
    return () => this.off(event, callback)
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    const listeners = this._listeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} [data] - 事件数据
   */
  emit(event, data) {
    const listeners = this._listeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[PlayerAdapter] 事件回调错误 (${event}):`, error)
        }
      })
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners() {
    this._listeners.clear()
  }

  // ================== 生命周期方法 ==================

  /**
   * 初始化播放器
   * @param {HTMLElement} [container] - 容器元素
   * @param {Object} [options] - 初始化选项
   * @returns {Promise<void>}
   */
  async initialize(container, _options = {}) {
    throw new Error('子类必须实现 initialize 方法')
  }

  /**
   * 销毁播放器
   * @returns {Promise<void>}
   */
  async destroy() {
    this.removeAllListeners()
    this._tracks = []
    this._currentIndex = 0
    this._state = PlaybackState.IDLE
    this._initialized = false
  }

  /**
   * 检查是否已初始化
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized
  }

  // ================== 播放控制方法 ==================

  /**
   * 播放
   * @returns {Promise<void>}
   */
  async play() {
    throw new Error('子类必须实现 play 方法')
  }

  /**
   * 暂停
   * @returns {Promise<void>}
   */
  async pause() {
    throw new Error('子类必须实现 pause 方法')
  }

  /**
   * 停止
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('子类必须实现 stop 方法')
  }

  /**
   * 跳转到指定时间
   * @param {number} time - 秒数
   * @returns {Promise<void>}
   */
  async seek(_time) {
    throw new Error('子类必须实现 seek 方法')
  }

  // ================== 音量控制 ==================

  /**
   * 获取当前音量
   * @returns {number} 0-1 之间的音量值
   */
  getVolume() {
    throw new Error('子类必须实现 getVolume 方法')
  }

  /**
   * 设置音量
   * @param {number} volume - 0-1 之间的音量值
   * @returns {void}
   */
  setVolume(_volume) {
    throw new Error('子类必须实现 setVolume 方法')
  }

  // ================== 进度查询 ==================

  /**
   * 获取当前播放时间
   * @returns {number} 秒数
   */
  getCurrentTime() {
    throw new Error('子类必须实现 getCurrentTime 方法')
  }

  /**
   * 获取总时长
   * @returns {number} 秒数
   */
  getDuration() {
    throw new Error('子类必须实现 getDuration 方法')
  }

  // ================== 状态查询 ==================

  /**
   * 获取播放状态
   * @returns {string} PlaybackState 枚举值
   */
  getPlaybackState() {
    return this._state
  }

  /**
   * 设置播放状态（内部使用）
   * @param {string} state - PlaybackState 枚举值
   * @protected
   */
  _setPlaybackState(state) {
    if (this._state !== state) {
      this._state = state
      this.emit(PlayerEvent.STATE_CHANGE, state)
    }
  }

  // ================== 曲目列表管理 ==================

  /**
   * 加载播放列表
   * @param {UnifiedTrack[]} tracks - 曲目列表
   * @returns {Promise<void>}
   */
  async loadPlaylist(_tracks) {
    throw new Error('子类必须实现 loadPlaylist 方法')
  }

  /**
   * 获取当前曲目
   * @returns {UnifiedTrack|null}
   */
  getCurrentTrack() {
    if (this._tracks.length === 0) return null
    return this._tracks[this._currentIndex] || null
  }

  /**
   * 获取当前曲目索引
   * @returns {number}
   */
  getCurrentTrackIndex() {
    return this._currentIndex
  }

  /**
   * 获取曲目列表
   * @returns {UnifiedTrack[]}
   */
  getTrackList() {
    return [...this._tracks]
  }

  /**
   * 获取曲目列表长度
   * @returns {number}
   */
  getTrackCount() {
    return this._tracks.length
  }

  // ================== 切歌控制 ==================

  /**
   * 下一首
   * @returns {Promise<void>}
   */
  async skipNext() {
    throw new Error('子类必须实现 skipNext 方法')
  }

  /**
   * 上一首
   * @returns {Promise<void>}
   */
  async skipPrevious() {
    throw new Error('子类必须实现 skipPrevious 方法')
  }

  /**
   * 切换到指定曲目
   * @param {number} index - 曲目索引
   * @returns {Promise<void>}
   */
  async switchTrack(_index) {
    throw new Error('子类必须实现 switchTrack 方法')
  }

  // ================== 循环模式 ==================

  /**
   * 获取循环模式
   * @returns {string} RepeatMode 枚举值
   */
  getRepeatMode() {
    return this._repeatMode
  }

  /**
   * 设置循环模式
   * @param {string} mode - RepeatMode 枚举值
   * @returns {void}
   */
  setRepeatMode(mode) {
    if (Object.values(RepeatMode).includes(mode)) {
      this._repeatMode = mode
    }
  }

  // ================== 能力查询 ==================

  /**
   * 是否支持歌词显示
   * @returns {boolean}
   */
  supportsLyrics() {
    return false
  }

  /**
   * 是否支持跳转
   * @returns {boolean}
   */
  supportsSeek() {
    return true
  }

  /**
   * 是否有内置 UI
   * @returns {boolean}
   */
  hasBuiltInUI() {
    return false
  }

  /**
   * 是否内部管理播放列表（Spotify iframe 模式）
   * @returns {boolean}
   */
  hasInternalPlaylist() {
    return false
  }

  /**
   * 获取适配器类型标识
   * @returns {string}
   */
  getAdapterType() {
    throw new Error('子类必须实现 getAdapterType 方法')
  }
}
