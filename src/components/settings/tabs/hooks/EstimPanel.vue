<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useCoyote } from '../../../../composables/useCoyote.js'
import { COYOTE_STORAGE_KEYS } from '../../../../composables/coyote/constants.js'
import { safeLocalStorageGet, safeLocalStorageSet } from '../../../../utils/storage.js'
import CoyoteConnectionPanel from '../coyote/CoyoteConnectionPanel.vue'
import CoyoteStrengthPanel from '../coyote/CoyoteStrengthPanel.vue'

const { settings, updateSettings } = useCoyote()

// 风险确认状态
const confirmed = ref(safeLocalStorageGet(COYOTE_STORAGE_KEYS.CONFIRMED) === 'true')

const handleConfirm = () => {
  safeLocalStorageSet(COYOTE_STORAGE_KEYS.CONFIRMED, 'true')
  confirmed.value = true
}

// 安全设置
const maxStrengthPercent = computed(() => (settings.value.maxStrength / 200) * 100)

const maxStrengthColor = computed(() => {
  const v = settings.value.maxStrength
  if (v <= 60) return '#4caf50'
  if (v <= 120) return '#f59e0b'
  return '#ef4444'
})

const handleMaxStrength = (e) => {
  updateSettings({ maxStrength: Math.round(Number(e.target.value)) })
}

const handleServerUrl = (url) => {
  updateSettings({ serverUrl: url })
}
</script>

<template>
  <div class="estim-section">
    <h3 class="section-title">
      <Icon icon="lucide:zap" width="18" height="18" />
      <span>DG-Lab 电刺激</span>
    </h3>

    <!-- 风险确认 -->
    <div v-if="!confirmed" class="danger-card">
      <div class="danger-icon">
        <Icon icon="lucide:alert-triangle" width="28" height="28" />
      </div>
      <p class="danger-text">
        电刺激设备使用不当可能导致严重身体伤害。<br />
        请确认已阅读 DG-Lab App 安全须知。
      </p>
      <button class="action-btn danger-confirm" @click="handleConfirm">我已了解风险，继续</button>
    </div>

    <!-- 确认后显示 -->
    <template v-if="confirmed">
      <CoyoteConnectionPanel
        :server-url="settings.serverUrl"
        @update:server-url="handleServerUrl"
      />

      <!-- 最大强度 -->
      <div class="setting-item">
        <div class="setting-header">
          <span class="setting-label">最大强度</span>
          <span class="setting-value" :style="{ color: maxStrengthColor }">
            {{ settings.maxStrength }} / 200
          </span>
        </div>
        <input
          type="range"
          class="slider strength-slider"
          min="0"
          max="200"
          step="1"
          :value="settings.maxStrength"
          :style="{
            '--fill': maxStrengthPercent + '%',
            '--fill-color': maxStrengthColor
          }"
          @input="handleMaxStrength"
        />
        <p class="setting-hint">强度上限，所有动作不超过此值</p>
      </div>

      <CoyoteStrengthPanel />
    </template>
  </div>
</template>

<style scoped>
.estim-section {
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

.setting-item {
  margin-bottom: 16px;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setting-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
}

.setting-value {
  font-size: 0.85rem;
  font-weight: 500;
}

.setting-hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 6px 0 0;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.strength-slider {
  background: linear-gradient(
    to right,
    var(--fill-color, #39c5bb) 0%,
    var(--fill-color, #39c5bb) var(--fill, 0%),
    rgba(255, 255, 255, 0.15) var(--fill, 0%),
    rgba(255, 255, 255, 0.15) 100%
  );
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--fill-color, #39c5bb);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: var(--fill-color, #39c5bb);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
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
