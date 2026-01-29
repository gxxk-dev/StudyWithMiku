/**
 * Media Session API 封装
 * 为 APlayer 播放器提供系统媒体控制支持
 */

import { getConfig } from '../services/runtimeConfig.js'

// ===== 内部状态变量 =====
let currentPlayerType = null // 'aplayer' | 'spotify' | null
let aplayerInstance = null // APlayer 实例引用
const eventListeners = new Map() // 事件监听器引用（用于清理）

// 浏览器兼容性检测
const isMediaSessionSupported = 'mediaSession' in navigator

// 播放进度更新节流
let lastPositionUpdateTime = 0

// ===== 辅助函数 =====

/**
 * 创建 MediaMetadata 对象
 * @param {Object} song - 歌曲对象 { name, artist, cover }
 * @returns {MediaMetadata|null}
 */
function createMediaMetadata(song) {
  if (!song) return null

  return new MediaMetadata({
    title: song.name || 'Unknown',
    artist: song.artist || 'Unknown Artist',
    album: '',
    artwork: song.cover
      ? [
          { src: song.cover, sizes: '96x96', type: 'image/jpeg' },
          { src: song.cover, sizes: '128x128', type: 'image/jpeg' },
          { src: song.cover, sizes: '192x192', type: 'image/jpeg' },
          { src: song.cover, sizes: '256x256', type: 'image/jpeg' },
          { src: song.cover, sizes: '384x384', type: 'image/jpeg' },
          { src: song.cover, sizes: '512x512', type: 'image/jpeg' }
        ]
      : []
  })
}

/**
 * 更新播放进度状态
 * @param {Object} aplayer - APlayer 实例
 */
function updatePositionState(aplayer) {
  if (!isMediaSessionSupported || !aplayer?.audio) return

  const now = Date.now()
  if (now - lastPositionUpdateTime < getConfig('UI_CONFIG', 'MEDIA_POSITION_UPDATE_INTERVAL'))
    return
  lastPositionUpdateTime = now

  try {
    const duration = aplayer.audio.duration
    const position = aplayer.audio.currentTime

    // 确保值有效
    if (!isFinite(duration) || duration <= 0) return
    if (!isFinite(position) || position < 0) return

    navigator.mediaSession.setPositionState({
      duration: duration,
      playbackRate: 1.0,
      position: Math.min(position, duration)
    })
  } catch (error) {
    // 某些浏览器可能不支持或参数无效
    console.debug('[MediaSession] setPositionState 失败:', error)
  }
}

/**
 * 设置 APlayer 事件监听器
 * @param {Object} aplayer - APlayer 实例
 * @param {Array} songs - 歌曲列表
 */
function setupAPlayerListeners(aplayer, songs) {
  const handlers = {
    play: () => {
      navigator.mediaSession.playbackState = 'playing'
      updatePositionState(aplayer)
    },
    pause: () => {
      navigator.mediaSession.playbackState = 'paused'
    },
    listswitch: (event) => {
      const song = songs[event.index]
      if (song) {
        navigator.mediaSession.metadata = createMediaMetadata(song)
        // 重置进度节流时间，确保立即更新
        lastPositionUpdateTime = 0
        updatePositionState(aplayer)
      }
    },
    ended: () => {
      navigator.mediaSession.playbackState = 'paused'
    },
    timeupdate: () => {
      updatePositionState(aplayer)
    }
  }

  // 绑定事件并保存引用
  Object.entries(handlers).forEach(([event, handler]) => {
    aplayer.on(event, handler)
    eventListeners.set(event, handler)
  })
}

/**
 * 设置媒体控制处理器
 * @param {Object} aplayer - APlayer 实例
 */
