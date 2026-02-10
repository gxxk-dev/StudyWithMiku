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
    />

    <!-- 专注概览面板 -->
    <FocusSummaryModal :is-open="focusSummaryModalOpen" @close="closeFocusSummaryModal" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useFullscreen } from '@vueuse/core'
import { useVideo } from './composables/useVideo.js'
import { isHoveringUI } from './utils/uiState.js'
import { useMusic } from './composables/useMusic.js'
import { usePlayer } from './composables/usePlayer.js'
import { usePWA } from './composables/usePWA.js'
import { setSwUpdateCallback } from './utils/swCallback.js'
import { getMusicIndex, saveMusicIndex } from './utils/userSettings.js'
import { APlayerAdapter } from './player/adapters/APlayerAdapter.js'
import { setupMediaSession, cleanupMediaSession } from './player/mediaSessionBridge.js'
import { useUrlParams } from './composables/useUrlParams.js'
import { useToast } from './composables/useToast.js'
import { useFocus } from './composables/useFocus.js'
import { useClipboardDetection } from './composables/useClipboardDetection.js'
import { FOCUS_STORAGE_KEYS } from './composables/focus/constants.js'
import { safeLocalStorageGetJSON } from './utils/storage.js'
import { onlineServer } from './services/onlineServer.js'
import { getConfig } from './services/runtimeConfig.js'
import { usePlaylistManager } from './composables/usePlaylistManager.js'
import { useAuth } from './composables/useAuth.js'
import SpotifyPlayer from './components/SpotifyPlayer.vue'
import OrientationPrompt from './components/OrientationPrompt.vue'
import Toast from './components/Toast.vue'
import StatusPill from './components/StatusPill.vue'
import SettingsModal from './components/SettingsModal.vue'
import FocusSummaryModal from './components/FocusSummaryModal.vue'

// 加载开发者控制台 (swm_dev)
import './dev/index.js'

const ERUDA_SWITCH_STYLE_ID = 'eruda-hide-switch-style'

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const showControls = ref(true)
const inactivityTimer = ref(null)
const erudaInitialized = ref(false)
const settingsModalOpen = ref(false)
const focusSummaryModalOpen = ref(false)
const settingsModalRef = ref(null)
const orientationPromptRef = ref(null)

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

// === URL 参数处理（必须在组件初始化之前执行）===
const { urlConfig, hasUrlParams, validationWarnings } = useUrlParams()

const isAnyModalOpen = () => settingsModalOpen.value || focusSummaryModalOpen.value

// 监听横屏提示显示状态，控制 Toast 计时器暂停/恢复
const isOrientationPromptVisible = computed(() => orientationPromptRef.value?.showPrompt ?? false)

watch(isOrientationPromptVisible, (visible) => {
  if (visible) {
    pauseTimers()
  } else {
    resumeTimers()
  }
})

const startHideTimer = () => {
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
  }
  inactivityTimer.value = setTimeout(
    () => {
      if (!isHoveringUI.value && !isAnyModalOpen()) {
        showControls.value = false
        document.body.style.cursor = 'none'
      }
    },
    getConfig('UI_CONFIG', 'INACTIVITY_HIDE_DELAY')
  )
}

const onMouseMove = () => {
  showControls.value = true
  document.body.style.cursor = 'default'
  startHideTimer()
}

