/**
 * 统一播放器 Composable
 * 替代 eventBus.js，集中管理播放状态和播放器适配器
 */

import { ref, shallowRef, computed, readonly } from 'vue'
import { PlaybackState, PlayerEvent } from '../player/constants.js'
import { getConfig } from '../services/runtimeConfig.js'

/**
 * @typedef {import('../player/PlayerAdapter.js').PlayerAdapter} PlayerAdapter
 * @typedef {import('../types/music.js').UnifiedTrack} UnifiedTrack
 */

// ================== 模块级单例状态 ==================

/** @type {import('vue').ShallowRef<PlayerAdapter|null>} */
const adapter = shallowRef(null)

/** @type {import('vue').Ref<string>} */
const playbackState = ref(PlaybackState.IDLE)

/** @type {import('vue').Ref<UnifiedTrack|null>} */
const currentTrack = ref(null)

/** @type {import('vue').Ref<number>} */
const currentTime = ref(0)

/** @type {import('vue').Ref<number>} */
const duration = ref(0)

/** @type {import('vue').Ref<number>} */
const volume = ref(getConfig('AUDIO_CONFIG', 'DEFAULT_VOLUME'))

/** @type {import('vue').Ref<number>} */
const trackIndex = ref(0)

/** @type {import('vue').Ref<UnifiedTrack[]>} */
const trackList = ref([])

/** @type {import('vue').Ref<string>} */
const adapterType = ref('')

/** @type {Function|null} 当前事件取消订阅函数 */
let eventUnsubscribers = []

/** @type {number|null} 音量恢复定时器 */
let volumeRestoreTimer = null

/** @type {number} 原始音量值（用于闪避恢复） */
let originalVolume = getConfig('AUDIO_CONFIG', 'DEFAULT_VOLUME')

// ================== Computed ==================

const isPlaying = computed(() => playbackState.value === PlaybackState.PLAYING)
const isPaused = computed(() => playbackState.value === PlaybackState.PAUSED)
const isBuffering = computed(() => playbackState.value === PlaybackState.BUFFERING)
const progress = computed(() => {
  if (duration.value <= 0) return 0
  return currentTime.value / duration.value
})

// ================== 内部方法 ==================

/**
 * 绑定适配器事件到响应式状态
 * @param {PlayerAdapter} adapterInstance
 */
function bindAdapterEvents(adapterInstance) {
  // 清除旧的订阅
  unbindAdapterEvents()

  // 状态变化
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.STATE_CHANGE, (state) => {
      playbackState.value = state
    })
  )

  // 播放事件
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.PLAY, () => {
      playbackState.value = PlaybackState.PLAYING
    })
  )

  // 暂停事件
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.PAUSE, () => {
      playbackState.value = PlaybackState.PAUSED
    })
  )

  // 时间更新
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.TIME_UPDATE, (data) => {
      currentTime.value = data.currentTime
      duration.value = data.duration
    })
  )

  // 音量变化
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.VOLUME_CHANGE, (vol) => {
      volume.value = vol
    })
  )

  // 曲目切换
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.TRACK_CHANGE, (data) => {
      trackIndex.value = data.index
      currentTrack.value = data.track
    })
  )

  // 播放列表加载
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.PLAYLIST_LOADED, (data) => {
      trackList.value = data.tracks || []
      if (trackList.value.length > 0) {
        currentTrack.value = trackList.value[0]
        trackIndex.value = 0
      }
    })
  )

  // 错误事件
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.ERROR, () => {
      playbackState.value = PlaybackState.ERROR
    })
  )

  // 结束事件
  eventUnsubscribers.push(
    adapterInstance.on(PlayerEvent.ENDED, () => {
      playbackState.value = PlaybackState.ENDED
    })
  )
}

/**
 * 解绑适配器事件
 */
function unbindAdapterEvents() {
  eventUnsubscribers.forEach((unsub) => {
    if (typeof unsub === 'function') {
      unsub()
    }
  })
  eventUnsubscribers = []
}