function setupMediaActionHandlers(aplayer) {
  const actionHandlers = {
    play: () => {
      console.debug('[MediaSession] 系统播放')
      aplayer.play()
    },
    pause: () => {
      console.debug('[MediaSession] 系统暂停')
      aplayer.pause()
    },
    previoustrack: () => {
      console.debug('[MediaSession] 系统上一首')
      aplayer.skipBack()
    },
    nexttrack: () => {
      console.debug('[MediaSession] 系统下一首')
      aplayer.skipForward()
    },
    seekforward: (details) => {
      const skipTime = details?.seekOffset || 10
      const newTime = aplayer.audio.currentTime + skipTime
      console.debug('[MediaSession] 系统快进', skipTime, '秒')
      aplayer.seek(Math.min(newTime, aplayer.audio.duration))
    },
    seekbackward: (details) => {
      const skipTime = details?.seekOffset || 10
      const newTime = aplayer.audio.currentTime - skipTime
      console.debug('[MediaSession] 系统快退', skipTime, '秒')
      aplayer.seek(Math.max(newTime, 0))
    },
    seekto: (details) => {
      if (details?.seekTime != null) {
        console.debug('[MediaSession] 系统跳转到', details.seekTime, '秒')
        aplayer.seek(details.seekTime)
      }
    }
  }

  Object.entries(actionHandlers).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch (error) {
      console.warn(`[MediaSession] 设置 ${action} 失败:`, error)
    }
  })
}

/**
 * 获取当前播放的歌曲
 * @param {Object} aplayer - APlayer 实例
 * @param {Array} songs - 歌曲列表
 * @returns {Object|null}
 */
function getCurrentSong(aplayer, songs) {
  if (!aplayer?.list || !songs?.length) return null
  const index = aplayer.list.index
  return songs[index] || songs[0]
}

// ===== 公开 API =====

/**
 * 初始化 Media Session API
 * @param {string} type - 播放器类型: 'aplayer' | 'spotify'
 * @param {Object|null} playerInstance - APlayer 实例 (Spotify 时为 null)
 * @param {Object} metadata - 元数据对象
 * @param {Array} metadata.songs - 歌曲列表 (APlayer)
 * @param {string} metadata.platform - 平台名称
 * @param {string} metadata.playlistId - 歌单 ID
 */
export function initializeMediaSession(type, playerInstance, metadata) {
  // 浏览器兼容性检查
  if (!isMediaSessionSupported) {
    console.warn('[MediaSession] 浏览器不支持 Media Session API')
    return
  }

  // Spotify 直接返回，让嵌入播放器自己管理
  if (type === 'spotify') {
    console.debug('[MediaSession] Spotify 播放器跳过初始化')
    return
  }

  // 只处理 APlayer
  if (type !== 'aplayer') {
    console.warn('[MediaSession] 未知的播放器类型:', type)
    return
  }

  // 参数验证
  if (!playerInstance) {
    console.error('[MediaSession] APlayer 实例为空')
    return
  }

  const songs = metadata?.songs
  if (!songs || songs.length === 0) {
    console.warn('[MediaSession] 歌曲列表为空')
    return
  }

  // 清理旧的状态
  cleanupMediaSession()

  console.debug('[MediaSession] 初始化 APlayer，歌曲数:', songs.length)

  // 保存状态
  currentPlayerType = type
  aplayerInstance = playerInstance

  // 设置初始元数据
  const currentSong = getCurrentSong(playerInstance, songs)
  if (currentSong) {
    navigator.mediaSession.metadata = createMediaMetadata(currentSong)
  }

  // 设置初始播放状态
  navigator.mediaSession.playbackState = playerInstance.audio.paused ? 'paused' : 'playing'

  // 绑定事件监听器
  setupAPlayerListeners(playerInstance, songs)

  // 注册媒体控制处理器
  setupMediaActionHandlers(playerInstance)

  // 初始化播放进度
  lastPositionUpdateTime = 0
  updatePositionState(playerInstance)
}

/**
 * 清理 Media Session
 */
export function cleanupMediaSession() {
  // 避免重复清理
  if (!currentPlayerType && eventListeners.size === 0) {
    return
  }

  console.debug('[MediaSession] 清理')

  // 1. 移除 APlayer 事件监听器
  if (aplayerInstance && eventListeners.size > 0) {
    eventListeners.forEach((handler, event) => {
      try {
        aplayerInstance.off(event, handler)
      } catch (error) {
        // 静默处理
      }
    })
  }
  eventListeners.clear()

  // 2. 清除 action handlers
  if (isMediaSessionSupported) {
    const actions = [
      'play',
      'pause',
      'previoustrack',
      'nexttrack',
      'seekforward',
      'seekbackward',
      'seekto'
    ]
    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      } catch (error) {
        // 静默处理
      }
    })

    // 3. 重置元数据和播放状态
    try {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    } catch (error) {
      // 静默处理
    }
  }

  // 4. 重置内部状态
  currentPlayerType = null
  aplayerInstance = null
  lastPositionUpdateTime = 0
}
