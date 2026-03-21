<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useButtplug } from '../../../../composables/useButtplug.js'
import { ButtplugConnectionState } from '../../../../composables/buttplug/constants.js'

const {
  connectionState,
  devices,
  selectedDeviceIndex,
  lastError,
  isScanning,
  settings,
  connect,
  disconnect,
  emergencyStop,
  startScanning,
  stopScanning,
  selectDevice,
  updateSettings
} = useButtplug()

const statusConfig = computed(() => {
  switch (connectionState.value) {
    case ButtplugConnectionState.CONNECTED:
      return { color: '#4caf50', label: '已连接', icon: 'lucide:check-circle' }
    case ButtplugConnectionState.SCANNING:
      return { color: '#f59e0b', label: '扫描中...', icon: 'lucide:loader' }
    case ButtplugConnectionState.CONNECTING:
      return { color: '#f59e0b', label: '连接中...', icon: 'lucide:loader' }
    case ButtplugConnectionState.ERROR:
      return { color: '#ef4444', label: '错误', icon: 'lucide:alert-circle' }
    default:
      return { color: '#6b7280', label: '未连接', icon: 'lucide:circle' }
  }
})

const isDisconnected = computed(
  () =>
    connectionState.value === ButtplugConnectionState.DISCONNECTED ||
    connectionState.value === ButtplugConnectionState.ERROR
)
const isConnecting = computed(() => connectionState.value === ButtplugConnectionState.CONNECTING)
const isConnectedOrScanning = computed(
  () =>
    connectionState.value === ButtplugConnectionState.CONNECTED ||
    connectionState.value === ButtplugConnectionState.SCANNING
)

const deviceList = computed(() => [...devices.values()])

const capabilityLabels = {
  vibrate: '振动',
  rotate: '旋转',
  oscillate: '振荡',
  linear: '线性'
}

const handleConnect = () => {
  connect()
}

const handleServerInput = (e) => {
  updateSettings({ serverUrl: e.target.value })
}

const handleSelectDevice = (index) => {
  selectDevice(index)
}
</script>

<template>
  <div class="settings-section">
    <h3 class="section-title">
      <Icon icon="lucide:plug" width="18" height="18" />
      <span>设备连接</span>
    </h3>

    <!-- Intiface Central 地址 -->
    <div class="setting-item">
      <div class="setting-header">
        <span class="setting-label">Intiface Central 地址</span>
      </div>
      <input
        type="text"
        class="text-input"
        :value="settings.serverUrl"
        placeholder="ws://localhost:12345"
        :disabled="!isDisconnected"
        @change="handleServerInput"
      />
      <p class="setting-hint">
        需要运行
        <a
          href="https://intiface.com/central/"
          target="_blank"
          rel="noopener noreferrer"
          class="hint-link"
        >
          Intiface Central
        </a>
        桌面端中转设备连接
      </p>
    </div>

    <!-- 状态 -->
    <div class="setting-item">
      <div class="setting-header">
        <span class="setting-label">状态</span>
        <span class="status-badge" :style="{ color: statusConfig.color }">
          <Icon
            :icon="statusConfig.icon"
            width="14"
            height="14"
            :class="{ spinning: isConnecting || isScanning }"
          />
          {{ statusConfig.label }}
        </span>
      </div>

      <!-- 错误 -->
      <div v-if="lastError" class="status-detail error">
        <span>{{ lastError }}</span>
      </div>
    </div>

    <!-- 设备列表 -->
    <div v-if="deviceList.length > 0" class="setting-item">
      <div class="setting-header">
        <span class="setting-label">设备列表</span>
      </div>
      <div class="device-list">
        <label
          v-for="device in deviceList"
          :key="device.index"
          class="device-card"
          :class="{ selected: selectedDeviceIndex === device.index }"
        >
          <input
            type="radio"
            name="buttplug-device"
            :checked="selectedDeviceIndex === device.index"
            @change="handleSelectDevice(device.index)"
          />
          <div class="device-info">
            <span class="device-name">{{ device.displayName }}</span>
            <div class="device-caps">
              <span v-for="cap in device.capabilities" :key="cap" class="cap-badge">
                {{ capabilityLabels[cap] || cap }}
              </span>
            </div>
          </div>
        </label>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="button-row">
      <button class="action-btn primary" :disabled="!isDisconnected" @click="handleConnect">
        <Icon icon="lucide:plug" width="16" height="16" />
        连接
      </button>
      <button class="action-btn" :disabled="isDisconnected" @click="disconnect">
        <Icon icon="lucide:unplug" width="16" height="16" />
        断开
      </button>
      <button v-if="isConnectedOrScanning && !isScanning" class="action-btn" @click="startScanning">
        <Icon icon="lucide:search" width="16" height="16" />
        扫描设备
      </button>
      <button v-if="isScanning" class="action-btn" @click="stopScanning">
        <Icon icon="lucide:square" width="16" height="16" />
        停止扫描
      </button>
      <button class="action-btn danger" :disabled="isDisconnected" @click="emergencyStop">
        <Icon icon="lucide:octagon" width="16" height="16" />
        紧急停止
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  margin-bottom: 24px;
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

.setting-hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 6px 0 0;
}

.hint-link {
  color: #39c5bb;
  text-decoration: none;
}

.hint-link:hover {
  text-decoration: underline;
}

.text-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  font-family: var(--font-mono);
  outline: none;
  box-sizing: border-box;
}

.text-input:focus {
  border-color: rgba(57, 197, 187, 0.5);
  background: rgba(57, 197, 187, 0.1);
}

.text-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 500;
}

.spinning {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-detail.error {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  font-size: 0.8rem;
  color: #ef4444;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.device-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
}

.device-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.device-card.selected {
  border-color: rgba(57, 197, 187, 0.4);
  background: rgba(57, 197, 187, 0.08);
}

.device-card input[type='radio'] {
  accent-color: #39c5bb;
  margin: 0;
}

.device-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
}

.device-caps {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.cap-badge {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(57, 197, 187, 0.15);
  color: #39c5bb;
  white-space: nowrap;
}

.button-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.primary {
  background: rgba(57, 197, 187, 0.15);
  border-color: rgba(57, 197, 187, 0.3);
  color: #39c5bb;
}

.action-btn.primary:hover:not(:disabled) {
  background: rgba(57, 197, 187, 0.25);
  border-color: rgba(57, 197, 187, 0.5);
}

.action-btn.danger {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.action-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
}
</style>
