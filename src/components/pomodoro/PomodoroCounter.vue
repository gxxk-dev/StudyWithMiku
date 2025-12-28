<template>
  <div class="pomodoro-count">
    <span class="count-label">已完成番茄:</span>
    <div class="count-display">
      <span
        v-for="i in total"
        :key="`pomodoro-dot-${i}`"
        class="pomodoro-dot"
        :class="{ filled: completed >= i }"
      ></span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  completed: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 4
  }
})
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.pomodoro-count {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  opacity: 0.8;
  color: white;
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

  &.filled {
    background: $color-focus;
  }
}
</style>