const onMouseLeave = () => {
  if (!isHoveringUI.value && !isAnyModalOpen()) {
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

const playerAdapter = ref(null)
const aplayerInitialized = ref(false)
const {
  songs,
  loadSongs,
  isSpotify,
  spotifyPlaylistId,
  platform,
  applyUrlPlaylist,
  loadFromPlaylist
} = useMusic()
const player = usePlayer()
const { setHasUpdate, refreshApp } = usePWA()
const { initialize: initPlaylistManager, currentPlaylist, defaultPlaylist } = usePlaylistManager()

// 存储 playerElement 引用，确保添加和移除监听器时使用同一个元素
const playerElementRef = ref(null)
// 使用数组统一管理 playerElement 事件监听器
let playerEventHandlers = []

const onVideoLoaded = () => {
  console.debug('视频加载完成')
}

const stopShowControlsWatch = watch(showControls, (newValue) => {
  // 只在非 Spotify 模式下控制 APlayer 显示
  if (playerAdapter.value && aplayerInitialized.value && !isSpotify.value) {
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

// 监听平台切换，清理旧播放器的 Media Session
watch(
  () => platform.value,
  (newPlatform, oldPlatform) => {
    if (oldPlatform !== newPlatform) {
      cleanupMediaSession()
    }
  }
)

// 监听歌曲列表变化，更新 APlayer
watch(
  () => songs.value,
  async (newSongs) => {
    console.debug('[App] songs 变化, 数量:', newSongs?.length, 'isSpotify:', isSpotify.value)
    // 只在非 Spotify 模式且 APlayer 已初始化时更新
    if (!isSpotify.value && playerAdapter.value && aplayerInitialized.value) {
      console.debug('[App] 更新 APlayer 播放列表')
      await playerAdapter.value.loadPlaylist(newSongs)
    }
  },
  { deep: true }
)

const loadTimer = ref(null)

onMounted(async () => {
  // 处理 OAuth 回调
  const { handleOAuthCallback, initialize: initAuth } = useAuth()
  try {
    const oauthResult = await handleOAuthCallback()
    if (oauthResult) {
      console.log('OAuth 登录成功:', oauthResult.username || oauthResult.displayName)
      showToast(`欢迎，${oauthResult.displayName || oauthResult.username}！`, 'success')
    }
  } catch (err) {
    console.error('OAuth 回调处理失败:', err)
    showToast(err.message || 'OAuth 登录失败', 'error')
  }

  // 初始化认证状态
  initAuth()

  // 连接在线计数服务器
  onlineServer.connect()

  // 连接 PWA Service Worker 更新回调
  setSwUpdateCallback(() => {
    console.log('检测到新版本可用')
    setHasUpdate(true)
    showConfirm('发现新版本', '应用有更新可用', {
      confirmText: '立即更新',
      cancelText: '稍后',
      onConfirm: () => refreshApp(true),
      extraActions: [
        {
          label: '查看更新',
          style: 'secondary',
          callback: () => {
            settingsModalOpen.value = true
            // 等待模态框打开后切换到 changelog tab
            setTimeout(() => {
              settingsModalRef.value?.setActiveTab('changelog')
            }, 50)
          }
        }
      ]
    })
  })

  // === URL 参数处理（Toast 显示和歌单处理）===
  if (hasUrlParams.value) {
    const config = urlConfig.value

    // 1. 构建配置摘要
    const parts = []
    if (config.playlist) {
      const platformLabels = {
        netease: '网易云',
        tencent: 'QQ音乐',
        spotify: 'Spotify'
      }
      parts.push(`歌单：${platformLabels[config.playlist.platform]} ${config.playlist.id}`)
    }
    if (config.focus) {
      const focusParts = []
      if (config.focus.focusDuration) {
        focusParts.push(`专注 ${config.focus.focusDuration / 60} 分钟`)
      }
      if (config.focus.shortBreakDuration) {
        focusParts.push(`短休息 ${config.focus.shortBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakDuration) {
        focusParts.push(`长休息 ${config.focus.longBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakInterval) {
        focusParts.push(`间隔 ${config.focus.longBreakInterval} 次`)
      }
      if (focusParts.length > 0) {
        parts.push(focusParts.join('、'))
      }
    }
    if (config.autostart) {
      parts.push('自动启动')
    }
    if (config.save) {
      parts.push('保存配置')
    }

    const summary = parts.join('，')
    const hasValidConfig = summary.length > 0
    const hasWarnings = validationWarnings.value.length > 0

    // 2. 显示配置提示（有效配置）
    if (hasValidConfig) {
      showToast(
        'info',
        '已应用自定义配置',
        summary,
        getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
      )
    }

    // 3. 显示验证警告（自动排队）
    if (hasWarnings) {
      const warningMessage = validationWarnings.value.join('；')
      showToast(
        'error',
        '部分参数无效',
        warningMessage,
        getConfig('UI_CONFIG', 'TOAST_ERROR_DURATION')
      )
    }

    // 4. 应用歌单配置（延迟 1 秒，异步执行）
    if (config.playlist) {
      setTimeout(
        async () => {
          try {
            const playlistConfig = `${config.playlist.platform}:${config.playlist.id}`
            const success = await applyUrlPlaylist(playlistConfig)
            if (!success) {
              showToast(
                'error',
                '歌单加载失败',
                '将使用默认歌单',
                getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
              )
            }
          } catch (error) {
            console.error('[App] 应用歌单失败:', error)
            showToast(
              'error',
              '歌单加载失败',
              '将使用默认歌单',
              getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
            )
          }
        },
        getConfig('UI_CONFIG', 'PLAYLIST_APPLY_DELAY')
      )
    }

    // 5. 应用专注配置
    if (config.focus || config.autostart) {
      setTimeout(
        () => {
          // 检查用户是否有非默认配置
          const savedSettings = safeLocalStorageGetJSON(FOCUS_STORAGE_KEYS.SETTINGS, null)
          const hasCustomSettings = savedSettings !== null

          /**
           * 应用专注配置并可选启动
           * @param {boolean} saveToLocal - 是否保存到本地
           */
          const applyFocusConfig = (saveToLocal) => {
            // 构建新设置（合并 URL 参数配置）
            if (config.focus) {
              const newSettings = { ...config.focus }
              if (saveToLocal) {
                // 保存到本地：合并到现有设置
                updateFocusSettings(newSettings)
                console.debug('[App] 专注配置已保存:', newSettings)
              } else {
                // 临时应用：只更新当前会话（不持久化）
                // 通过 updateSettings 临时更新，但不调用 save
                updateFocusSettings(newSettings)
                console.debug('[App] 专注配置已临时应用:', newSettings)
              }
            }

            // 自动启动专注
            if (config.autostart) {
              startFocus()
              showToast(
                'success',
                '专注已启动',
                '',
                getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
              )
              console.debug('[App] 专注已自动启动')
            }
          }

          // 决定是否需要确认
          if (config.save && hasCustomSettings) {
            // 用户有自定义配置且请求保存，需要确认
            showConfirm('覆盖现有配置？', '检测到您有自定义的专注设置，是否用 URL 参数覆盖？', {
              confirmText: '覆盖',
              cancelText: '仅本次',
              onConfirm: () => {
                applyFocusConfig(true)
                showToast(
                  'success',
                  '配置已保存',
                  '',
                  getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
                )
              },
              onCancel: () => {
                applyFocusConfig(false)
              }
            })
          } else if (config.save) {
            // 用户没有自定义配置，直接保存
            applyFocusConfig(true)
          } else {
            // 不保存，仅临时应用
            applyFocusConfig(false)
          }
        },
        getConfig('UI_CONFIG', 'PLAYLIST_APPLY_DELAY')
      )
    }
  }
  // === URL 参数处理结束 ===

  // 初始化 Eruda
  if (window.eruda && !erudaInitialized.value) {
    window.eruda.init()
    erudaInitialized.value = true
    hideErudaSwitch()
  }

  const loadAPlayer = async () => {
    try {
      await initAPlayer()
    } catch (error) {
      console.error('初始化 APlayer 失败:', error)
    }
  }

  const initAPlayer = async () => {
    // 初始化歌单管理器（如果歌单列表为空会自动创建内置默认歌单）
    initPlaylistManager()

    // 优先使用 PlaylistManager 的当前歌单或默认歌单
    const playlistToLoad = currentPlaylist.value || defaultPlaylist.value
    if (playlistToLoad) {
      console.debug('[App] 使用 PlaylistManager 歌单:', playlistToLoad.name)
      await loadFromPlaylist(playlistToLoad)
    } else {
      // 后备：使用旧的 loadSongs 逻辑（基于 DEFAULT_PLAYLIST_ID）
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
      // 存储元素引用，确保在 onUnmounted 中使用同一个引用
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

    // 初始化 Media Session（使用新的桥接）
    setupMediaSession(player)
  }
  preloadAllVideos().catch((err) => {
    console.error('视频预加载失败:', err)
  })

  loadTimer.value = setTimeout(
    () => {
      loadAPlayer()
    },
    getConfig('UI_CONFIG', 'APLAYER_LOAD_DELAY')
  )

  // === 剪贴板检测 ===
  const platformLabels = {
    netease: '网易云',
    tencent: 'QQ音乐',
    spotify: 'Spotify'
  }

  /**
   * 处理检测到的剪贴板歌单
   * @param {{platform: string, playlistId: string}} detected - 检测结果
   */
  const handleClipboardPlaylist = async (detected) => {
    const platformLabel = platformLabels[detected.platform] || detected.platform

    showConfirm('检测到歌单链接', `是否切换到 ${platformLabel} 歌单？`, {
      confirmText: '切换',
      cancelText: '取消',
      onConfirm: async () => {
        const playlistConfig = `${detected.platform}:${detected.playlistId}`
        const success = await applyUrlPlaylist(playlistConfig)

        if (success) {
          showToast(
            'success',
            '歌单已切换',
            platformLabel,
            getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
          )
        } else {
          showToast(
            'error',
            '歌单加载失败',
            '请检查链接是否正确',
            getConfig('UI_CONFIG', 'TOAST_ERROR_DURATION')
          )
        }
      }
    })
  }

  /**
   * 处理检测到的应用 URL（带专注配置）
   * @param {{config: Object, warnings: string[]}} detected - 检测结果
   */
  const handleClipboardAppUrl = async (detected) => {
    const { config, warnings } = detected

    // 构建配置摘要
    const summaryParts = []

    // 专注时长配置
    if (config.focus) {
      const focusParts = []
      if (config.focus.focusDuration) {
        focusParts.push(`专注 ${config.focus.focusDuration / 60} 分钟`)
      }
      if (config.focus.shortBreakDuration !== undefined) {
        focusParts.push(`短休息 ${config.focus.shortBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakDuration !== undefined) {
        focusParts.push(`长休息 ${config.focus.longBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakInterval) {
        focusParts.push(`间隔 ${config.focus.longBreakInterval} 次`)
      }
      if (focusParts.length > 0) {
        summaryParts.push(focusParts.join('、'))
      }
    }

    // 歌单配置
    if (config.playlist) {
      const platformLabel = platformLabels[config.playlist.platform] || config.playlist.platform
      summaryParts.push(`歌单：${platformLabel}`)
    }

    // 自动启动
    if (config.autostart) {
      summaryParts.push('自动启动专注')
    }

    const summary = summaryParts.join('\n')

    // 显示确认对话框
    showConfirm('检测到专注配置', summary || '应用分享的配置？', {
      confirmText: '应用并开始',
      cancelText: '取消',
      onConfirm: async () => {
        // 显示警告（如有）
        if (warnings && warnings.length > 0) {
          showToast(
            'warning',
            '部分参数无效',
            warnings.join('；'),
            getConfig('UI_CONFIG', 'TOAST_ERROR_DURATION')
          )
        }

        // 应用歌单配置
        if (config.playlist) {
          const playlistConfig = `${config.playlist.platform}:${config.playlist.id}`
          const success = await applyUrlPlaylist(playlistConfig)
          if (!success) {
            showToast(
              'error',
              '歌单加载失败',
              '将使用当前歌单',
              getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
            )
          }
        }

        // 应用专注配置
        if (config.focus) {
          updateFocusSettings(config.focus)
        }

        // 启动专注（如果配置了自动启动，或者有专注时长配置）
        if (config.autostart || config.focus) {
          startFocus()
          showToast('success', '专注已启动', '', getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION'))
        }
      }
    })
  }

  /**
   * 执行剪贴板检测
   */
  const performClipboardCheck = async () => {
    const detected = await checkClipboard()
    if (!detected) return

    // 根据检测类型分发处理
    if (detected.type === 'appUrl') {
      await handleClipboardAppUrl(detected)
    } else if (detected.type === 'playlist') {
      await handleClipboardPlaylist(detected)
    }
  }

  // === 剪贴板权限管理 ===
  let clipboardPermissionGranted = false
  let firstInteractionHandled = false

  /**
   * 检查剪贴板读取权限
   * @returns {Promise<'granted'|'denied'|'prompt'|'unknown'>} 权限状态
   */
  const checkClipboardPermission = async () => {
    if (!navigator.permissions) return 'unknown'
    try {
      const result = await navigator.permissions.query({ name: 'clipboard-read' })
      return result.state
    } catch {
      // 某些浏览器不支持 clipboard-read 权限查询
      return 'unknown'
    }
  }

  /**
   * 首次用户交互时触发剪贴板检测
   */
  const handleFirstInteraction = async () => {
    if (firstInteractionHandled) return
    firstInteractionHandled = true

    // 提示用户需要点击粘贴按钮
    showToast(
      'info',
      '检测剪贴板',
      '如弹出菜单，请点击"粘贴"以启用自动检测',
      getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
    )

    // 稍微延迟执行，让用户看到提示
    await new Promise((resolve) => setTimeout(resolve, 300))

    // 执行检测（此时用户刚交互，浏览器会弹出权限请求）
    await performClipboardCheck()

    // 检测后更新权限状态
    const state = await checkClipboardPermission()
    clipboardPermissionGranted = state === 'granted'
  }

  // 页面获得焦点时检测（仅在权限已授予时）
  let visibilityCheckTimeout = null
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      // 如果尚未进行首次交互检测，跳过
      if (!firstInteractionHandled) return

      // 预检查权限状态
      if (!clipboardPermissionGranted) {
        const state = await checkClipboardPermission()
        if (state === 'denied') {
          console.debug('[ClipboardDetection] 权限已被拒绝，跳过 visibilitychange 检测')
          return
        }
        // 'granted', 'prompt', 'unknown' 都尝试检测
        clipboardPermissionGranted = state === 'granted'
      }

      // 防抖：避免频繁切换时多次触发
      if (visibilityCheckTimeout) {
        clearTimeout(visibilityCheckTimeout)
      }
      visibilityCheckTimeout = setTimeout(() => {
        performClipboardCheck()
        visibilityCheckTimeout = null
      }, 500)
    }
  }

  // 初始化时检查权限状态
  checkClipboardPermission().then((state) => {
    clipboardPermissionGranted = state === 'granted'
    if (state === 'granted') {
      // 权限已授予，可以直接在页面加载时检测
      firstInteractionHandled = true
      setTimeout(
        () => {
          performClipboardCheck()
        },
        getConfig('UI_CONFIG', 'APLAYER_LOAD_DELAY') + 500
      )
    } else {
      // 权限未授予或需要询问，等待用户交互
      document.addEventListener('click', handleFirstInteraction, { once: true })
      document.addEventListener('touchstart', handleFirstInteraction, { once: true })
    }
  })

  document.addEventListener('visibilitychange', handleVisibilityChange)
  // 存储清理函数
  window.__clipboardCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('click', handleFirstInteraction)
    document.removeEventListener('touchstart', handleFirstInteraction)
    if (visibilityCheckTimeout) {
      clearTimeout(visibilityCheckTimeout)
    }
  }
  // === 剪贴板检测结束 ===
})

onUnmounted(() => {
  // 断开在线计数服务器连接
  onlineServer.disconnect()

  // 清理剪贴板检测监听器
  if (window.__clipboardCleanup) {
    window.__clipboardCleanup()
    delete window.__clipboardCleanup
  }

  if (loadTimer.value) {
    clearTimeout(loadTimer.value)
    loadTimer.value = null
  }

  if (stopShowControlsWatch) {
    stopShowControlsWatch()
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
