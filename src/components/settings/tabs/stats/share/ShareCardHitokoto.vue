<script setup>
/**
 * 分享卡片 - 一言组件
 */

import { Icon } from '@iconify/vue'

defineProps({
  /**
   * 一言数据
   */
  hitokoto: {
    type: Object,
    default: null
  },
  /**
   * 加载状态
   */
  loading: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="hitokoto-section">
    <div v-if="loading" class="hitokoto-loading">
      <Icon icon="mdi:loading" width="20" height="20" class="spin" />
    </div>
    <template v-else-if="hitokoto">
      <p class="hitokoto-text">「{{ hitokoto.text }}」</p>
      <p class="hitokoto-from">—— {{ hitokoto.from }}</p>
    </template>
  </div>
</template>

<style scoped lang="scss">
.hitokoto-section {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  margin-bottom: 16px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hitokoto-loading {
  display: flex;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
}

.hitokoto-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  margin: 0 0 8px 0;
  text-align: center;
}

.hitokoto-from {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  text-align: right;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
