<template>
  <div class="cache-panel">
    <div class="placeholder-section">
      <p class="placeholder-text">
        <Icon icon="lucide:folder-open" inline />
        缓存管理功能正在开发中
      </p>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineEmits(['cache-clear'])
</script>

<style scoped lang="scss">
.cache-panel {
  .placeholder-section {
    text-align: center;
    padding: 1.5rem;
    background: rgba(96, 125, 139, 0.1);
    border: 2px dashed rgba(96, 125, 139, 0.3);
    border-radius: 8px;
  }

  .placeholder-text {
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
    font-size: 0.95rem;
  }
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .cache-panel {
    height: 100%;

    .placeholder-section {
      padding: 0.8rem;
    }

    .placeholder-text {
      font-size: 0.75rem;
    }
  }
}
</style>
