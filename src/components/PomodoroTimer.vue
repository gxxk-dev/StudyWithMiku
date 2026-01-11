<template>
  <div>
    <!-- 顶部计时条 -->
    <div
      class="countdown-clock"
      :class="{ 'settings-open': showSettings }"
      @click="toggleSettings"
      @mouseenter="onUIMouseEnter"
      @mouseleave="onUIMouseLeave"
      @touchstart="onUITouchStart"
      @touchend="onUITouchEnd"
    >
      <div class="online-indicator" @click.stop="toggleServerPanel">
        <span class="online-dot" :class="{ connected: isConnected }"></span>
        <span class="online-text">{{ onlineCount }}</span>
      </div>
      <span class="countdown-divider" aria-hidden="true"></span>
      <div class="system-time">{{ systemTime }}</div>
      <span class="countdown-divider" aria-hidden="true"></span>
      <div class="clock-display">
        <span class="minutes">{{ formattedMinutes }}</span>
        <span class="separator">:</span>
        <span class="seconds">{{ formattedSeconds }}</span>
      </div>
      <span class="countdown-divider" aria-hidden="true"></span>
      <div
        class="status-badge"
        :class="statusClass"
        @click.stop="togglePomodoroTimer"
        @mouseenter="onUIMouseEnter"
        @mouseleave="onUIMouseLeave"
        @touchstart="onUITouchStart"
        @touchend="onUITouchEnd"
      >
        {{ statusText }}
      </div>
      <span class="countdown-divider" aria-hidden="true"></span>
      <div
        class="settings-icon"
        title="设置"
        @click.stop="toggleSettings"
        @mouseenter="onUIMouseEnter"
        @mouseleave="onUIMouseLeave"
        @touchstart="onUITouchStart"
        @touchend="onUITouchEnd"
      >
        <Icon icon="lucide:settings" width="18" height="18" />
      </div>
    </div>

    <!-- 设置面板 -->
    <transition name="fade">
      <div
        v-if="showSettings"
        class="settings-overlay"
        @click.self="closeSettings"
        @mouseenter="onUIMouseEnter"
        @mouseleave="onUIMouseLeave"
        @touchstart="onUITouchStart"
        @touchend="onUITouchEnd"
      >
        <div class="settings-panel">
          <div class="settings-header">
            <h3>专注设置</h3>
            <button class="close-btn" @click="closeSettings">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <div class="settings-content">
            <!-- 标签页系统 -->
            <SettingsTabs
              :focus-duration="focusDuration"
              :break-duration="breakDuration"
              :time-left="timeLeft"
              :is-running="isRunning"
              :completed-pomodoros="completedPomodoros"
              :formatted-minutes="formattedMinutes"
              :formatted-seconds="formattedSeconds"
              :status-text="statusText"
              :status-class="statusClass"
              :total-time="totalTime"
              :platform="platform"
              :songs="songs"
              :platforms="PLATFORMS"
              :server-list="serverList"
              :selected-server-id="selectedServerId"
              :custom-server-url="customServerUrl"
              :auto-fallback="autoFallback"
              :is-connected="isConnected"
              :server-latencies="serverLatencies"
              :current-video-index="props.currentVideoIndex"
              :video-list="props.videoList"
              @timer-start="startTimer"
              @timer-pause="pauseTimer"
              @timer-reset="resetTimer"
              @update:focus-duration="focusDuration = $event"
              @update:break-duration="breakDuration = $event"
              @playlist-apply="handleApplyPlaylist"
              @playlist-reset="handleResetPlaylist"
              @server-select="handleSelectServer"
              @server-apply-custom="applyCustomServer"
              @update:custom-server-url="customServerUrl = $event"
              @update:auto-fallback="autoFallback = $event"
              @video-change="$emit('video-change', $event)"
              @cache-clear="handleCacheClear"
            />
          </div>
        </div>
      </div>
    </transition>

    <!-- 服务器选择面板 -->
    <ServerPanel
      v-model:custom-server-url="customServerUrl"
      v-model:auto-fallback="autoFallback"
      :show="showServerPanel"
      :server-list="serverList"
      :selected-server-id="selectedServerId"
      :is-connected="isConnected"
      :latencies="serverLatencies"
      @close="closeServerPanel"
      @select="handleSelectServer"
      @apply-custom="applyCustomServer"
      @mouseenter="onUIMouseEnter"
      @mouseleave="onUIMouseLeave"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useOnlineCount } from '../composables/useOnlineCount.js'
import { useServerConfig } from '../composables/useServerConfig.js'
import { useMusic } from '../composables/useMusic.js'
import { usePomodoro } from '../composables/usePomodoro.js'
import { setHoveringUI, getAPlayerInstance } from '../utils/eventBus.js'

