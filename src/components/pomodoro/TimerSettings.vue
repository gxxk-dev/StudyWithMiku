<template>
  <div class="timer-settings">
    <div class="setting-group">
      <label>专注时间(分钟)</label>
      <input
        type="number"
        :value="focusDuration"
        @input="$emit('update:focusDuration', Number($event.target.value))"
        min="1"
        max="60"
        :disabled="disabled"
      />
    </div>
    <div class="setting-group">
      <label>休息时间(分钟)</label>
      <input
        type="number"
        :value="breakDuration"
        @input="$emit('update:breakDuration', Number($event.target.value))"
        min="1"
        max="30"
        :disabled="disabled"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  focusDuration: {
    type: Number,
    required: true
  },
  breakDuration: {
    type: Number,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:focusDuration', 'update:breakDuration'])
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.timer-settings {
  margin-bottom: 1rem;
}

.setting-group {
  @extend .pomodoro-setting-group;

  input {
    @extend .pomodoro-input;
    width: 50px;
    text-align: center;
  }
}
</style>
