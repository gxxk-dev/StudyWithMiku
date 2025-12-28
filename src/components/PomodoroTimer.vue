<template>
  <div>
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
      <div class="system-time" >{{ systemTime }}</div>
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
    <transition name="fade">
      <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings" @mouseenter="onUIMouseEnter" @mouseleave="onUIMouseLeave" @touchstart="onUITouchStart" @touchend="onUITouchEnd">
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
            <div v-show="activeTab === 'pomodoro'" class="timer-container">
            <div class="status-indicator">
              <span class="status-text" :class="statusClass">{{ statusText }}</span>
            </div>
            
            <div class="timer-display">
              <div class="time-circle">
                <svg class="progress-ring" width="120" height="120">
                  <circle
                    class="progress-ring-background"
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="rgba(255, 255, 255, 0.2)"
                    stroke-width="5"
                    fill="transparent"
                  />
                  <circle
                    class="progress-ring-fill"
                    :class="statusClass"
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    stroke-width="5"
                    fill="transparent"
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="strokeDashoffset"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div class="time-text">
                  <span class="minutes">{{ formattedMinutes }}</span>
                  <span class="separator">:</span>
                  <span class="seconds">{{ formattedSeconds }}</span>
                </div>
              </div>
            </div>
            
            <div class="timer-controls">
              <button 
                v-if="!isRunning" 
                class="control-btn start-btn" 
                @click="startTimer"
                :disabled="timeLeft <= 0"
              >
                <span class="btn-icon">▶</span>
              </button>
              <button 
                v-else 
                class="control-btn pause-btn" 
                @click="pauseTimer"
              >
                <span class="btn-icon">⏸</span>
              </button>
              <button 
                class="control-btn reset-btn" 
                @click="resetTimer"
              >
                <span class="btn-icon">↺</span>
              </button>
            </div>
            
            <div class="timer-settings">
              <div class="setting-group">
                <label>专注时间(分钟)</label>
                <input 
                  type="number" 
                  v-model.number="focusDuration" 
                  min="1" 
                  max="60"
                  :disabled="isRunning"
                />
              </div>
              <div class="setting-group">
                <label>休息时间(分钟)</label>
                <input 
                  type="number" 
                  v-model.number="breakDuration" 
                  min="1" 
                  max="30"
                  :disabled="isRunning"
                />
              </div>
            </div>
            
            <div class="pomodoro-count">
              <span class="count-label">已完成番茄:</span>
              <div class="count-display">
                <span
                  v-for="i in 4"
                  :key="i"
                  class="pomodoro-dot"
                  :class="{ filled: completedPomodoros >= i }"
                ></span>
              </div>
            </div>
          </div>

          <div v-show="activeTab === 'playlist'" class="playlist-container">
            <div class="playlist-settings">
              <div class="setting-group">
                <label>平台</label>
                <select v-model="selectedPlatform" class="platform-select">
                  <option v-for="p in PLATFORMS" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
              </div>
              <div class="setting-group">
                <label>歌单ID</label>
                <input
                  type="text"
                  v-model="inputPlaylistId"
                  placeholder="粘贴歌单链接或ID"
                />
              </div>
              <div v-if="detectedPlatformHint" class="platform-hint">
                {{ detectedPlatformHint }}
              </div>
              <div class="playlist-actions">
                <button class="action-btn apply-btn" @click="applyPlaylist">获取</button>
                <button class="action-btn reset-playlist-btn" @click="resetPlaylist">恢复默认</button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 服务器选择面板 -->
    <transition name="fade-down">
      <div v-if="showServerPanel" class="server-panel-container" @click.stop @mouseenter="onUIMouseEnter" @mouseleave="onUIMouseLeave">
        <div class="server-panel">
          <div class="server-header">
            <h4>选择计数服务器</h4>
            <button class="close-btn" @click="closeServerPanel">×</button>
          </div>

          <div class="server-list">
            <div
              v-for="server in serverList"
              :key="server.id"
              class="server-item"
              :class="{ active: selectedServerId === server.id }"
              @click="handleSelectServer(server.id)"
            >
              <div class="server-info">
                <div class="server-name">{{ server.name }}</div>
                <div class="server-desc">{{ server.description }}</div>
              </div>
              <div class="server-status">
                <span v-if="selectedServerId === server.id && isConnected" class="status-badge">已连接</span>
                <span v-if="serverLatencies[server.id]" class="latency">{{ serverLatencies[server.id] }}ms</span>
              </div>
            </div>
          </div>

          <!-- 自定义服务器输入框 -->
          <div v-if="selectedServerId === 'custom'" class="custom-server-section">
            <input
              v-model="customServerUrl"
              type="text"
              placeholder="wss://example.com/ws"
              class="custom-url-input"
            />
            <button @click="applyCustomServer" class="apply-btn">应用</button>
          </div>

          <div class="server-panel-footer">
            <label class="auto-fallback-label">
              <input type="checkbox" v-model="autoFallback" @change="handleAutoFallbackChange" />
              <span>连接失败时自动切换到默认服务器</span>
            </label>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useOnlineCount } from '../composables/useOnlineCount.js'
