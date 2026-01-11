<template>
  <transition name="toast-slide">
    <div v-if="visible" class="toast" :class="[type]" @click="close">
      <div class="toast-content">
        <div class="toast-title">{{ title }}</div>
        <div v-if="message" class="toast-message">{{ message }}</div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'info' },
  title: { type: String, required: true },
  message: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<style scoped lang="scss">
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;

  min-width: 300px;
  max-width: 500px;
  padding: 1rem 1.5rem;

  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;

  color: white;
  cursor: pointer;

  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  &.info {
    background: rgba(52, 152, 219, 0.2);
    border-color: rgba(52, 152, 219, 0.4);
  }

  &.success {
    background: rgba(46, 204, 113, 0.2);
    border-color: rgba(46, 204, 113, 0.4);
  }

  &.error {
    background: rgba(231, 76, 60, 0.2);
    border-color: rgba(231, 76, 60, 0.4);
  }
}

.toast-content {
  text-align: center;
}

.toast-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.toast-message {
  font-size: 0.9rem;
  opacity: 0.9;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

@media (max-width: 480px) {
  .toast {
    min-width: 280px;
    max-width: 90%;
  }
}
</style>
