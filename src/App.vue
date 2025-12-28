<template>
  <div class="app-container" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <transition name="fade-slow" mode="out-in">
      <video 
        :key="currentVideo"
        ref="videoRef" 
        class="video-background" 
        :src="currentVideo" 
        autoplay 
        muted 
        loop
        playsinline
        webkit-playsinline
        @loadeddata="onVideoLoaded"
      ></video>
    </transition>
    <div class="overlay"></div>
    <div class="content" :class="{ hidden: !showControls }">
      <h1 class="title" @click="onTitleClick">Study with Miku</h1>
      <p class="subtitle">Love by SHSHOUSE / Fork by gxxk-dev</p>
    </div>
    <button class="switch-video-btn" @click="switchVideo" :class="{ hidden: !showControls }" @mouseenter="onUIMouseEnter" @mouseleave="onUIMouseLeave" @touchstart="onUITouchStart" @touchend="onUITouchEnd">
      切换
    </button>
    
    <button class="fullscreen-btn" @click="toggleFullscreen" :class="{ hidden: !showControls }" @mouseenter="onUIMouseEnter" @mouseleave="onUIMouseLeave" @touchstart="onUITouchStart" @touchend="onUITouchEnd">
      {{ isFullscreen ? '退出全屏' : '全屏' }}
    </button>
    
    <!-- 番茄钟！＞﹏＜ -->
    <PomodoroTimer />

    <!-- APlayer 播放器 (网易云/QQ音乐) -->
    <div v-show="!isSpotify" id="aplayer" class="aplayer-container"></div>

    <!-- Spotify 嵌入播放器 -->
    <SpotifyPlayer
      v-if="isSpotify"
      :playlist-id="spotifyPlaylistId"
      :visible="showControls"
      @mouseenter="onUIMouseEnter"
      @mouseleave="onUIMouseLeave"
      @touchstart="onUITouchStart"
      @touchend="onUITouchEnd"
    />

    <!-- PWA 功能面板 -->
    <PWAPanel
      :visible="showControls"
      @mouseenter="onUIMouseEnter"
      @mouseleave="onUIMouseLeave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useFullscreen } from '@vueuse/core'
import APlayer from 'aplayer'
import { preloadVideos } from './utils/cache.js'
import { setAPlayerInstance, setHoveringUI, isHoveringUI } from './utils/eventBus.js'
import { useMusic } from './composables/useMusic.js'
import { usePWA } from './composables/usePWA.js'
import { setSwUpdateCallback } from './utils/swCallback.js'
import { getVideoIndex, saveVideoIndex, getMusicIndex, saveMusicIndex } from './utils/userSettings.js'
import PomodoroTimer from './components/PomodoroTimer.vue'
import SpotifyPlayer from './components/SpotifyPlayer.vue'
import PWAPanel from './components/PWAPanel.vue'

const VCONSOLE_SWITCH_STYLE_ID = 'vconsole-hide-switch-style'

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const showControls = ref(true)
const inactivityTimer = ref(null)
const vConsoleInstance = ref(null)

const startHideTimer = () => {
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
  }
  inactivityTimer.value = setTimeout(() => {
    if (!isHoveringUI.value) {
      showControls.value = false
      document.body.style.cursor = 'none'
    }
  }, 3000)
}

const onMouseMove = () => {
  showControls.value = true
  document.body.style.cursor = 'default'
  startHideTimer()
}

const onMouseLeave = () => {
  if (!isHoveringUI.value) {
    showControls.value = false
    document.body.style.cursor = 'none'
  }
}

const onUIMouseEnter = () => {
  isHoveringUI.value = true
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
  }
}

const onUIMouseLeave = () => {
  isHoveringUI.value = false
  startHideTimer()
}

const onUITouchStart = () => {
  isHoveringUI.value = true
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
  }
}

const onUITouchEnd = () => {
  isHoveringUI.value = false
  startHideTimer()
}

