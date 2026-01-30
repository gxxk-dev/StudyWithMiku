/**
 * Media Session 桥接
 * 完全基于 Vue 响应式驱动，不直接持有任何播放器实例
 */

import { watch } from 'vue'
import { getConfig } from '../services/runtimeConfig.js'
import { PlaybackState } from './constants.js'

/**
 * @typedef {import('../composables/usePlayer.js').usePlayer} UsePlayer
 */

let cleanupFn = null
let lastPositionUpdate = 0

/**
 * 设置 Media Session 桥接
 * @param {ReturnType<UsePlayer>} player - usePlayer() 返回值
 * @returns {Function} cleanup 函数
 */
export function setupMediaSession(player) {
  if (!('mediaSession' in navigator)) {
    console.debug('[MediaSession] 浏览器不支持 Media Session API')
    return () => {}
  }

  // 防止重复设置
  if (cleanupFn) {
    cleanupFn()
  }

  const unwatchers = []

  // ===== 1. 元数据更新 =====
  // 监听 currentTrack 变化，自动更新 metadata
  unwatchers.push(
    watch(
      () => player.currentTrack.value,
      (track) => {
        if (!track) {
          navigator.mediaSession.metadata = null
          return
        }

        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.name || 'Unknown',
          artist: track.artist || 'Unknown Artist',
          album: track.album || '',
          artwork: track.cover
            ? [
                { src: track.cover, sizes: '96x96', type: 'image/jpeg' },
                { src: track.cover, sizes: '128x128', type: 'image/jpeg' },
                { src: track.cover, sizes: '192x192', type: 'image/jpeg' },
                { src: track.cover, sizes: '256x256', type: 'image/jpeg' },
                { src: track.cover, sizes: '384x384', type: 'image/jpeg' },
                { src: track.cover, sizes: '512x512', type: 'image/jpeg' }
              ]
            : []
        })
      },
      { immediate: true }
    )
  )

  // ===== 2. 播放状态更新 =====
  // 监听 playbackState 变化
  unwatchers.push(
    watch(
      () => player.playbackState.value,
      (state) => {
        let mediaState
        switch (state) {
          case PlaybackState.PLAYING:
            mediaState = 'playing'
            break
          case PlaybackState.PAUSED:
          case PlaybackState.IDLE:
          case PlaybackState.ENDED:
            mediaState = 'paused'
            break
          default:
            mediaState = 'none'
        }
        navigator.mediaSession.playbackState = mediaState
      },
      { immediate: true }
    )
  )

  // ===== 3. 进度位置更新（节流） =====
  // 监听 currentTime 变化，节流更新 positionState
  unwatchers.push(
    watch(
      () => player.currentTime.value,
      () => {
        const now = Date.now()
        const interval = getConfig('UI_CONFIG', 'MEDIA_POSITION_UPDATE_INTERVAL')
        if (now - lastPositionUpdate < interval) return
        lastPositionUpdate = now

        const durationValue = player.duration.value
        const position = player.currentTime.value

        if (!isFinite(durationValue) || durationValue <= 0) return
        if (!isFinite(position) || position < 0) return

        try {
          navigator.mediaSession.setPositionState({
            duration: durationValue,
            playbackRate: 1.0,
            position: Math.min(position, durationValue)
          })
        } catch {
          // 某些浏览器不支持
        }
      }
    )
  )

  // ===== 4. Action Handlers =====
  // 系统媒体控制 → 委托给 usePlayer()
  const actions = {
    play: () => player.play(),
    pause: () => player.pause(),
    previoustrack: () => player.skipPrevious(),
    nexttrack: () => player.skipNext(),
    seekforward: (details) => {
      const offset = details?.seekOffset || getConfig('UI_CONFIG', 'MEDIA_SEEK_OFFSET')
      player.seek(player.currentTime.value + offset)
    },
    seekbackward: (details) => {
      const offset = details?.seekOffset || getConfig('UI_CONFIG', 'MEDIA_SEEK_OFFSET')
      player.seek(Math.max(0, player.currentTime.value - offset))
    },
    seekto: (details) => {
      if (details?.seekTime != null) {
        player.seek(details.seekTime)
      }
    }
  }

  for (const [action, handler] of Object.entries(actions)) {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch {
      // 不支持的 action
    }
  }

  // ===== 5. Cleanup 函数 =====
  cleanupFn = () => {
    // 移除所有 watchers
    unwatchers.forEach((unwatch) => unwatch())

    // 清除 action handlers
    for (const action of Object.keys(actions)) {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      } catch {
        // 静默处理
      }
    }

    // 重置状态
    try {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    } catch {
      // 静默处理
    }

    lastPositionUpdate = 0
    cleanupFn = null
  }

  return cleanupFn
}

/**
 * 清理 Media Session（便捷方法）
 */
export function cleanupMediaSession() {
  if (cleanupFn) {
    cleanupFn()
  }
}
