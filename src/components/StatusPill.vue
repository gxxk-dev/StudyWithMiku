<template>
  <transition name="pill-slide">
    <div
      v-show="showControls && !modalOpen"
      class="status-display"
      @click="$emit('open-focus-summary')"
      @mouseenter="$emit('mouseenter')"
      @mouseleave="$emit('mouseleave')"
    >
      <!-- 在线人数 -->
      <div class="online-indicator">
        <span class="online-dot" :class="{ connected: isConnected }"></span>
        <span class="online-text">{{ onlineCount }}</span>
      </div>

      <span class="status-divider"></span>

      <!-- 系统时间 -->
      <div class="system-time">{{ currentTime }}</div>

      <span class="status-divider"></span>

      <!-- 倒计时 -->
      <div class="clock-display">
        <span class="minutes">{{ formattedMinutes }}</span>
        <span class="separator">:</span>
        <span class="seconds">{{ formattedSeconds }}</span>
      </div>

      <span class="status-divider"></span>

      <!-- 状态徽章 - 点击暂停/继续，休息时长按跳过 -->
      <div
        class="status-badge"
        :class="[modeClass, statusBadgeClass]"
        @click.stop="toggleTimer"
        @pointerdown="handlePointerDown"
        @pointerup="handlePointerUp"
        @pointerleave="handlePointerLeave"
      >
        {{ statusText }}
      </div>

      <span class="status-divider"></span>

      <!-- 设置图标 -->
      <div class="settings-icon" @click.stop="$emit('open-settings')">
        <Icon icon="lucide:settings" width="18" height="18" />
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus, FocusMode } from '../composables/useFocus.js'
import { onlineServer } from '../services/onlineServer.js'
import { getConfig } from '../services/runtimeConfig.js'

defineProps({
  showControls: {
    type: Boolean,
    default: true
  },
  modalOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['open-settings', 'open-focus-summary', 'mouseenter', 'mouseleave'])

// 在线人数
const onlineCount = onlineServer.onlineCount
const isConnected = computed(() => onlineServer.connectionStatus.value === 'connected')

// 番茄钟状态
const { mode, remaining, isRunning, isPaused, isIdle, start, pause, resume, skip } = useFocus()

// 长按跳过休息
const LONG_PRESS_DURATION = 800
let longPressTimer = null
let isLongPress = false

// 是否处于休息阶段
const isBreakMode = computed(() => {
  return mode.value === FocusMode.SHORT_BREAK || mode.value === FocusMode.LONG_BREAK
})

const handlePointerDown = () => {
  isLongPress = false
  // 仅在休息阶段启用长按跳过
  if (isBreakMode.value && !isIdle.value) {
    longPressTimer = setTimeout(() => {
      isLongPress = true
      skip()
    }, LONG_PRESS_DURATION)
  }
}

const handlePointerUp = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const handlePointerLeave = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

// 当前时间
const currentTime = ref('')
let timeInterval = null

const updateCurrentTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
}

onMounted(() => {
  updateCurrentTime()
  timeInterval = setInterval(
    updateCurrentTime,
    getConfig('UI_CONFIG', 'TIME_DISPLAY_UPDATE_INTERVAL')
  )
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
})

// 格式化剩余时间
const formattedMinutes = computed(() => {
  const totalSeconds = remaining.value
  return Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
})

const formattedSeconds = computed(() => {
  const totalSeconds = remaining.value
  return (totalSeconds % 60).toString().padStart(2, '0')
})

// 模式标签
const modeLabel = computed(() => {
  switch (mode.value) {
    case FocusMode.FOCUS:
      return '专注'
    case FocusMode.SHORT_BREAK:
      return '短休'
    case FocusMode.LONG_BREAK:
      return '长休'
    default:
      return '专注'
  }
})

// 模式样式类
const modeClass = computed(() => {
  switch (mode.value) {
    case FocusMode.FOCUS:
      return 'focus'
    case FocusMode.SHORT_BREAK:
      return 'break'
    case FocusMode.LONG_BREAK:
      return 'long-break'
    default:
      return 'focus'
  }
})

// 状态徽章额外样式类（暂停时）
const statusBadgeClass = computed(() => {
  return isPaused.value ? 'paused' : ''
})

// 状态文字
const statusText = computed(() => {
  if (isPaused.value) return '暂停'
  return modeLabel.value
})

// 点击状态徽章切换计时器
const toggleTimer = () => {
  // 长按后不触发点击
  if (isLongPress) {
    isLongPress = false
    return
  }
  if (isIdle.value) {
    start()
  } else if (isRunning.value) {
    pause()
  } else if (isPaused.value) {
    resume()
  }
}
</script>

<style scoped lang="scss">
$color-focus: #ff6b6b;
$color-break: #4ecdc4;
$color-long-break: #45b7d1;
$color-paused: #ffc107;
$color-success: #4caf50;

$glass-bg: rgba(255, 255, 255, 0.1);
$glass-bg-hover: rgba(255, 255, 255, 0.15);
$glass-border: rgba(255, 255, 255, 0.2);

.status-display {
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
  user-select: none;

  &:hover {
    background: $glass-bg-hover;
    transform: translateX(-50%) translateY(-2px);
  }
}

.status-divider {
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
  padding: 0.3rem 0.8rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
  background: $glass-bg;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
    opacity: 0.8;
  }

  &:active {
    transform: scale(0.98);
  }

  &.focus {
    color: $color-focus;
  }

  &.break {
    color: $color-break;
  }

  &.long-break {
    color: $color-long-break;
  }

  &.paused {
    color: $color-paused;
  }
}

.settings-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
  padding: 0.2rem;
  border-radius: 4px;

  &:hover {
    color: rgba(255, 255, 255, 1);
    background: rgba(255, 255, 255, 0.1);
  }
}

// 响应式
@media (max-width: 600px) {
  .status-display {
    padding: 0.6rem 1rem;
    gap: 0.8rem;
  }

  .clock-display {
    font-size: 1.2rem;
  }

  .online-indicator,
  .online-indicator + .status-divider,
  .system-time,
  .system-time + .status-divider {
    display: none;
  }
}
</style>
