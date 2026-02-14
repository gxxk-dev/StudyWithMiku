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
        disablepictureinpicture
        @loadeddata="onVideoLoaded"
      ></video>
    </transition>
    <div class="overlay"></div>

    <!-- 顶部状态胶囊 -->
    <StatusPill
      :show-controls="showControls"
      :modal-open="settingsModalOpen || focusSummaryModalOpen"
      @open-settings="openSettingsModal"
      @open-focus-summary="openFocusSummaryModal"
      @mouseenter="onUIMouseEnter"
      @mouseleave="onUIMouseLeave"
    />

    <div class="content" :class="{ hidden: !showControls }">
      <h1 class="title">Study with Miku</h1>
      <p class="subtitle">Love by SHSHOUSE / Fork by gxxk-dev</p>
    </div>
    <button
      class="switch-video-btn"
      :class="{ hidden: !showControls }"
      @click="switchVideo"
      @mouseenter="onUIMouseEnter"
      @mouseleave="onUIMouseLeave"
      @touchstart="onUITouchStart"
      @touchend="onUITouchEnd"
    >
      切换
    </button>

    <button
      class="fullscreen-btn"
      :class="{ hidden: !showControls }"
      @click="toggleFullscreen"
      @mouseenter="onUIMouseEnter"
      @mouseleave="onUIMouseLeave"
      @touchstart="onUITouchStart"
      @touchend="onUITouchEnd"
    >
      {{ isFullscreen ? '退出全屏' : '全屏' }}
    </button>

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

    <!-- Toast 通知 -->
    <Toast
      :notifications="notifications"
      :paused="toastPaused"
      @remove="removeNotification"
      @action="handleAction"
    />

    <!-- 横屏提示 -->
    <OrientationPrompt ref="orientationPromptRef" />

    <!-- 设置面板 -->
    <SettingsModal
      ref="settingsModalRef"
      :is-open="settingsModalOpen"
      @close="closeSettingsModal"
      @request-merge="onRequestMerge"
    />

    <!-- 专注概览面板 -->
    <FocusSummaryModal :is-open="focusSummaryModalOpen" @close="closeFocusSummaryModal" />

    <!-- 账号合并确认对话框 -->
    <MergeConfirmDialog
      :visible="showMergeDialog"
      :merge-token="pendingMergeToken"
      :merge-type="pendingMergeType"
      :source-has-data="pendingMergeHasData"
      @close="showMergeDialog = false"
      @merged="onMergeComplete"
    />
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent, onMounted, onUnmounted, watch, computed } from 'vue'
import { useFullscreen } from '@vueuse/core'
import { useVideo } from './composables/useVideo.js'
import { useMusic } from './composables/useMusic.js'
import { usePlayer } from './composables/usePlayer.js'
import { usePWA } from './composables/usePWA.js'
import { setSwUpdateCallback } from './utils/swCallback.js'
import { useUrlParams } from './composables/useUrlParams.js'
import { useToast } from './composables/useToast.js'
import { useFocus } from './composables/useFocus.js'
import {
  useClipboardDetection,
  setupClipboardDetection,
  cleanupClipboardDetection
} from './composables/useClipboardDetection.js'
import { onlineServer } from './services/onlineServer.js'
import { usePlaylistManager } from './composables/usePlaylistManager.js'
import { useAuth } from './composables/useAuth.js'
import { useUIInteraction } from './composables/useUIInteraction.js'
import { useAppBootstrap } from './composables/useAppBootstrap.js'
import { useUrlParamsApply } from './composables/useUrlParamsApply.js'
import { useAPlayerInit } from './composables/useAPlayerInit.js'
import { cleanupMediaSession } from './player/mediaSessionBridge.js'
import SpotifyPlayer from './components/SpotifyPlayer.vue'
import OrientationPrompt from './components/OrientationPrompt.vue'
import Toast from './components/Toast.vue'
import StatusPill from './components/StatusPill.vue'

// 重型组件懒加载
const SettingsModal = defineAsyncComponent(() => import('./components/SettingsModal.vue'))
const FocusSummaryModal = defineAsyncComponent(() => import('./components/FocusSummaryModal.vue'))
const MergeConfirmDialog = defineAsyncComponent(
  () => import('./components/settings/MergeConfirmDialog.vue')
)

// 加载开发者控制台 (swm_dev)
import './dev/index.js'

const ERUDA_SWITCH_STYLE_ID = 'eruda-hide-switch-style'

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const settingsModalOpen = ref(false)
const focusSummaryModalOpen = ref(false)
const settingsModalRef = ref(null)
const orientationPromptRef = ref(null)
const showMergeDialog = ref(false)
const pendingMergeToken = ref(null)
const pendingMergeType = ref(null)
const pendingMergeHasData = ref(false)

const openSettingsModal = () => {
  settingsModalOpen.value = true
}

const closeSettingsModal = () => {
  settingsModalOpen.value = false
}

const openFocusSummaryModal = () => {
  focusSummaryModalOpen.value = true
}

const closeFocusSummaryModal = () => {
  focusSummaryModalOpen.value = false
}

const onRequestMerge = ({ mergeToken, mergeType, hasData }) => {
  pendingMergeToken.value = mergeToken
  pendingMergeType.value = mergeType
  pendingMergeHasData.value = hasData
  showMergeDialog.value = true
}

