<template>
  <div class="cache-panel">
    <div class="placeholder-section">
      <p class="placeholder-text">🗂️ 缓存管理功能正在开发中</p>
    </div>
  </div>
</template>

<script setup>
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
</style>
