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
      <div class="status-badge" :class="statusClass">
        {{ statusText }}
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
            <h3>设置</h3>
            <button class="close-btn" @click="closeSettings">×</button>
          </div>

          <div class="settings-tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'pomodoro' }"
              @click="activeTab = 'pomodoro'"
            >
              番茄钟
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'playlist' }"
              @click="activeTab = 'playlist'"
            >
              歌单
            </button>
          </div>

          <div class="tab-content">
            <!-- 番茄钟设置 -->
            <div v-show="activeTab === 'pomodoro'" class="timer-container">
              <div class="status-indicator">
                <span class="status-text" :class="statusClass">{{ statusText }}</span>
              </div>

              <TimerDisplay
                :time-left="timeLeft"
                :total-time="totalTime"
                :status-class="statusClass"
              />

              <TimerControls
                :is-running="isRunning"
                :disabled="timeLeft <= 0"
                @start="startTimer"
                @pause="pauseTimer"
                @reset="resetTimer"
              />

              <TimerSettings
                v-model:focus-duration="focusDuration"
                v-model:break-duration="breakDuration"
                :disabled="isRunning"
              />

              <PomodoroCounter
                :completed="completedPomodoros"
                :total="4"
              />
            </div>

            <!-- 歌单设置 -->
            <PlaylistPanel
              v-show="activeTab === 'playlist'"
              :platforms="PLATFORMS"
              :initial-platform="platform"
              @apply="handleApplyPlaylist"
              @reset="handleResetPlaylist"
            />
          </div>
        </div>
      </div>
    </transition>

    <!-- 服务器选择面板 -->
    <ServerPanel
      :show="showServerPanel"
      :server-list="serverList"
      :selected-server-id="selectedServerId"
      :is-connected="isConnected"
      :latencies="serverLatencies"
      v-model:custom-server-url="customServerUrl"
      v-model:auto-fallback="autoFallback"
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
import { useOnlineCount } from '../composables/useOnlineCount.js'
import { useServerConfig } from '../composables/useServerConfig.js'
import { useMusic } from '../composables/useMusic.js'
import { usePomodoro } from '../composables/usePomodoro.js'
import { setHoveringUI, getAPlayerInstance } from '../utils/eventBus.js'

// 子组件
import TimerDisplay from './pomodoro/TimerDisplay.vue'
import TimerControls from './pomodoro/TimerControls.vue'
import TimerSettings from './pomodoro/TimerSettings.vue'
import PlaylistPanel from './pomodoro/PlaylistPanel.vue'
import ServerPanel from './pomodoro/ServerPanel.vue'
import PomodoroCounter from './pomodoro/PomodoroCounter.vue'

// 服务器配置
const {
  serverList,
  selectedServerId,
  customServerUrl: customServerUrlRef,
  autoFallback,
  getActiveServerUrl,
  selectServer: changeServer,
  setCustomServerUrl,
  toggleAutoFallback,
  testConnection,
  validateServerUrl
} = useServerConfig()

// WebSocket 连接
const initialWsUrl = getActiveServerUrl()
const { onlineCount, isConnected, reconnectToServer } = useOnlineCount(initialWsUrl)

// 音乐
const {
  platform,
  applyCustomPlaylist,
  resetToDefault,
  songs,
  PLATFORMS,
  applySpotifyPlaylist
} = useMusic()

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
const activeTab = ref('pomodoro')
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
  max-width: 400px;
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

.settings-tabs {
  display: flex;
  border-bottom: 1px solid $glass-border;
  padding: 0 1.5rem;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  border-bottom: 2px solid transparent;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  &.active {
    color: white;
    border-bottom-color: $color-break;
  }
}

.timer-container {
  padding: 1.5rem;
  text-align: center;
  color: white;
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
