<template>
  <div class="notification-container">
    <TransitionGroup name="notification-slide">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification"
        :class="[notification.type]"
        @click="remove(notification.id)"
      >
        <Icon :icon="getIcon(notification.type)" class="notification-icon" />
        <div class="notification-content">
          <div class="notification-title">{{ notification.title }}</div>
          <div v-if="notification.message" class="notification-message">
            {{ notification.message }}
          </div>
        </div>
        <button class="notification-close" @click.stop="remove(notification.id)">
          <Icon icon="mdi:close" />
        </button>
        <!-- 进度条：显示剩余时间 -->
        <div
          v-if="notification.duration > 0"
          class="notification-progress"
          :class="[notification.type]"
          :style="getProgressStyle(notification)"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  notifications: { type: Array, required: true }
})

const emit = defineEmits(['remove'])

const remove = (id) => {
  emit('remove', id)
}

const getIcon = (type) => {
  const icons = {
    info: 'mdi:information-outline',
    success: 'mdi:check-circle-outline',
    error: 'mdi:alert-circle-outline'
  }
  return icons[type] || icons.info
}

/**
 * 获取进度条样式
 * 使用 CSS 动画从 100% 宽度缩减到 0%
 */
const getProgressStyle = (notification) => {
  return {
    animationDuration: `${notification.duration}ms`
  }
}
</script>

<style scoped lang="scss">
.notification-container {
  position: fixed;
  top: 70px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  overflow: hidden;

  min-width: 280px;
  max-width: 360px;
  padding: 12px 16px;
  padding-bottom: 16px;

  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  color: white;
  cursor: pointer;
  pointer-events: auto;

  &.info {
    border-left: 3px solid #3498db;
    .notification-icon {
      color: #3498db;
    }
  }

  &.success {
    border-left: 3px solid #2ecc71;
    .notification-icon {
      color: #2ecc71;
    }
  }

  &.error {
    border-left: 3px solid #e74c3c;
    .notification-icon {
      color: #e74c3c;
    }
  }
}

.notification-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
}

.notification-message {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-top: 4px;
  line-height: 1.4;
}

// 进度条 - 显示剩余时间
.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: rgba(255, 255, 255, 0.3);
  transform-origin: left;
  animation: progress-shrink linear forwards;

  &.info {
    background: #3498db;
  }
  &.success {
    background: #2ecc71;
  }
  &.error {
    background: #e74c3c;
  }
}

@keyframes progress-shrink {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.notification-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  margin: -4px -4px -4px 0;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
}

// 动画：从右侧滑入
.notification-slide-enter-active,
.notification-slide-leave-active {
  transition: all 0.3s ease;
}

.notification-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

// 列表项移动动画
.notification-slide-move {
  transition: transform 0.3s ease;
}
</style>
