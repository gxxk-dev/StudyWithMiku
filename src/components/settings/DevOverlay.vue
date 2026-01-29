<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  title: {
    type: String,
    default: '即将推出'
  },
  subtitle: {
    type: String,
    default: '此功能UI界面正在开发中...'
  },
  icon: {
    type: String,
    default: 'mdi:hammer-wrench'
  }
})
</script>

<template>
  <div class="dev-overlay">
    <div class="dev-content">
      <Icon :icon="icon" width="48" height="48" />
      <span class="dev-text">{{ title }}</span>
      <span class="dev-subtext">{{ subtitle }}</span>
    </div>
  </div>
</template>

<style scoped>
.dev-overlay {
  position: absolute;
  inset: 0;
  background: rgba(20, 25, 30, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.dev-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.dev-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #39c5bb;
}

.dev-subtext {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