// 子组件
import ServerPanel from './pomodoro/ServerPanel.vue'
import SettingsTabs from './settings/SettingsTabs.vue'

// 定义 emits
defineEmits(['video-change'])

// 定义 props（从 App.vue 接收视频状态）
const props = defineProps({
  currentVideoIndex: {
    type: Number,
    default: 0
  },
  videoList: {
    type: Array,
    default: () => []
  }
})

// 服务器配置
const {
  serverList,
  selectedServerId,
  customServerUrl: customServerUrlRef,
  autoFallback,
  getActiveServerUrl,
  selectServer: changeServer,
  setCustomServerUrl,
  testConnection,
  validateServerUrl
} = useServerConfig()

// WebSocket 连接
const initialWsUrl = getActiveServerUrl()
const { onlineCount, isConnected, reconnectToServer } = useOnlineCount(initialWsUrl)

// 音乐
const { platform, applyCustomPlaylist, resetToDefault, songs, PLATFORMS, applySpotifyPlaylist } =
  useMusic()

// 番茄钟
const {
  focusDuration,
  breakDuration,
  timeLeft,
  isRunning,
  completedPomodoros,
  formattedMinutes,
  formattedSeconds,
  statusText,
  statusClass,
  totalTime,
  startTimer,
  pauseTimer,
  resetTimer
} = usePomodoro()

// UI 状态
const showSettings = ref(false)
const showServerPanel = ref(false)
const serverLatencies = ref({})
const customServerUrl = ref(customServerUrlRef.value)
const currentTime = ref(new Date())
const timeUpdateInterval = ref(null)

// 监听 customServerUrlRef 变化
watch(customServerUrlRef, (newVal) => {
  customServerUrl.value = newVal
})

// 系统时间
const systemTime = computed(() => {
  const hours = currentTime.value.getHours().toString().padStart(2, '0')
  const minutes = currentTime.value.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
})

// 暂停当前音乐
const pauseCurrentMusic = () => {
  const ap = getAPlayerInstance()
  if (ap && typeof ap.pause === 'function') {
    ap.pause()
  }
}

// 设置面板操作
const toggleSettings = () => {
  showSettings.value = !showSettings.value
}

const closeSettings = () => {
  showSettings.value = false
}

// 暂停/恢复切换
const togglePomodoroTimer = () => {
  // 时间已用完时不允许操作
  if (timeLeft.value <= 0) return

  if (isRunning.value) {
    pauseTimer()
  } else {
    startTimer()
  }
}

// 服务器面板操作
const toggleServerPanel = () => {
  showServerPanel.value = !showServerPanel.value
  if (showServerPanel.value) {
    loadServerLatencies()
  }
}

const closeServerPanel = () => {
  showServerPanel.value = false
}

const loadServerLatencies = async () => {
  for (const server of serverList.value) {
    let testUrl = server.url
    if (server.id === 'custom') {
      if (!customServerUrl.value) continue
      testUrl = customServerUrl.value
    }
    if (!testUrl) continue
    const result = await testConnection(testUrl)
    if (result.success) {
      serverLatencies.value[server.id] = result.latency
    }
  }
}

const handleSelectServer = async (serverId) => {
  if (serverId === 'custom' && !customServerUrl.value) {
    changeServer(serverId)
    return
  }

  try {
    const newUrl = getActiveServerUrl(serverId)
    const testResult = await testConnection(newUrl)

    if (testResult.success) {
      changeServer(serverId)
      await reconnectToServer(newUrl)
      closeServerPanel()
    } else {
      alert(`连接测试失败: ${testResult.error}`)
    }
  } catch (err) {
    console.error('Server selection error:', err)
  }
}

const applyCustomServer = async () => {
  const validation = validateServerUrl(customServerUrl.value)
  if (!validation.valid) {
    alert(validation.error)
    return
  }

  setCustomServerUrl(customServerUrl.value)
  await handleSelectServer('custom')
}

// 歌单操作
const handleApplyPlaylist = async ({ platform: selectedPlatform, playlistId }) => {
  pauseCurrentMusic()

  try {
    if (selectedPlatform === 'spotify') {
      applySpotifyPlaylist(playlistId)
      return
    }

    await applyCustomPlaylist(selectedPlatform, playlistId)
    const ap = getAPlayerInstance()
    if (ap?.list && typeof ap.list.clear === 'function') {
      ap.list.clear()
      ap.list.add(songs.value)
    }
  } catch (error) {
    console.error('Failed to apply playlist:', error)
  }
}

const handleResetPlaylist = async () => {
  pauseCurrentMusic()
  await resetToDefault()
  const ap = getAPlayerInstance()
  if (ap) {
    ap.list.clear()
    ap.list.add(songs.value)
  }
}

