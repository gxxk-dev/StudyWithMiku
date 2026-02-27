<script setup>
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import QRCode from 'qrcode'
import { useCoyote } from '../../../../composables/useCoyote.js'
import { CoyoteConnectionState } from '../../../../composables/coyote/constants.js'

const {
  connectionState,
  clientId,
  targetId,
  lastError,
  connect,
  disconnect,
  emergencyStop,
  service
} = useCoyote()

const emit = defineEmits(['update:serverUrl'])

defineProps({
  serverUrl: {
    type: String,
    default: ''
  }
})

const statusConfig = computed(() => {
  switch (connectionState.value) {
    case CoyoteConnectionState.BOUND:
      return { color: '#4caf50', label: '已绑定', icon: 'lucide:check-circle' }
    case CoyoteConnectionState.WAITING_BIND:
      return { color: '#f59e0b', label: '等待配对', icon: 'lucide:loader' }
    case CoyoteConnectionState.CONNECTING:
      return { color: '#f59e0b', label: '连接中...', icon: 'lucide:loader' }
    case CoyoteConnectionState.ERROR:
      return { color: '#ef4444', label: '错误', icon: 'lucide:alert-circle' }
    default:
      return { color: '#6b7280', label: '未连接', icon: 'lucide:circle' }
  }
})

const isBound = computed(() => connectionState.value === CoyoteConnectionState.BOUND)
const isWaiting = computed(() => connectionState.value === CoyoteConnectionState.WAITING_BIND)
const isDisconnected = computed(
  () =>
    connectionState.value === CoyoteConnectionState.DISCONNECTED ||
    connectionState.value === CoyoteConnectionState.ERROR
)
const isConnecting = computed(() => connectionState.value === CoyoteConnectionState.CONNECTING)

const bindQrData = computed(() => service.getBindQrData())
const qrDataUrl = ref('')

// 当绑定数据变化时生成二维码图片
watch(
  bindQrData,
  async (data) => {
    if (!data) {
      qrDataUrl.value = ''
      return
    }
    try {
      qrDataUrl.value = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch {
      qrDataUrl.value = ''
    }
  },
  { immediate: true }
)

const handleConnect = () => {
  connect()
}

const handleServerInput = (e) => {
  emit('update:serverUrl', e.target.value)
}
</script>

<template>
  <div class="settings-section">
    <h3 class="section-title">
      <Icon icon="lucide:plug" width="18" height="18" />
      <span>设备连接</span>
    </h3>

    <!-- 服务器地址 -->
    <div class="setting-item">
      <div class="setting-header">
        <span class="setting-label">服务器</span>
      </div>
      <input
        type="text"
        class="text-input"
        :value="serverUrl"
        placeholder="wss://ws.dungeon-lab.cn/"
        :disabled="!isDisconnected"
        @change="handleServerInput"
      />
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
            :class="{ spinning: isConnecting || isWaiting }"
          />
          {{ statusConfig.label }}
        </span>
      </div>

      <!-- 绑定信息 -->
      <div v-if="isBound" class="status-detail">
        <span class="detail-label">Target ID:</span>
        <code class="detail-value">{{ targetId }}</code>
      </div>

      <!-- 等待配对 -->
      <div v-if="isWaiting" class="waiting-bind">
        <div class="status-detail">
          <span class="detail-label">Client ID:</span>
          <code class="detail-value">{{ clientId }}</code>
        </div>

        <!-- 二维码 -->
        <div v-if="qrDataUrl" class="qr-container">
          <img :src="qrDataUrl" alt="DG-Lab 配对二维码" class="qr-image" />
          <ol class="pairing-steps">
            <li>打开 DG-Lab App，选择「Socket 控制」</li>
            <li>确保 Coyote 已通过蓝牙连接</li>
            <li>点击「连接服务器」旁的相机图标，扫描上方二维码</li>
          </ol>
        </div>
      </div>

      <!-- 错误 -->
      <div v-if="lastError" class="status-detail error">
        <span>{{ lastError }}</span>
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

.status-detail {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.status-detail.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.detail-label {
  color: rgba(255, 255, 255, 0.5);
  margin-right: 8px;
}

.detail-value {
  font-family: var(--font-mono);
  color: #39c5bb;
  font-size: 0.8rem;
}

.waiting-bind {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.qr-image {
  width: 200px;
  height: 200px;
  border-radius: 6px;
}

.pairing-steps {
  margin: 0;
  padding-left: 1.4em;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  text-align: left;
  line-height: 1.8;
}

.pairing-steps li {
  margin-bottom: 2px;
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
