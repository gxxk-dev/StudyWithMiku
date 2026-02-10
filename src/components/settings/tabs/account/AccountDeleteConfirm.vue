<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="isOpen" class="overlay" @click.self="$emit('close')">
        <div class="confirm-modal">
          <h3>确认删除设备?</h3>
          <p class="message">
            删除设备 "{{ deviceName }}" 后，您将无法使用该设备自动登录。
            <br />
            如果是当前设备，您将需要重新登录。
          </p>

          <div class="actions">
            <button class="btn-cancel" @click="$emit('close')">取消</button>
            <button class="btn-delete" :disabled="isLoading" @click="handleConfirm">
              <Icon v-if="isLoading" icon="eos-icons:loading" />
              <span v-else>删除</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  isOpen: Boolean,
  deviceName: {
    type: String,
    default: ''
  },
  isLoading: Boolean
})

const emit = defineEmits(['close', 'confirm'])

const handleConfirm = () => {
  emit('confirm')
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-modal {
  background: #2c3e50;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

h3 {
  margin: 0 0 12px;
  font-size: 1.2rem;
  color: white;
}

.message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-delete {
  background: #e74c3c;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-delete:hover:not(:disabled) {
  background: #c0392b;
}

.btn-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
