<template>
  <div class="timer-display" :class="{ 'timer-display--large': size === 'large' }">
    <div class="time-circle">
      <svg class="progress-ring" :width="circleSize" :height="circleSize">
        <circle
          class="progress-ring-background"
          :cx="circleSize / 2"
          :cy="circleSize / 2"
          :r="radius"
          stroke="rgba(255, 255, 255, 0.2)"
          stroke-width="5"
          fill="transparent"
        />
        <circle
          class="progress-ring-fill"
          :class="statusClass"
          :cx="circleSize / 2"
          :cy="circleSize / 2"
          :r="radius"
          stroke="currentColor"
          stroke-width="5"
          fill="transparent"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          :transform="`rotate(-90 ${circleSize / 2} ${circleSize / 2})`"
        />
      </svg>
      <div class="time-text">
        <span class="minutes">{{ formattedMinutes }}</span>
        <span class="separator">:</span>
        <span class="seconds">{{ formattedSeconds }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  timeLeft: {
    type: Number,
    required: true
  },
  totalTime: {
    type: Number,
    required: true
  },
  statusClass: {
    type: String,
    default: 'focus'
  },
  size: {
    type: String,
    default: 'normal', // 'normal' | 'large'
    validator: (value) => ['normal', 'large'].includes(value)
  }
})

const formattedMinutes = computed(() => {
  return Math.floor(props.timeLeft / 60).toString().padStart(2, '0')
})

const formattedSeconds = computed(() => {
  return (props.timeLeft % 60).toString().padStart(2, '0')
})

// 计算圆形尺寸和半径
const circleSize = computed(() => props.size === 'large' ? 200 : 120)
const radius = computed(() => props.size === 'large' ? 90 : 54)

const circumference = computed(() => {
  return 2 * Math.PI * radius.value
})

const strokeDashoffset = computed(() => {
  const progress = (props.totalTime - props.timeLeft) / props.totalTime
  return circumference.value * (1 - progress)
})
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.timer-display {
  margin-bottom: 1.5rem;

  &.timer-display--large {
    margin-bottom: 2rem;
  }
}

.time-circle {
  position: relative;
  display: inline-block;
}

.progress-ring {
  display: block;
}

.progress-ring-fill {
  transition: stroke-dashoffset 0.3s ease;

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

.time-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: 300;
  font-family: 'Courier New', monospace;
  color: white;

  // 默认尺寸
  font-size: 1.8rem;

  // 大尺寸模式
  .timer-display--large & {
    font-size: 2.8rem;
  }
}

// 响应式
@media (max-width: 768px) {
  .timer-display--large {
    .time-circle svg {
      width: 180px !important;
      height: 180px !important;
    }

    .time-text {
      font-size: 2.4rem;
    }
  }
}

@media (max-width: 480px) {
  .timer-display--large {
    .time-circle svg {
      width: 150px !important;
      height: 150px !important;
    }

    .time-text {
      font-size: 2rem;
    }
  }
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .timer-display--large {
    margin-bottom: 0;
    margin-top: 0;

    .time-circle {
      transform: scale(0.6);
      transform-origin: center;
      // 缩小后调整实际占用空间：200px * 0.6 = 120px，需要减少 80px
      margin: -40px 0; // 上下各减少 40px
    }

    .time-text {
      font-size: 2.8rem; // 保持原始字体大小，由 scale 统一缩放
    }
  }

  // 超小屏
  @media (max-width: 667px) {
    .timer-display--large {
      .time-circle {
        transform: scale(0.5);
        // 200px * 0.5 = 100px，需要减少 100px
        margin: -50px 0;
      }
    }
  }

  // 大屏
  @media (min-width: 901px) {
    .timer-display--large {
      .time-circle {
        transform: scale(0.7);
        // 200px * 0.7 = 140px，需要减少 60px
        margin: -30px 0;
      }
    }
  }
}
</style>
