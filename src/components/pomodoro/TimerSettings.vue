<template>
  <div class="timer-settings">
    <h4 class="settings-title">时长设置</h4>
    <div class="settings-inputs">
      <div class="setting-group">
        <label>专注时间(分钟)</label>
        <input
          type="number"
          :value="focusDuration"
          min="1"
          max="60"
          :disabled="disabled"
          @input="$emit('update:focusDuration', Number($event.target.value))"
        />
      </div>
      <div class="setting-group">
        <label>休息时间(分钟)</label>
        <input
          type="number"
          :value="breakDuration"
          min="1"
          max="30"
          :disabled="disabled"
          @input="$emit('update:breakDuration', Number($event.target.value))"
        />
      </div>
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.settings-title {
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.8rem 0;
  opacity: 0.9;
}

.settings-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.setting-group {
  @extend .pomodoro-setting-group;

  input {
    @extend .pomodoro-input;
    width: 50px;
    text-align: center;
  }
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .timer-settings {
    padding: 0.8rem;
    margin-bottom: 0;
  }

  .settings-title {
    font-size: 0.8rem;
    margin-bottom: 0.6rem;
  }

  .settings-inputs {
    display: flex;
    flex-direction: row;
    gap: 1rem;
  }

  .setting-group {
    flex: 1;
    margin-bottom: 0;
    font-size: 0.75rem;

    label {
      font-size: 0.75rem;
    }

    input {
      width: 45px;
      font-size: 0.75rem;
      padding: 0.25rem 0.4rem;
    }
  }

  // 超小屏纵向堆叠
  @media (max-width: 667px) {
    .settings-inputs {
      flex-direction: column;
      gap: 0.5rem;
    }

    .setting-group input {
      width: 40px;
    }
  }
}
</style>