// ================== 公开方法 ==================

/**
 * 设置适配器
 * @param {PlayerAdapter} newAdapter - 新适配器实例
 */
async function setAdapter(newAdapter) {
  // 销毁旧适配器
  if (adapter.value) {
    unbindAdapterEvents()
    await adapter.value.destroy()
  }

  adapter.value = newAdapter
  adapterType.value = newAdapter.getAdapterType()

  // 绑定新适配器事件
  bindAdapterEvents(newAdapter)

  // 同步初始状态
  if (newAdapter.isInitialized()) {
    playbackState.value = newAdapter.getPlaybackState()
    volume.value = newAdapter.getVolume()
    currentTrack.value = newAdapter.getCurrentTrack()
    trackIndex.value = newAdapter.getCurrentTrackIndex()
    trackList.value = newAdapter.getTrackList()
  }
}

/**
 * 初始化适配器
 * @param {HTMLElement} [container] - 容器元素
 * @param {Object} [options] - 初始化选项
 */
async function initialize(container, options = {}) {
  if (!adapter.value) {
    console.warn('[usePlayer] 未设置适配器，无法初始化')
    return
  }

  await adapter.value.initialize(container, options)

  // 同步初始状态
  playbackState.value = adapter.value.getPlaybackState()
  volume.value = adapter.value.getVolume()
}

/**
 * 播放
 */
async function play() {
  if (!adapter.value) return
  await adapter.value.play()
}

/**
 * 暂停
 */
async function pause() {
  if (!adapter.value) return
  await adapter.value.pause()
}

/**
 * 停止
 */
async function stop() {
  if (!adapter.value) return
  await adapter.value.stop()
}

/**
 * 跳转到指定时间
 * @param {number} time - 秒数
 */
async function seek(time) {
  if (!adapter.value) return
  await adapter.value.seek(time)
}

/**
 * 获取音量
 * @returns {number}
 */
function getVolume() {
  if (!adapter.value) return volume.value
  return adapter.value.getVolume()
}

/**
 * 设置音量
 * @param {number} vol - 0-1 之间的音量值
 */
function setVolume(vol) {
  if (!adapter.value) return
  adapter.value.setVolume(vol)
  volume.value = vol
}

/**
 * 下一首
 */
async function skipNext() {
  if (!adapter.value) return
  await adapter.value.skipNext()
}

/**
 * 上一首
 */
async function skipPrevious() {
  if (!adapter.value) return
  await adapter.value.skipPrevious()
}

/**
 * 切换到指定曲目
 * @param {number} index - 曲目索引
 */
async function switchTrack(index) {
  if (!adapter.value) return
  await adapter.value.switchTrack(index)
}

/**
 * 加载播放列表
 * @param {UnifiedTrack[]} tracks - 曲目列表
 */
async function loadPlaylist(tracks) {
  if (!adapter.value) {
    console.warn('[usePlayer] 未设置适配器，无法加载播放列表')
    return
  }
  await adapter.value.loadPlaylist(tracks)
}

/**
 * 平滑音量过渡
 * @param {number} targetVolume - 目标音量
 * @param {number} [durationMs] - 过渡时长（毫秒）
 * @returns {Promise<void>}
 */
function fadeVolume(targetVolume, durationMs) {
  const fadeDuration = durationMs ?? getConfig('AUDIO_CONFIG', 'DEFAULT_FADE_DURATION')
  const fadeSteps = getConfig('AUDIO_CONFIG', 'VOLUME_FADE_STEPS')

  return new Promise((resolve, reject) => {
    if (!adapter.value) {
      resolve()
      return
    }

    const startVolume = getVolume()
    const volumeDiff = targetVolume - startVolume
    const stepDuration = fadeDuration / fadeSteps
    let currentStep = 0
    let interval = null

    interval = setInterval(() => {
      currentStep++
      const progress = currentStep / fadeSteps
      // ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const newVolume = startVolume + volumeDiff * easeProgress

      if (!adapter.value) {
        clearInterval(interval)
        reject(new Error('Adapter lost'))
        return
      }

      setVolume(Math.max(0, Math.min(1, newVolume)))

      if (currentStep >= fadeSteps) {
        clearInterval(interval)
        setVolume(targetVolume)
        resolve()
      }
    }, stepDuration)
  })
}