const VIDEO_BASE_URL = 'https://assets.frez79.io/swm/bg-video'

const videos = [
      `${VIDEO_BASE_URL}/1.mp4`,
      `${VIDEO_BASE_URL}/2.mp4`,
      `${VIDEO_BASE_URL}/3.mp4`
]

const savedVideoIndex = getVideoIndex()
const currentVideoIndex = ref(savedVideoIndex < videos.length ? savedVideoIndex : 0)
const currentVideo = ref(videos[currentVideoIndex.value])

const switchVideo = () => {
  currentVideoIndex.value = (currentVideoIndex.value + 1) % videos.length
  currentVideo.value = videos[currentVideoIndex.value]
  saveVideoIndex(currentVideoIndex.value)
}

const hideVConsoleSwitch = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById(VCONSOLE_SWITCH_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = VCONSOLE_SWITCH_STYLE_ID
  style.textContent = '.vc-switch{display:none !important;}'
  document.head.appendChild(style)
}

const onTitleClick = () => {
  if (vConsoleInstance.value && typeof vConsoleInstance.value.show === 'function') {
    vConsoleInstance.value.show()
  }
}

const aplayer = ref(null)
const aplayerInitialized = ref(false)
const AUTOPLAY_UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart']
// 事件监听器数组（不需要响应式）
let autoplayUnlockListeners = []
const { songs, loadSongs, loading, isSpotify, spotifyPlaylistId } = useMusic()
const { setHasUpdate } = usePWA()

// 存储 playerElement 引用，确保添加和移除监听器时使用同一个元素
const playerElementRef = ref(null)
// 使用数组统一管理 playerElement 事件监听器
let playerEventHandlers = []

const onVideoLoaded = () => {
  console.log('视频加载完成')
}

const removeAutoplayUnlockListeners = () => {
  autoplayUnlockListeners.forEach(({ event, handler }) => {
    document.removeEventListener(event, handler)
  })
  autoplayUnlockListeners = []
}

const setupAutoplayUnlockListeners = () => {
  removeAutoplayUnlockListeners()
  const unlock = () => {
    removeAutoplayUnlockListeners()
    if (!aplayer.value) return
    const retryPromise = aplayer.value.play()
    if (retryPromise && typeof retryPromise.catch === 'function') {
      retryPromise.catch((error) => {
        console.warn('APlayer play retry failed:', error)
      })
    }
  }
  AUTOPLAY_UNLOCK_EVENTS.forEach((event) => {
    const handler = () => unlock()
    autoplayUnlockListeners.push({ event, handler })
    document.addEventListener(event, handler, { once: true })
  })
}

const attemptAPlayerAutoplay = () => {
  if (!aplayer.value) return
  const playPromise = aplayer.value.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((error) => {
      if (error?.name === 'NotAllowedError' || /play\(\) failed/i.test(error?.message || '')) {
        setupAutoplayUnlockListeners()
      } else {
        console.warn('APlayer play failed:', error)
      }
    })
  }
}

// M-1 修复: 监听显示/隐藏状态变化，保存停止函数以便在组件卸载时清理
const stopShowControlsWatch = watch(showControls, (newValue) => {
  // 只在非 Spotify 模式下控制 APlayer 显示
  if (aplayer.value && aplayerInitialized.value && !isSpotify.value) {
    const playerElement = document.getElementById('aplayer')
    if (!playerElement) return

    if (newValue) {
      // 显示播放器
      playerElement.style.opacity = '1'
      playerElement.style.pointerEvents = 'auto'
    } else {
      // 隐藏播放器
      playerElement.style.opacity = '0'
      playerElement.style.pointerEvents = 'none'
    }
  }
})

// H-3 修复: 存储 setTimeout 定时器引用以便清理
const loadTimer = ref(null)

