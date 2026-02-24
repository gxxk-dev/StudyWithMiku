<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useCoyote } from '../../../composables/useCoyote.js'
import { COYOTE_STORAGE_KEYS } from '../../../composables/coyote/constants.js'
import { safeLocalStorageGet, safeLocalStorageSet } from '../../../utils/storage.js'
import CoyoteConnectionPanel from './coyote/CoyoteConnectionPanel.vue'
import CoyoteHookList from './coyote/CoyoteHookList.vue'
import CoyoteStrengthPanel from './coyote/CoyoteStrengthPanel.vue'

const emit = defineEmits(['navigate'])

const { settings, updateSettings } = useCoyote()

// 风险确认状态
const confirmed = ref(safeLocalStorageGet(COYOTE_STORAGE_KEYS.CONFIRMED) === 'true')

const handleConfirm = () => {
  safeLocalStorageSet(COYOTE_STORAGE_KEYS.CONFIRMED, 'true')
  confirmed.value = true
}

const handleCancel = () => {
  emit('navigate', 'about')
}

// 安全设置
const maxStrengthPercent = computed(() => (settings.value.maxStrength / 200) * 100)

const maxStrengthColor = computed(() => {
  const v = settings.value.maxStrength
  if (v <= 60) return '#4caf50'
  if (v <= 120) return '#f59e0b'
  return '#ef4444'
})

const handleEnabledToggle = (e) => {
  updateSettings({ enabled: e.target.checked })
}

const handleMaxStrength = (e) => {
  updateSettings({ maxStrength: Math.round(Number(e.target.value)) })
}

const handleServerUrl = (url) => {
  updateSettings({ serverUrl: url })
}
</script>

<template>
  <div class="tab-content">
    <!-- 风险确认遮罩 -->
    <div v-if="!confirmed" class="danger-overlay">
      <div class="danger-card">
        <div class="danger-icon">
          <Icon icon="lucide:alert-triangle" width="40" height="40" />
        </div>
        <h3 class="danger-title">危险 / DANGER</h3>

        <div class="danger-body">
          <p>此功能用于连接 DG-Lab 郊狼电刺激设备。</p>
          <p>电刺激设备使用不当可能导致严重身体伤害。<br />在继续之前，请务必：</p>
          <ul>
            <li>仔细阅读 DG-Lab App 中的安全须知与使用说明</li>
            <li>了解设备的安全强度范围及紧急停止方式</li>
            <li>确认自身无心脏疾病、癫痫等禁忌症</li>
          </ul>
          <p class="danger-disclaimer">
            <strong>AT YOUR OWN RISK. / 风险自负。</strong><br />
            开发者不对任何因使用本功能造成的伤害承担责任。
          </p>
        </div>

        <div class="danger-buttons">
          <button class="action-btn primary" @click="handleConfirm">
            我已阅读安全信息并了解风险，继续
          </button>
          <button class="action-btn" @click="handleCancel">取消</button>
        </div>
      </div>
    </div>

    <!-- 主内容（确认后显示） -->
    <template v-if="confirmed">
      <!-- 连接管理 -->
      <CoyoteConnectionPanel
        :server-url="settings.serverUrl"
        @update:server-url="handleServerUrl"
      />

      <!-- 安全设置 -->
      <div class="settings-section">
        <h3 class="section-title">
          <Icon icon="lucide:shield" width="18" height="18" />
          <span>安全设置</span>
        </h3>

        <!-- 启用开关 -->
        <div class="setting-item row">
          <span class="setting-label">启用钩子</span>
          <label class="toggle">
            <input type="checkbox" :checked="settings.enabled" @change="handleEnabledToggle" />
            <span class="toggle-slider" />
          </label>
        </div>

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
      </div>

      <!-- 钩子管理 -->
      <CoyoteHookList />

      <!-- 实时状态 -->
      <CoyoteStrengthPanel />
    </template>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
}

/* 风险确认 */
.danger-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.danger-card {
  max-width: 500px;
  padding: 28px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  text-align: center;
}

.danger-icon {
  color: #ef4444;
  margin-bottom: 12px;
}

.danger-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ef4444;
  margin: 0 0 16px;
}

.danger-body {
  text-align: left;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.danger-body p {
  margin: 0 0 10px;
}

.danger-body ul {
  margin: 0 0 10px;
  padding-left: 20px;
}

.danger-body li {
  margin-bottom: 4px;
}

.danger-disclaimer {
  margin-top: 14px;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
}

.danger-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

/* Settings sections */
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
  margin: 0 0 16px 0;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

/* Slider */
.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: background 0.1s ease;
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
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
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

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  transition: background 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.toggle input:checked + .toggle-slider {
  background: #39c5bb;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: #fff;
}

/* Action buttons */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn.primary {
  background: rgba(57, 197, 187, 0.15);
  border-color: rgba(57, 197, 187, 0.3);
  color: #39c5bb;
}

.action-btn.primary:hover {
  background: rgba(57, 197, 187, 0.25);
}
</style>
