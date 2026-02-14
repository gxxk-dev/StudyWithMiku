<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus, FocusMode } from '../composables/useFocus.js'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}

// ESC 键关闭
const onKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
  }
}

// 获取专注系统状态和方法
const {
  mode,
  remaining,
  progress,
  isRunning,
  isPaused,
  isIdle,
  sessionCount,
  settings,
  start,
  pause,
  resume,
  cancel,
  skip,
  todayStats
} = useFocus()

// 圆环进度偏移 (周长 = 2 * PI * 102)
const circumference = 2 * Math.PI * 102
const strokeDashoffset = computed(() => circumference * (1 - progress.value))

// 番茄槽位数组
const tomatoSlots = computed(() => {
  const total = settings.value.longBreakInterval
  const completed = sessionCount.value % total
  return Array.from({ length: total }, (_, i) => i < completed)
})

// 格式化剩余时间 MM:SS
const formattedTime = computed(() => {
  const mins = Math.floor(remaining.value / 60)
    .toString()
    .padStart(2, '0')
  const secs = (remaining.value % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
})

// 模式标签
const modeLabel = computed(() => {
  switch (mode.value) {
    case FocusMode.FOCUS:
      return '专注'
    case FocusMode.SHORT_BREAK:
      return '短休息'
    case FocusMode.LONG_BREAK:
      return '长休息'
    default:
      return '准备开始'
  }
})

// 状态文字（用于暂停状态）
const statusText = computed(() => {
  if (isPaused.value) return '已暂停'
  return modeLabel.value
})

// 模式样式类
const modeClass = computed(() => {
  if (isPaused.value) return 'paused'
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

// 格式化今日专注时长
const formattedTodayTime = computed(() => {
  const seconds = todayStats.value.totalFocusTime
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${mins}分钟`
  }
  return `${mins}分钟`
})

// 暂停/继续切换
const togglePauseResume = () => {
  if (isRunning.value) {
    pause()
  } else if (isPaused.value) {
    resume()
  } else if (isIdle.value) {
    start()
  }
}

// 取消会话
const handleCancel = () => {
  cancel()
}

// 跳过当前阶段
const handleSkip = () => {
  skip()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="modal-container">
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="close">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>

          <!-- 内容区域 -->
          <div class="modal-content">
            <!-- 模式标签 -->
            <div class="mode-label" :class="modeClass">
              {{ statusText }}
            </div>

            <!-- 圆环计时器 -->
            <div class="timer-ring-container">
              <svg class="timer-ring" width="220" height="220" viewBox="0 0 220 220">
                <!-- 背景轨道 -->
                <circle class="ring-track" cx="110" cy="110" r="102" fill="none" stroke-width="6" />
                <!-- 进度圆环 -->
                <circle
                  class="ring-progress"
                  :class="modeClass"
                  cx="110"
                  cy="110"
                  r="102"
                  fill="none"
                  stroke-width="6"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="strokeDashoffset"
                  stroke-linecap="round"
                />
              </svg>
              <!-- 时间显示 -->
              <div class="ring-content">
                <div class="time-display">
                  {{ formattedTime }}
                </div>
                <!-- 番茄槽位 -->
                <div class="tomato-slots">
                  <Icon
                    v-for="(filled, index) in tomatoSlots"
                    :key="index"
                    :icon="filled ? 'mdi:circle' : 'mdi:circle-outline'"
                    width="8"
                    height="8"
                    :class="['tomato-slot', { filled }]"
                  />
                </div>
              </div>
            </div>

            <!-- 控制按钮区域 -->
            <div class="controls-section">
              <!-- 暂停/继续/开始按钮 -->
              <button
                class="control-btn primary"
                :title="isIdle ? '开始' : isRunning ? '暂停' : '继续'"
                @click="togglePauseResume"
              >
                <Icon :icon="isRunning ? 'mdi:pause' : 'mdi:play'" width="24" height="24" />
              </button>

              <!-- 跳过按钮 -->
              <button
                class="control-btn"
                :class="{ secondary: !isIdle }"
                :disabled="isIdle"
                title="跳过"
                @click="handleSkip"
              >
                <Icon icon="mdi:skip-next" width="24" height="24" />
              </button>

              <!-- 取消按钮 -->
              <button
                class="control-btn danger"
                :disabled="isIdle"
                title="取消"
                @click="handleCancel"
              >
                <Icon icon="mdi:stop" width="24" height="24" />
              </button>
            </div>

            <!-- 今日统计区域 -->
            <div class="stats-section">
              <div class="stat-item">
                <Icon icon="mdi:check-circle-outline" width="18" height="18" />
                <span class="stat-value">{{ todayStats.completedSessions }}</span>
                <span class="stat-label">今日完成</span>
              </div>
              <div class="stat-item">
                <Icon icon="mdi:timer-outline" width="18" height="18" />
                <span class="stat-value">{{ formattedTodayTime }}</span>
                <span class="stat-label">专注时长</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
$color-focus: #ff6b6b;
$color-break: #4ecdc4;
$color-long-break: #45b7d1;
$color-paused: #ffc107;

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-container {
  position: relative;
  width: 90vw;
  max-width: 400px;
  background: rgba(30, 35, 45, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 6px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
}

.modal-content {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

// 模式标签
.mode-label {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 2px;

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

// 圆环计时器
.timer-ring-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-ring {
  transform: rotate(-90deg);
}

.ring-track {
  stroke: rgba(255, 255, 255, 0.1);
}

.ring-progress {
  transition: stroke-dashoffset 0.3s ease;

  &.focus {
    stroke: $color-focus;
  }

  &.break {
    stroke: $color-break;
  }

  &.long-break {
    stroke: $color-long-break;
  }

  &.paused {
    stroke: $color-paused;
  }
}

.ring-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.time-display {
  font-size: 3rem;
  font-weight: 600;
  font-family: var(--font-mono);
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 2px;
}

// 番茄槽位
.tomato-slots {
  display: flex;
  gap: 5px;
}

.tomato-slot {
  color: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;

  &.filled {
    color: $color-focus;
  }
}

// 控制按钮
.controls-section {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &.primary {
    background: rgba(76, 175, 80, 0.9);
    color: white;

    &:hover:not(:disabled) {
      background: rgba(76, 175, 80, 1);
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.9);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25);
    }
  }

  &.danger {
    background: rgba(183, 28, 28, 0.8);
    color: white;

    &:hover:not(:disabled) {
      background: rgba(183, 28, 28, 1);
    }
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

// 今日统计区域
.stats-section {
  display: flex;
  gap: 40px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  width: 100%;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.6);

  .stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .stat-label {
    font-size: 0.75rem;
    opacity: 0.7;
  }
}

// 过渡动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .modal-container {
    transform: scale(0.9);
  }
}

// 响应式 - 使用紧凑布局确保内容完全适配视口
@media (max-width: 480px) {
  .modal-container {
    width: 92vw;
    border-radius: 16px;
  }

  .modal-content {
    padding: 24px 20px;
    gap: 16px;
  }

  .mode-label {
    font-size: 1rem;
  }

  .timer-ring {
    width: 150px;
    height: 150px;
  }

  .time-display {
    font-size: 1.9rem;
  }

  .control-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
  }

  .stats-section {
    gap: 32px;
    padding-top: 14px;
  }

  .stat-item {
    .stat-value {
      font-size: 1.1rem;
    }

    .stat-label {
      font-size: 0.7rem;
    }
  }
}

// 小屏 + 视口高度不足时进一步压缩
@media (max-width: 480px) and (max-height: 700px) {
  .modal-content {
    padding: 20px 16px;
    gap: 12px;
  }

  .timer-ring {
    width: 130px;
    height: 130px;
  }

  .time-display {
    font-size: 1.6rem;
  }

  .control-btn {
    width: 40px;
    height: 40px;
  }

  .stats-section {
    padding-top: 10px;
    gap: 24px;
  }

  .stat-item .stat-value {
    font-size: 1rem;
  }
}

// 超小屏幕 (iPhone SE 等)
@media (max-width: 375px) {
  .modal-content {
    padding: 18px 14px;
    gap: 10px;
  }

  .mode-label {
    font-size: 0.9rem;
  }

  .timer-ring {
    width: 120px;
    height: 120px;
  }

  .time-display {
    font-size: 1.5rem;
  }

  .control-btn {
    width: 38px;
    height: 38px;
  }

  .stats-section {
    gap: 20px;
  }

  .stat-item .stat-value {
    font-size: 0.95rem;
  }
}

// 横屏模式
@media (orientation: landscape) and (max-height: 500px) {
  .modal-content {
    padding: 16px;
    gap: 8px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .mode-label {
    width: 100%;
    text-align: center;
  }

  .timer-ring {
    width: 100px;
    height: 100px;
  }

  .time-display {
    font-size: 1.25rem;
  }

  .controls-section {
    align-self: center;
  }

  .stats-section {
    width: 100%;
    padding-top: 8px;
  }
}
</style>