// UI 交互
const onUIMouseEnter = () => setHoveringUI(true)
const onUIMouseLeave = () => setHoveringUI(false)
const onUITouchStart = () => setHoveringUI(true)
const onUITouchEnd = () => setHoveringUI(false)

// 缓存清除处理（占位符，实际逻辑在未来实现）
const handleCacheClear = (cacheType) => {
  console.log('清除缓存:', cacheType)
  // TODO: 实现缓存清除逻辑
}

// 生命周期
onMounted(() => {
  timeUpdateInterval.value = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timeUpdateInterval.value) {
    clearInterval(timeUpdateInterval.value)
  }
})
</script>

<style scoped lang="scss">
@use '../styles/pomodoro.scss' as *;

// 顶部计时条
.countdown-clock {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  cursor: pointer;
  transition: all 0.3s ease;
  background: $glass-bg;
  backdrop-filter: blur(20px);
  border-radius: 10px;
  padding: 0.8rem 1.2rem;
  border: 1px solid $glass-border;
  display: inline-flex;
  align-items: center;
  gap: 1.2rem;
  white-space: nowrap;
  color: white;
  font-family: 'Courier New', monospace;

  &:hover {
    background: $glass-bg-hover;
    transform: translateX(-50%) translateY(-2px);
  }

  &.settings-open {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
}

.countdown-divider {
  width: 1px;
  height: 1.4rem;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 1px;
  flex-shrink: 0;
  opacity: 0.8;
}

.online-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: opacity 0.3s;

  &:hover {
    opacity: 0.8;
  }
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  transition: background 0.3s ease;

  &.connected {
    background: $color-success;
    box-shadow: 0 0 8px rgba($color-success, 0.6);
  }
}

.online-text {
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0.9;
}

.system-time {
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0.8;
}

.clock-display {
  font-size: 1.5rem;
  font-weight: 600;
}

.status-badge {
  @extend .pomodoro-status-badge;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    opacity: 0.8;
  }

  &:active {
    transform: scale(0.98);
  }
}

.settings-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
  padding: 0.2rem;
  border-radius: 4px;

  &:hover {
    color: rgba(255, 255, 255, 1);
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

// 设置面板
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: $overlay-bg;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002;
}

.settings-panel {
  @include glass-panel;
  max-width: 550px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid $glass-border;

  h3 {
    color: white;
    margin: 0;
    font-size: 1.2rem;
  }
}

.close-btn {
  @extend .pomodoro-close-btn;
}

.settings-content {
  padding: 0;
  max-height: calc(90vh - 100px);
  overflow-y: auto;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.settings-section {
  padding: 1.5rem;

  &:not(:last-child) {
    border-bottom: 1px solid $glass-border;
  }
}

.section-title {
  color: white;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  opacity: 0.9;
  text-align: center;
  position: relative;
  padding-bottom: 0.5rem;

  // 装饰性下划线
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  }
}

.pomodoro-section {
  .timer-container {
    padding: 0;
    text-align: center;
    color: white;
  }
}

.playlist-section {
  :deep(.playlist-container) {
    padding: 0;
  }
}

.status-indicator {
  margin-bottom: 1rem;
}

.status-text {
  font-size: 1rem;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  background: $glass-bg;

  &.focus {
    color: $color-focus;
  }

  &.break {
    color: $color-break;
  }

  &.long-break {
    color: $color-long-break;
  }
}

// 移动端响应式
@media (max-width: 480px) {
  .settings-panel {
    width: 95%;
    max-height: 85vh;
  }

  .settings-content {
    max-height: calc(85vh - 80px);
  }

  .settings-section {
    padding: 1rem;
  }

  .section-title {
    font-size: 0.9rem;
  }
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .settings-panel {
    width: 95vw;
    max-width: none;
    height: 88vh;
    max-height: 88vh;
    overflow: hidden; // 关键：去除面板滚动
  }

  .settings-header {
    padding: 1rem 1.5rem;

    h3 {
      font-size: 1rem;
    }
  }

  .settings-content {
    padding: 0;
    max-height: none; // 关键：去除高度限制
    overflow: visible; // 关键：去除滚动
    height: calc(88vh - 70px);
  }

  // 超小屏调整
  @media (max-width: 667px) {
    .settings-panel {
      width: 98vw;
      height: 92vh;
      max-height: 92vh;
    }

    .settings-content {
      height: calc(92vh - 70px);
    }
  }

  // 大屏调整
  @media (min-width: 901px) {
    .settings-panel {
      width: 90vw;
      height: 82vh;
      max-height: 82vh;
    }

    .settings-content {
      height: calc(82vh - 70px);
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