import { useServerConfig } from '../composables/useServerConfig.js'
import { useMusic } from '../composables/useMusic.js'
import { duckMusicForNotification, setHoveringUI, getAPlayerInstance } from '../utils/eventBus.js'
import { getPomodoroSettings, savePomodoroSettings } from '../utils/userSettings.js'
import { extractSpotifyPlaylistId, isSpotifyLink } from '../services/spotify.js'

const resolveWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  if (typeof window === 'undefined') return 'ws://localhost:8787/ws'
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

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

// 初始化 WebSocket URL
const initialWsUrl = getActiveServerUrl()
const { onlineCount, isConnected, reconnectToServer } = useOnlineCount(initialWsUrl)
const { playlistId, platform, applyCustomPlaylist, resetToDefault, songs, DEFAULT_PLAYLIST_ID, PLATFORMS, isSpotify, spotifyPlaylistId, applySpotifyPlaylist, resetSpotifyToDefault } = useMusic()

const inputPlaylistId = ref('')
const selectedPlatform = ref(platform.value)

const pauseCurrentMusic = () => {
  const ap = getAPlayerInstance()
  if (ap && typeof ap.pause === 'function') {
    ap.pause()
  }
}

// 从文本中提取歌单ID
const extractPlaylistId = (text, targetPlatform) => {
  if (!text) return ''

  const trimmed = text.trim()

  // 尝试从URL中提取
  const urlPatterns = {
    netease: [
      /music\.163\.com.*[?&]id=(\d+)/,
      /music\.163\.com\/playlist\/(\d+)/
    ],
    tencent: [
      /y\.qq\.com.*[?&]id=(\d+)/,
      /y\.qq\.com\/n\/ryqq\/playlist\/(\d+)/
    ]
  }

  const patterns = urlPatterns[targetPlatform] || []
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // 如果没匹配到URL格式，检查是否是纯数字ID
  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }

  // 最后尝试从文本任意位置提取id参数
  const genericIdMatch = trimmed.match(/[?&]id=(\d+)/)
  if (genericIdMatch) {
    return genericIdMatch[1]
  }

  return trimmed
}

// 从文本检测平台
const detectPlatformFromText = (text) => {
  if (!text) return null
  if (/music\.163\.com/i.test(text)) return 'netease'
  if (/y\.qq\.com|i\.y\.qq\.com/i.test(text)) return 'tencent'
  if (isSpotifyLink(text)) return 'spotify'
  return null
}

// 检测到的平台提示
const detectedPlatformHint = computed(() => {
  const detected = detectPlatformFromText(inputPlaylistId.value)
  if (detected === 'netease') return '✓ 检测到网易云歌单'
  if (detected === 'tencent') return '✓ 检测到QQ音乐歌单'
  if (detected === 'spotify') return '✓ 检测到Spotify歌单'
  return ''
})

const currentTime = ref(new Date())
const systemTime = computed(() => {
  const hours = currentTime.value.getHours().toString().padStart(2, '0')
  const minutes = currentTime.value.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
})

const applyPlaylist = async () => {
  if (!inputPlaylistId.value) return

  // 自动检测平台
  const detectedPlatform = detectPlatformFromText(inputPlaylistId.value)
  if (detectedPlatform) {
    selectedPlatform.value = detectedPlatform
  }

  pauseCurrentMusic()

  // Spotify 特殊处理
  if (selectedPlatform.value === 'spotify') {
    const extractedId = extractSpotifyPlaylistId(inputPlaylistId.value)
    inputPlaylistId.value = extractedId
    applySpotifyPlaylist(extractedId)
    return
  }

  // 提取歌单ID (网易云/QQ音乐)
  const extractedId = extractPlaylistId(inputPlaylistId.value, selectedPlatform.value)
  inputPlaylistId.value = extractedId

  await applyCustomPlaylist(selectedPlatform.value, extractedId)
  const ap = getAPlayerInstance()
  if (ap) {
    ap.list.clear()
    ap.list.add(songs.value)
  }
}

const resetPlaylist = async () => {
  inputPlaylistId.value = ''
  pauseCurrentMusic()
  await resetToDefault()
  const ap = getAPlayerInstance()
  if (ap) {
    ap.list.clear()
    ap.list.add(songs.value)
  }
}

const STATUS = {
  FOCUS: 'focus',
  BREAK: 'break',
  LONG_BREAK: 'longBreak'
}