const onMergeComplete = () => {
  showMergeDialog.value = false
  pendingMergeToken.value = null
  pendingMergeType.value = null
  pendingMergeHasData.value = false
  showToast('success', '账号合并成功')
}

// Toast 状态
const {
  notifications,
  paused: toastPaused,
  showToast,
  showConfirm,
  removeNotification,
  handleAction,
  pauseTimers,
  resumeTimers
} = useToast()

// Focus 状态
const { updateSettings: updateFocusSettings, start: startFocus } = useFocus()

// 剪贴板检测
const { checkClipboard } = useClipboardDetection()

// URL 参数处理
const { urlConfig, hasUrlParams, validationWarnings } = useUrlParams()

// UI 交互
const {
  showControls,
  setModalCheckFn,
  onMouseMove,
  onMouseLeave,
  onUIMouseEnter,
  onUIMouseLeave,
  onUITouchStart,
  onUITouchEnd
} = useUIInteraction()

setModalCheckFn(() => settingsModalOpen.value || focusSummaryModalOpen.value)

// 监听横屏提示显示状态，控制 Toast 计时器暂停/恢复
const isOrientationPromptVisible = computed(() => orientationPromptRef.value?.showPrompt ?? false)

watch(isOrientationPromptVisible, (visible) => {
  if (visible) {
    pauseTimers()
  } else {
    resumeTimers()
  }
})

// 视频管理
const { currentVideo, switchVideo, preloadAllVideos } = useVideo()

const hideErudaSwitch = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById(ERUDA_SWITCH_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = ERUDA_SWITCH_STYLE_ID
  style.textContent = '.eruda-entry-btn{display:none !important;}'
  document.head.appendChild(style)
}

const erudaInitialized = ref(false)

// 音乐相关
const {
  songs,
  isSpotify,
  spotifyPlaylistId,
  platform,
  applyUrlPlaylist,
  loadFromPlaylist,
  loadSongs
} = useMusic()
const player = usePlayer()
const pwa = usePWA()
const playlistManager = usePlaylistManager()

// APlayer 初始化
const {
  playerAdapter,
  aplayerInitialized,
  startLoading: startAPlayerLoading,
  cleanup: cleanupAPlayer
} = useAPlayerInit({
  music: { songs, loadSongs, loadFromPlaylist },
  player,
  playlistManager,
  onUIMouseEnter,
  onUIMouseLeave,
  onUITouchStart,
  onUITouchEnd,
  video: { preloadAllVideos }
})

const onVideoLoaded = () => {
  console.debug('视频加载完成')
}

// 监听 showControls 控制 APlayer 显示
const stopShowControlsWatch = watch(showControls, (newValue) => {
  if (playerAdapter.value && aplayerInitialized.value && !isSpotify.value) {
    const playerElement = document.getElementById('aplayer')
    if (!playerElement) return

    if (newValue) {
      playerElement.style.opacity = '1'
      playerElement.style.pointerEvents = 'auto'
    } else {
      playerElement.style.opacity = '0'
      playerElement.style.pointerEvents = 'none'
    }
  }
})

// 监听平台切换，清理旧播放器的 Media Session
const stopPlatformWatch = watch(
  () => platform.value,
  (newPlatform, oldPlatform) => {
    if (oldPlatform !== newPlatform) {
      cleanupMediaSession()
    }
  }
)

// 监听歌曲列表变化，更新 APlayer
const stopSongsWatch = watch(
  () => songs.value,
  async (newSongs) => {
    console.debug('[App] songs 变化, 数量:', newSongs?.length, 'isSpotify:', isSpotify.value)
    if (!isSpotify.value && playerAdapter.value && aplayerInitialized.value) {
      console.debug('[App] 更新 APlayer 播放列表')
      await playerAdapter.value.loadPlaylist(newSongs)
    }
  },
  { deep: true }
)

// App 启动引导
const { bootstrap } = useAppBootstrap({
  showToast,
  showConfirm,
  auth: useAuth(),
  onlineServer,
  pwa,
  setSwUpdateCallback,
  settingsModalOpen,
  settingsModalRef,
  showMergeDialog,
  pendingMergeToken,
  pendingMergeType,
  pendingMergeHasData
})

// URL 参数应用
const { applyUrlParams } = useUrlParamsApply({
  showToast,
  showConfirm,
  updateFocusSettings,
  startFocus,
  applyUrlPlaylist,
  urlConfig,
  hasUrlParams,
  validationWarnings
})

onMounted(async () => {
  // 启动引导（OAuth + 在线连接 + PWA 更新）
  await bootstrap()

  // 应用 URL 参数
  applyUrlParams()

  // 初始化 Eruda
  if (window.eruda && !erudaInitialized.value) {
    window.eruda.init()
    erudaInitialized.value = true
    hideErudaSwitch()
  }

  // 加载 APlayer + 预加载视频
  startAPlayerLoading()

  // 剪贴板检测
  setupClipboardDetection({
    checkClipboard,
    showToast,
    showConfirm,
    applyUrlPlaylist,
    updateFocusSettings,
    startFocus
  })
})

onUnmounted(() => {
  onlineServer.disconnect()
  cleanupClipboardDetection()

  if (stopShowControlsWatch) {
    stopShowControlsWatch()
  }

  if (stopPlatformWatch) {
    stopPlatformWatch()
  }

  if (stopSongsWatch) {
    stopSongsWatch()
  }

  cleanupAPlayer()
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
  white-space: nowrap;
}

.subtitle {
  font-size: 1.1rem;
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
