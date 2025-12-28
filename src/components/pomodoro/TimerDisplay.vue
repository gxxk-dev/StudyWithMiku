<template>
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
  }
})

const formattedMinutes = computed(() => {
  return Math.floor(props.timeLeft / 60).toString().padStart(2, '0')
})

const formattedSeconds = computed(() => {
  return (props.timeLeft % 60).toString().padStart(2, '0')
})

const circumference = computed(() => 2 * Math.PI * 54)

const strokeDashoffset = computed(() => {
  const progress = (props.totalTime - props.timeLeft) / props.totalTime
  return circumference.value * (1 - progress)
})
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

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
  font-size: 1.8rem;
  font-weight: 300;
  font-family: 'Courier New', monospace;
  color: white;
}
</style>