const savedPomodoro = getPomodoroSettings()
const focusDuration = ref(savedPomodoro.focusDuration)
const breakDuration = ref(savedPomodoro.breakDuration)
const timeLeft = ref(focusDuration.value * 60)
const isRunning = ref(false)
const currentStatus = ref(STATUS.FOCUS)
const completedPomodoros = ref(0)
const showSettings = ref(false)

// 服务器面板状态
const showServerPanel = ref(false)
const serverLatencies = ref({})
const customServerUrl = ref(customServerUrlRef.value)

// 监听 customServerUrlRef 的变化
watch(customServerUrlRef, (newVal) => {
  customServerUrl.value = newVal
})

const activeTab = ref('pomodoro')

watch(focusDuration, (newVal) => {
  if (currentStatus.value === STATUS.FOCUS && !isRunning.value) {
    timeLeft.value = newVal * 60
  }
  savePomodoroSettings(newVal, breakDuration.value)
})

watch(breakDuration, (newVal) => {
  if (currentStatus.value !== STATUS.FOCUS && !isRunning.value) {
    timeLeft.value = newVal * 60
  }
  savePomodoroSettings(focusDuration.value, newVal)
})

let timer = null
let timeUpdateInterval = null

const formattedMinutes = computed(() => {
  return Math.floor(timeLeft.value / 60).toString().padStart(2, '0')
})

const formattedSeconds = computed(() => {
  return (timeLeft.value % 60).toString().padStart(2, '0')
})

const statusText = computed(() => {
  switch (currentStatus.value) {
    case STATUS.FOCUS: return '专注'
    case STATUS.BREAK: return '休息'
    case STATUS.LONG_BREAK: return '长休'
    default: return '专注'
  }
})

const statusClass = computed(() => {
  switch (currentStatus.value) {
    case STATUS.FOCUS: return 'focus'
    case STATUS.BREAK: return 'break'
    case STATUS.LONG_BREAK: return 'long-break'
    default: return 'focus'
  }
})

const circumference = computed(() => 2 * Math.PI * 54)
const strokeDashoffset = computed(() => {
  const totalTime = currentStatus.value === STATUS.FOCUS 
    ? focusDuration.value * 60 
    : breakDuration.value * 60
  const progress = (totalTime - timeLeft.value) / totalTime
  return circumference.value * (1 - progress)
})

const toggleSettings = () => {
  showSettings.value = !showSettings.value
}

const closeSettings = () => {
  showSettings.value = false
}

// 服务器面板处理函数
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

const handleAutoFallbackChange = () => {
  toggleAutoFallback(autoFallback.value)
}

const startTimer = () => {
  if (timeLeft.value <= 0) return
  isRunning.value = true
  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      clearInterval(timer)
      handleTimerComplete()
    }
  }, 1000)
}

const pauseTimer = () => {
  isRunning.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const resetTimer = () => {
  pauseTimer()
  timeLeft.value = focusDuration.value * 60
  currentStatus.value = STATUS.FOCUS
}

const handleTimerComplete = () => {
  playNotificationSound()
  
  if (currentStatus.value === STATUS.FOCUS) {
    completedPomodoros.value++
    
    if (completedPomodoros.value % 4 === 0) {
      currentStatus.value = STATUS.LONG_BREAK
      timeLeft.value = breakDuration.value * 60 * 2
    } else {
      currentStatus.value = STATUS.BREAK
      timeLeft.value = breakDuration.value * 60
    }
  } else {
    currentStatus.value = STATUS.FOCUS
    timeLeft.value = focusDuration.value * 60
  }
  
  showNotification()
  
  setTimeout(() => {
    startTimer()
  }, 1000)
}

const NOTIFICATION_AUDIO_URL = 'https://assets.frez79.io/swm/BreakOrWork.mp3'

const playNotificationSound = async () => {
  duckMusicForNotification(3000)
  
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const audio = new Audio(NOTIFICATION_AUDIO_URL)
  audio.play()
}

const showNotification = () => {
  if (Notification.permission === 'granted') {
    new Notification('番茄钟', {
      body: `${statusText.value}已完成！`,
      icon: '/favicon.ico'
    })
  }
}

const onUIMouseEnter = () => {
  setHoveringUI(true)
}

const onUIMouseLeave = () => {
  setHoveringUI(false)
}

const onUITouchStart = () => {
  setHoveringUI(true)
}
const onUITouchEnd = () => {
  setHoveringUI(false)
}

onMounted(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  timeUpdateInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})
</script>

<style scoped>
.countdown-clock {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 10px;
  padding: 0.8rem 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: inline-flex;
  align-items: center;
  gap: 1.2rem;
  white-space: nowrap;
  color: white;
  font-family: 'Courier New', monospace;
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
  position: relative;
}

