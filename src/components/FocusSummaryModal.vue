<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus, FocusMode } from '../composables/useFocus.js'
import DevOverlay from './settings/DevOverlay.vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}

// ESC 键关闭
const onKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="modal-container">
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="close">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>

          <!-- 内容区域 -->
          <div class="modal-content"></div>

          <!-- 开发中占位符 -->
          <DevOverlay title="功能开发中" subtitle="更多控制和状态信息即将推出" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
$color-focus: #ff6b6b;
$color-break: #4ecdc4;
$color-long-break: #45b7d1;
$color-paused: #ffc107;

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-container {
  position: relative;
  width: 90vw;
  max-width: 800px;
  height: 70vh;
  max-height: 500px;
  background: rgba(30, 35, 45, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
}

.modal-content {
  padding: 48px 32px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.time-display {
  font-size: 4rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: white;
  letter-spacing: 4px;
}

.status-badge {
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);

  &.focus {
    color: $color-focus;
    border: 1px solid rgba($color-focus, 0.3);
  }

  &.break {
    color: $color-break;
    border: 1px solid rgba($color-break, 0.3);
  }

  &.long-break {
    color: $color-long-break;
    border: 1px solid rgba($color-long-break, 0.3);
  }

  &.paused {
    color: $color-paused;
    border: 1px solid rgba($color-paused, 0.3);
  }
}

.controls-section {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &.primary {
    background: rgba($color-focus, 0.2);
    border-color: rgba($color-focus, 0.4);
    color: $color-focus;

    &:hover {
      background: rgba($color-focus, 0.3);
    }
  }

  &.danger {
    background: rgba(#e74c3c, 0.2);
    border-color: rgba(#e74c3c, 0.4);
    color: #e74c3c;

    &:hover {
      background: rgba(#e74c3c, 0.3);
    }
  }
}

// 过渡动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .modal-container {
    transform: scale(0.9);
  }
}

// 响应式
@media (max-width: 480px) {
  .modal-container {
    width: 95vw;
    height: 80vh;
    max-height: none;
  }

  .modal-content {
    padding: 40px 20px 24px;
    gap: 24px;
  }

  .time-display {
    font-size: 3rem;
  }

  .control-btn {
    padding: 10px 18px;
    font-size: 0.9rem;
  }
}
</style>