onMounted(() => {
  // 连接 PWA Service Worker 更新回调
  setSwUpdateCallback(() => {
    console.log('检测到新版本可用')
    setHasUpdate(true)
  })

  // 初始化 vConsole
  if (window.VConsole && !vConsoleInstance.value) {
    vConsoleInstance.value = new window.VConsole()
    hideVConsoleSwitch()
  }

  const preloadAllVideos = async () => {
    try {
      await preloadVideos(videos)
      console.log('所有视频预加载完成')
    } catch (error) {
      console.error('视频预加载失败:', error)
    }
  }
  const loadAPlayer = async () => {
    try {
      await initAPlayer()
    } catch (error) {
      console.error('初始化 APlayer 失败:', error)
    }
  }

  const initAPlayer = async () => {
    await loadSongs()

    const savedMusicIndex = getMusicIndex()
    aplayer.value = new APlayer({
      container: document.getElementById('aplayer'),
      fixed: true,
      autoplay: false,
      audio: songs.value,
      lrcType: 0,
      theme: '#2980b9',
      loop: 'all',
      order: 'list',
      preload: 'auto',
      volume: 0.7,
      mutex: true,
      listFolded: false,
      listMaxHeight: '200px',
      width: '300px'
    })

    if (savedMusicIndex > 0 && savedMusicIndex < songs.value.length) {
      aplayer.value.list.switch(savedMusicIndex)
    }

    aplayer.value.on('listswitch', (e) => {
      saveMusicIndex(e.index)
    })

    // 设置播放器样式
    const playerElement = document.getElementById('aplayer')
    if (playerElement) {
      // 存储元素引用，确保在 onUnmounted 中使用同一个引用
      playerElementRef.value = playerElement
      playerElement.style.transition = 'opacity 0.3s ease'
      playerElement.style.opacity = '1'
      playerElement.style.pointerEvents = 'auto'

      // H-2 修复: 统一管理事件监听器，确保完全清理
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
    setAPlayerInstance(aplayer.value)
    attemptAPlayerAutoplay()
  }
  preloadAllVideos().catch(err => {
    console.error('视频预加载失败:', err)
  })
  // H-3 修复: 保存定时器引用以便在组件卸载时清理
  loadTimer.value = setTimeout(() => {
    loadAPlayer()
  }, 500)
})

onUnmounted(() => {
  // H-3 修复: 清理 setTimeout 定时器
  if (loadTimer.value) {
    clearTimeout(loadTimer.value)
    loadTimer.value = null
  }

  // M-1 修复: 停止 watch 监听
  if (stopShowControlsWatch) {
    stopShowControlsWatch()
  }

  // H-2 修复: 使用统一管理的事件监听器数组进行清理
  if (playerElementRef.value && playerEventHandlers.length > 0) {
    playerEventHandlers.forEach(({ event, handler }) => {
      playerElementRef.value.removeEventListener(event, handler)
    })
    playerEventHandlers = []
    playerElementRef.value = null
  }

  if (aplayer.value) {
    aplayer.value.destroy()
  }
  removeAutoplayUnlockListeners()
})
</script>

<style scoped>
.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 3;
  transition: opacity 0.3s ease;
}

.content.hidden {
  opacity: 0;
  pointer-events: none;
}

.title {
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.subtitle {
  font-size: 1.2rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.switch-video-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.switch-video-btn.hidden {
  opacity: 0;
  pointer-events: none;
}

.fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.fullscreen-btn.hidden {
  opacity: 0;
  pointer-events: none;
}

.aplayer-wrapper {
  position: relative;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.aplayer-container.hidden {
  opacity: 0;
  pointer-events: none;
}

.aplayer-wrapper.hidden :deep(.aplayer) {
  pointer-events: none;
}

.aplayer-container {
  width: 100%;
}

.album-selector {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.album-selector.hidden {
  opacity: 0;
  pointer-events: none;
}

.album-selector select {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 12px;
  border-radius: 5px;
  font-size: 14px;
}

.album-selector select option {
  background: #333;
  color: white;
}
</style>