.online-indicator:hover {
  opacity: 0.8;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  transition: background 0.3s ease;
}

.online-dot.connected {
  background: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
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

.countdown-clock:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-50%) translateY(-2px);
}

.countdown-clock.settings-open {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.clock-display {
  font-size: 1.5rem;
  font-weight: 600;
}

.status-badge {
  padding: 0.3rem 0.8rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);
}

.status-badge.focus {
  color: #ff6b6b;
}

.status-badge.break {
  color: #4ecdc4;
}

.status-badge.long-break {
  color: #45b7d1;
}

.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002;
}

.settings-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-header h3 {
  color: white;
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.1);
}

.status-text.focus {
  color: #ff6b6b;
}

.status-text.break {
  color: #4ecdc4;
}

.status-text.long-break {
  color: #45b7d1;
}

.timer-display {
  margin-bottom: 1.5rem;
}

.time-circle {
  position: relative;
  display: inline-block;
}

.progress-ring {
  display: block;
  width: 120px;
  height: 120px;
}

.progress-ring-fill.focus {
  color: #ff6b6b;
}

.progress-ring-fill.break {
  color: #4ecdc4;
}

.progress-ring-fill.long-break {
  color: #45b7d1;
}

.time-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.8rem;
  font-weight: 300;
  font-family: 'Courier New', monospace;
}

.timer-controls {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.control-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.start-btn {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
}

.pause-btn {
  background: rgba(255, 193, 7, 0.3);
  border-color: rgba(255, 193, 7, 0.5);
}

.reset-btn {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
}

.btn-icon {
  font-size: 1rem;
}

.timer-settings {
  margin-bottom: 1rem;
}

.setting-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  font-size: 0.8rem;
}

.setting-group label {
  opacity: 0.8;
}

.setting-group input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  color: white;
  width: 50px;
  text-align: center;
}

.setting-group input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.6);
}

.setting-group input:disabled {
  opacity: 0.5;
}

.pomodoro-count {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  opacity: 0.8;
}

.count-display {
  display: flex;
  gap: 0.2rem;
}

.pomodoro-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.3s ease;
}

.pomodoro-dot.filled {
  background: #ff6b6b;
}

.playlist-settings {
  margin-top: 0;
  padding-top: 0;
}

.playlist-settings .setting-group input {
  width: 140px;
  text-align: left;
  padding: 0.3rem 0.5rem;
}

.platform-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  color: white;
  width: 100px;
  cursor: pointer;
}

.platform-select option {
  background: #333;
  color: white;
}

.playlist-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;
  justify-content: center;
}

.action-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.apply-btn {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
}

.reset-playlist-btn {
  background: rgba(255, 152, 0, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
}

.help-link {
  display: block;
  margin-top: 0.8rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  text-align: center;
  transition: color 0.3s ease;
}

.help-link:hover {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
}

.platform-hint {
  font-size: 0.75rem;
  color: #4ecdc4;
  margin-top: -0.4rem;
  margin-bottom: 0.4rem;
  text-align: right;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
}

.tab-btn:hover {
  color: rgba(255, 255, 255, 0.9);
}

.tab-btn.active {
  color: white;
  border-bottom-color: #4ecdc4;
}

.playlist-container {
  padding: 1.5rem;
  color: white;
}

/* 服务器选择面板样式 */
.server-panel-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1003;
}

.server-panel {
  min-width: 320px;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(30px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.server-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.3s;
  line-height: 1;
}

.close-btn:hover {
  opacity: 1;
}

.server-list {
  max-height: 300px;
  overflow-y: auto;
}

.server-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  cursor: pointer;
  transition: background 0.3s ease;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.server-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.server-item.active {
  background: rgba(76, 175, 80, 0.2);
  border-left: 3px solid #4caf50;
  padding-left: calc(0.8rem - 3px);
}

.server-info {
  flex: 1;
}

.server-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.server-desc {
  font-size: 0.85rem;
  opacity: 0.7;
  line-height: 1.3;
}

.server-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.status-badge {
  background: rgba(76, 175, 80, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
}

.latency {
  font-size: 0.75rem;
  opacity: 0.8;
}

.custom-server-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.custom-url-input {
  flex: 1;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
}

.custom-url-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.apply-btn {
  padding: 0.5rem 1rem;
  background: rgba(76, 175, 80, 0.3);
  border: 1px solid rgba(76, 175, 80, 0.5);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.apply-btn:hover {
  background: rgba(76, 175, 80, 0.5);
}

.server-panel-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.auto-fallback-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.auto-fallback-label input[type="checkbox"] {
  cursor: pointer;
}

/* 淡入淡出动画 */
.fade-down-enter-active, .fade-down-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-down-enter-from, .fade-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.fade-down-enter-to, .fade-down-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

</style>
