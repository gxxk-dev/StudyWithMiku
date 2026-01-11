<template>
  <transition name="fade">
    <div v-if="visible" class="statistics-overlay" @click.self="$emit('close')">
      <div class="statistics-panel">
        <!-- 头部 -->
        <div class="stats-header">
          <h2>
            <Icon icon="lucide:bar-chart-3" inline />
            专注统计
          </h2>
          <button class="close-btn" @click="$emit('close')">
            <Icon icon="mdi:close" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="stats-content">
          <div class="dev-notice">
            <div class="notice-icon">
              <Icon icon="mdi:alert-circle-outline" width="64" height="64" />
            </div>
            <h3>功能开发中</h3>
            <p>专注统计功能正在开发，敬请期待！</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.statistics-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: $overlay-bg;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; // 高于设置面板
  padding: 1rem;
}

.statistics-panel {
  @include glass-panel;
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid $glass-border;

  h2 {
    color: white;
    margin: 0;
    font-size: 1.3rem;
  }

  .close-btn {
    @extend .pomodoro-close-btn;
  }
}

.stats-content {
  padding: 1.5rem;
  color: white;
}

// 开发中提示
.dev-notice {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(255, 193, 7, 0.1);
  border: 2px dashed rgba(255, 193, 7, 0.3);
  border-radius: $radius-lg;

  .notice-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
  }

  h3 {
    color: #ffc107;
    margin: 0 0 1rem;
    font-size: 1.8rem;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-size: 1rem;
  }
}

// 响应式
@media (max-width: 480px) {
  .statistics-panel {
    width: 95%;
    max-height: 85vh;
  }

  .stats-header h2 {
    font-size: 1.1rem;
  }

  .stats-content {
    padding: 1rem;
  }

  .dev-notice {
    padding: 2rem 1rem;

    .notice-icon {
      font-size: 3rem;
    }

    h3 {
      font-size: 1.3rem;
    }

    p {
      font-size: 0.9rem;
    }
  }
}

// 动画
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
