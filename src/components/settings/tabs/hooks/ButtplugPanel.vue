<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { BUTTPLUG_STORAGE_KEYS } from '../../../../composables/buttplug/constants.js'
import { safeLocalStorageGet, safeLocalStorageSet } from '../../../../utils/storage.js'
import ButtplugConnectionPanel from '../buttplug/ButtplugConnectionPanel.vue'

// 风险确认状态
const confirmed = ref(safeLocalStorageGet(BUTTPLUG_STORAGE_KEYS.CONFIRMED) === 'true')

const handleConfirm = () => {
  safeLocalStorageSet(BUTTPLUG_STORAGE_KEYS.CONFIRMED, 'true')
  confirmed.value = true
}
</script>

<template>
  <div class="buttplug-section">
    <h3 class="section-title">
      <Icon icon="lucide:vibrate" width="18" height="18" />
      <span>Buttplug.io</span>
    </h3>

    <!-- 风险确认 -->
    <div v-if="!confirmed" class="danger-card">
      <div class="danger-icon">
        <Icon icon="lucide:alert-triangle" width="28" height="28" />
      </div>
      <p class="danger-text">
        此功能用于控制外部硬件设备。<br />
        使用不当可能导致不适或伤害，请确保了解所连接设备的安全须知。
      </p>
      <button class="action-btn danger-confirm" @click="handleConfirm">我已了解风险，继续</button>
    </div>

    <!-- 确认后显示 -->
    <template v-if="confirmed">
      <ButtplugConnectionPanel />
    </template>
  </div>
</template>

<style scoped>
.buttplug-section {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 16px 0;
}

.danger-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  text-align: center;
}

.danger-icon {
  color: #ef4444;
}

.danger-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin: 0;
}

.danger-confirm {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.danger-confirm:hover {
  background: rgba(239, 68, 68, 0.2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
</style>
