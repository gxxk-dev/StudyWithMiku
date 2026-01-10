<template>
  <div class="timer-controls">
    <button
      v-if="!isRunning"
      class="control-btn start-btn"
      @click="$emit('start')"
      :disabled="disabled"
    >
      <span class="btn-icon">▶</span>
    </button>
    <button
      v-else
      class="control-btn pause-btn"
      @click="$emit('pause')"
    >
      <span class="btn-icon">⏸</span>
    </button>
    <button
      class="control-btn reset-btn"
      @click="$emit('reset')"
    >
      <span class="btn-icon">↺</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  isRunning: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['start', 'pause', 'reset'])
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.timer-controls {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.control-btn {
  @extend .pomodoro-btn;
}

.start-btn {
  @extend .pomodoro-btn--start;
}

.pause-btn {
  @extend .pomodoro-btn--pause;
}

.reset-btn {
  @extend .pomodoro-btn--reset;
}

.btn-icon {
  font-size: 1rem;
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .timer-controls {
    gap: 0.5rem;
    margin-bottom: 0;
  }

  .control-btn {
    padding: 0.5rem 0.7rem;
    font-size: 0.75rem;
  }

  .btn-icon {
    font-size: 0.9rem;
  }
}
</style>
