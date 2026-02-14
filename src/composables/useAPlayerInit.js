/**
 * APlayer 初始化 Composable
 *
 * 提取自 App.vue onMounted 中的：
 * - APlayer 加载和初始化逻辑
 * - 视频预加载逻辑
 *
 * @module composables/useAPlayerInit
 */

import { ref } from 'vue'
import { APlayerAdapter } from '../player/adapters/APlayerAdapter.js'
import { setupMediaSession, cleanupMediaSession } from '../player/mediaSessionBridge.js'
import { getMusicIndex, saveMusicIndex } from '../utils/userSettings.js'
import { getConfig } from '../services/runtimeConfig.js'

/**
 * @param {Object} deps - 依赖注入
 * @param {Object} deps.music - useMusic() 返回值
 * @param {Object} deps.player - usePlayer() 返回值
 * @param {Object} deps.playlistManager - usePlaylistManager() 返回值
 * @param {Function} deps.onUIMouseEnter - UI 鼠标进入处理
 * @param {Function} deps.onUIMouseLeave - UI 鼠标离开处理
 * @param {Function} deps.onUITouchStart - UI 触摸开始处理
 * @param {Function} deps.onUITouchEnd - UI 触摸结束处理
 * @param {Object} deps.video - useVideo() 返回值
 */
export function useAPlayerInit(deps) {
  const {
    music,
    player,
    playlistManager,
    onUIMouseEnter,
    onUIMouseLeave,
    onUITouchStart,
    onUITouchEnd,
    video
  } = deps

  const playerAdapter = ref(null)
  const aplayerInitialized = ref(false)
  const loadTimer = ref(null)
  const playerElementRef = ref(null)
  let playerEventHandlers = []

  const { songs, loadSongs, loadFromPlaylist } = music
  const { initialize: initPlaylistManager, currentPlaylist, defaultPlaylist } = playlistManager

  /**
   * 初始化 APlayer 实例
   */
  const initAPlayer = async () => {
    // 初始化歌单管理器
    initPlaylistManager()

    // 优先使用 PlaylistManager 的当前歌单或默认歌单
    const playlistToLoad = currentPlaylist.value || defaultPlaylist.value
    if (playlistToLoad) {
      console.debug('[App] 使用 PlaylistManager 歌单:', playlistToLoad.name)
      await loadFromPlaylist(playlistToLoad)
    } else {
      console.debug('[App] 使用后备默认歌单')
      await loadSongs()
    }

    const savedMusicIndex = getMusicIndex()

    // 创建 APlayerAdapter
    playerAdapter.value = new APlayerAdapter()
    const container = document.getElementById('aplayer')

    // 初始化适配器
    await playerAdapter.value.initialize(container, {
      audio: songs.value
    })

    // 设置适配器到 usePlayer
    await player.setAdapter(playerAdapter.value)

    // 切换到保存的曲目
    if (savedMusicIndex > 0 && savedMusicIndex < songs.value.length) {
      await player.switchTrack(savedMusicIndex)
    }

    // 监听曲目切换保存索引
    playerAdapter.value.on('trackchange', (e) => {
      saveMusicIndex(e.index)
    })

    // 设置播放器样式
    const playerElement = document.getElementById('aplayer')
    if (playerElement) {
      playerElementRef.value = playerElement
      playerElement.style.transition = 'opacity 0.3s ease'
      playerElement.style.opacity = '1'
      playerElement.style.pointerEvents = 'auto'

      const handlers = [
        { event: 'mouseenter', handler: onUIMouseEnter },
        { event: 'mouseleave', handler: onUIMouseLeave },
        { event: 'touchstart', handler: onUITouchStart },
        { event: 'touchend', handler: onUITouchEnd }
      ]

      handlers.forEach(({ event, handler }) => {
        playerElement.addEventListener(event, handler)
      })

      playerEventHandlers = handlers
    }
    aplayerInitialized.value = true

    // 初始化 Media Session
    setupMediaSession(player)
  }

  /**
   * 延迟加载 APlayer 并预加载视频
   */
  const startLoading = () => {
    // 预加载视频
    video.preloadAllVideos().catch((err) => {
      console.error('视频预加载失败:', err)
    })

    // 延迟加载 APlayer
    loadTimer.value = setTimeout(
      () => {
        initAPlayer().catch((error) => {
          console.error('初始化 APlayer 失败:', error)
        })
      },
      getConfig('UI_CONFIG', 'APLAYER_LOAD_DELAY')
    )
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    if (loadTimer.value) {
      clearTimeout(loadTimer.value)
      loadTimer.value = null
    }

    if (playerElementRef.value && playerEventHandlers.length > 0) {
      playerEventHandlers.forEach(({ event, handler }) => {
        playerElementRef.value.removeEventListener(event, handler)
      })
      playerEventHandlers = []
      playerElementRef.value = null
    }

    if (playerAdapter.value) {
      cleanupMediaSession()
      player.destroy()
      playerAdapter.value = null
    }
  }

  return {
    playerAdapter,
    aplayerInitialized,
    startLoading,
    cleanup
  }
}
