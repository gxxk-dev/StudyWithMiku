<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { providerRegistry } from '../../../composables/hooks/providerRegistry.js'
import ProviderStatus from './hooks/ProviderStatus.vue'
import HookList from './hooks/HookList.vue'
import EstimPanel from './hooks/EstimPanel.vue'

const hasEstim = computed(() => providerRegistry.has('estim'))
</script>

<template>
  <div class="tab-content">
    <!-- Provider 状态 -->
    <div class="settings-section">
      <h3 class="section-title">
        <Icon icon="lucide:webhook" width="18" height="18" />
        <span>钩子</span>
      </h3>
      <p class="section-desc">钩子会在番茄钟状态变化时自动执行动作（如发送通知、播放提示音）。</p>
      <ProviderStatus />
    </div>

    <!-- 通用 Hook 列表 -->
    <div class="settings-section">
      <HookList />
    </div>

    <!-- Estim 专属面板（仅解锁后显示） -->
    <EstimPanel v-if="hasEstim" />
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 16px;
  line-height: 1.4;
}
</style>
