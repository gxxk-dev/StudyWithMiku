<template>
  <div class="pomodoro-tab">
    <!-- 今日数据概览 -->
    <TodayOverview />

    <!-- 状态指示 -->
    <div class="status-indicator">
      <span class="status-text" :class="statusClass">{{ statusText }}</span>
    </div>

    <!-- 大号计时器 -->
    <TimerDisplay
      size="large"
      :time-left="timeLeft"
      :total-time="totalTime"
      :status-class="statusClass"
    />

    <!-- 控制按钮 -->
    <TimerControls
      :is-running="isRunning"
      :disabled="timeLeft <= 0"
      @start="$emit('timer-start')"
      @pause="$emit('timer-pause')"
      @reset="$emit('timer-reset')"
    />

    <!-- 时长设置 -->
    <TimerSettings
      :focus-duration="focusDuration"
      :break-duration="breakDuration"
      :disabled="isRunning"
      @update:focus-duration="$emit('update:focus-duration', $event)"
      @update:break-duration="$emit('update:break-duration', $event)"
    />

    <!-- 番茄钟计数 -->
    <PomodoroCounter
      :completed="completedPomodoros"
      :total="4"
    />

    <!-- 查看详细统计按钮 -->
    <button class="view-stats-btn" @click="showStatistics = true">
      📊 查看详细统计
    </button>

    <!-- 统计占位符模态框（使用 Teleport 传送到 body） -->
    <Teleport to="body">
      <StatisticsPlaceholder
        :visible="showStatistics"
        @close="showStatistics = false"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TodayOverview from '../TodayOverview.vue'
import TimerDisplay from '../../pomodoro/TimerDisplay.vue'
import TimerControls from '../../pomodoro/TimerControls.vue'
import TimerSettings from '../../pomodoro/TimerSettings.vue'
import PomodoroCounter from '../../pomodoro/PomodoroCounter.vue'
import StatisticsPlaceholder from '../StatisticsPlaceholder.vue'

const props = defineProps({
  focusDuration: { type: Number, required: true },
  breakDuration: { type: Number, required: true },
  timeLeft: { type: Number, required: true },
  isRunning: { type: Boolean, required: true },
  completedPomodoros: { type: Number, required: true },
  formattedMinutes: { type: String, required: true },
  formattedSeconds: { type: String, required: true },
  statusText: { type: String, required: true },
  statusClass: { type: String, required: true },
  totalTime: { type: Number, required: true }
})

defineEmits([
  'timer-start',
  'timer-pause',
  'timer-reset',
  'update:focus-duration',
  'update:break-duration'
])

// 统计模态框显示状态
const showStatistics = ref(false)
</script>

<style scoped lang="scss">
@use '../../../styles/settings.scss' as *;
@use '../../../styles/pomodoro.scss' as *;

.pomodoro-tab {
  text-align: center;
  padding-bottom: 1rem;
}

.status-indicator {
  margin-bottom: 1.5rem;
}

.status-text {
  font-size: 1rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: $glass-bg;
  display: inline-block;

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
</style>