/**
 * 通知音量闪避
 * @param {number} [notificationDuration] - 通知时长（毫秒）
 */
async function duckForNotification(notificationDuration) {
  const duration = notificationDuration ?? getConfig('AUDIO_CONFIG', 'NOTIFICATION_DURATION')

  if (!adapter.value) return

  // 清除之前的恢复定时器
  if (volumeRestoreTimer) {
    clearTimeout(volumeRestoreTimer)
    volumeRestoreTimer = null
  }

  originalVolume = getVolume()
  const duckedVolume = originalVolume * getConfig('AUDIO_CONFIG', 'VOLUME_DUCK_RATIO')
  const fadeDuration = getConfig('AUDIO_CONFIG', 'VOLUME_FADE_DURATION')

  await fadeVolume(duckedVolume, fadeDuration)

  volumeRestoreTimer = setTimeout(() => {
    if (!adapter.value) {
      volumeRestoreTimer = null
      return
    }
    fadeVolume(originalVolume, fadeDuration).catch((err) => {
      console.error('[usePlayer] 恢复通知后音量失败:', err)
    })
    volumeRestoreTimer = null
  }, duration)
}

/**
 * 销毁播放器
 */
async function destroy() {
  // 清除音量恢复定时器
  if (volumeRestoreTimer) {
    clearTimeout(volumeRestoreTimer)
    volumeRestoreTimer = null
  }

  // 解绑事件
  unbindAdapterEvents()

  // 销毁适配器
  if (adapter.value) {
    await adapter.value.destroy()
    adapter.value = null
  }

  // 重置状态
  playbackState.value = PlaybackState.IDLE
  currentTrack.value = null
  currentTime.value = 0
  duration.value = 0
  trackIndex.value = 0
  trackList.value = []
  adapterType.value = ''
}

/**
 * 获取当前适配器
 * @returns {PlayerAdapter|null}
 */
function getAdapter() {
  return adapter.value
}

/**
 * 检查适配器能力
 * @param {string} capability - 能力名称
 * @returns {boolean}
 */
function hasCapability(capability) {
  if (!adapter.value) return false

  switch (capability) {
    case 'lyrics':
      return adapter.value.supportsLyrics()
    case 'seek':
      return adapter.value.supportsSeek()
    case 'builtInUI':
      return adapter.value.hasBuiltInUI()
    case 'internalPlaylist':
      return adapter.value.hasInternalPlaylist()
    default:
      return false
  }
}

// ================== Composable 导出 ==================

/**
 * 统一播放器 Composable
 * 模块级单例模式，所有组件共享同一份状态
 */
export function usePlayer() {
  return {
    // 响应式状态（只读）
    playbackState: readonly(playbackState),
    currentTrack: readonly(currentTrack),
    currentTime: readonly(currentTime),
    duration: readonly(duration),
    volume: readonly(volume),
    trackIndex: readonly(trackIndex),
    trackList: readonly(trackList),
    adapterType: readonly(adapterType),

    // Computed
    isPlaying,
    isPaused,
    isBuffering,
    progress,

    // 适配器管理
    setAdapter,
    getAdapter,
    initialize,
    destroy,

    // 播放控制
    play,
    pause,
    stop,
    seek,

    // 音量控制
    getVolume,
    setVolume,
    fadeVolume,
    duckForNotification,

    // 切歌控制
    skipNext,
    skipPrevious,
    switchTrack,

    // 播放列表
    loadPlaylist,

    // 能力查询
    hasCapability
  }
}
