<template>
  <div class="pomodoro-tab">
    <!-- 横屏左侧区域 -->
    <div class="pomodoro-left">
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

      <!-- 番茄钟计数 -->
      <PomodoroCounter
        :completed="completedPomodoros"
        :total="4"
      />
    </div>

    <!-- 横屏右侧区域 -->
    <div class="pomodoro-right">
      <!-- 今日数据概览 -->
      <TodayOverview />

      <!-- 时长设置 -->
      <TimerSettings
        :focus-duration="focusDuration"
        :break-duration="breakDuration"
        :disabled="isRunning"
        @update:focus-duration="$emit('update:focus-duration', $event)"
        @update:break-duration="$emit('update:break-duration', $event)"
      />

      <!-- 查看详细统计按钮 -->
      <button class="view-stats-btn" @click="showStatistics = true">
        📊 查看详细统计
      </button>
    </div>

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

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .pomodoro-tab {
    display: flex;
    gap: 1rem;
    height: 100%;
    padding-bottom: 0;
  }

  .pomodoro-left {
    flex: 0 0 47%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start; // 改为顶部对齐，避免居中裁剪
    align-items: center;
    gap: 0.8rem; // 减小间距
    padding: 1rem 0; // 添加上下内边距
    overflow-y: auto; // 允许滚动，以防内容过多

    // 确保所有子元素不被压缩
    > * {
      flex-shrink: 0;
    }

    // 自定义滚动条
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }
  }

  .pomodoro-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    overflow-y: auto; // 添加滚动支持
    padding: 1rem 0;

    // 确保所有子元素不被压缩
    > * {
      flex-shrink: 0;
    }
  }

  .status-indicator {
    margin-bottom: 0;
  }

  .status-text {
    font-size: 0.85rem;
    padding: 0.4rem 0.8rem;
  }

  // 超小屏调整
  @media (max-width: 667px) {
    .pomodoro-left {
      flex: 0 0 43%;
      gap: 0.6rem; // 进一步减小间距
    }

    .status-text {
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
    }
  }

  // 大屏调整
  @media (min-width: 901px) {
    .pomodoro-left {
      flex: 0 0 48%;
      gap: 1rem;
    }
  }
}
</style>
