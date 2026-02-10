<template>
  <div class="device-list-panel">
    <div class="header">
      <h3>已登录设备</h3>
      <button
        v-if="!showAddInput"
        class="add-btn"
        :disabled="isLoading || !isWebAuthnSupported"
        @click="showAddInput = true"
      >
        <Icon icon="lucide:plus" width="16" height="16" />
        添加设备
      </button>
    </div>

    <!-- 添加设备输入框 -->
    <div v-if="showAddInput" class="add-device-form">
      <input
        v-model="newDeviceName"
        type="text"
        placeholder="设备名称（可选，如：我的电脑）"
        :disabled="isLoading"
        @keyup.enter="handleAddDevice"
      />
      <div class="form-actions">
        <button class="btn-confirm" :disabled="isLoading" @click="handleAddDevice">
          <Icon icon="lucide:check" width="16" height="16" />
          确认添加
        </button>
        <button class="btn-cancel" :disabled="isLoading" @click="cancelAdd">取消</button>
      </div>
    </div>

    <div v-if="loadingDevices" class="loading">
      <Icon icon="eos-icons:loading" width="24" height="24" />
    </div>

    <div v-else class="list">
      <div v-for="device in devices" :key="device.id" class="device-item">
        <div class="device-icon">
          <Icon :icon="getDeviceIcon(device)" width="24" height="24" />
        </div>
        <div class="device-info">
          <div class="device-name">
            {{ device.deviceName || '未命名设备' }}
            <span v-if="isCurrentDevice(device)" class="current-badge">当前设备</span>
          </div>
          <div class="device-meta">
            {{ formatDate(device.lastUsedAt) }} · {{ device.transports?.join(', ') || 'unknown' }}
          </div>
        </div>
        <button class="delete-btn" :disabled="isLoading" @click="confirmDelete(device)">
          <Icon icon="lucide:trash-2" width="16" height="16" />
        </button>
      </div>

      <div v-if="devices.length === 0" class="empty-state">无已登录设备</div>
    </div>

    <AccountDeleteConfirm
      :is-open="showDeleteConfirm"
      :device-name="deviceToDelete?.deviceName"
      :is-loading="isLoading"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteDevice"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuth } from '../../../../composables/useAuth.js'
import { useToast } from '../../../../composables/useToast.js'
import AccountDeleteConfirm from './AccountDeleteConfirm.vue'

const { devices, getDevices, addDevice, removeDevice, isLoading, isWebAuthnSupported } = useAuth()

const { showToast } = useToast()

const loadingDevices = ref(false)
const showDeleteConfirm = ref(false)
const deviceToDelete = ref(null)
const showAddInput = ref(false)
const newDeviceName = ref('')

onMounted(async () => {
  loadingDevices.value = true
  try {
    await getDevices()
  } catch (err) {
    // Error handled by useAuth
  } finally {
    loadingDevices.value = false
  }
})

const getDeviceIcon = (device) => {
  // Simple heuristic based on UA or device type if available
  // Since we don't store full UA, we might just return a generic icon or guess based on name
  const name = (device.deviceName || '').toLowerCase()
  if (name.includes('phone') || name.includes('mobile')) return 'lucide:smartphone'
  if (name.includes('mac') || name.includes('windows') || name.includes('linux'))
    return 'lucide:laptop'
  return 'lucide:monitor'
}

const isCurrentDevice = (_device) => {
  // We don't have a reliable way to know if it's strictly the current device without checking credential ID
  // But we can't easily access the current credential ID from here without storing it on login.
  // For now, we'll skip this or implement a basic check if we store current credential ID in session.
  return false
}

const formatDate = (dateStr) => {
  if (!dateStr) return '未知时间'
  return new Date(dateStr).toLocaleDateString()
}

const handleAddDevice = async () => {
  try {
    await addDevice(newDeviceName.value || undefined)
    showToast('success', '设备添加成功')
    showAddInput.value = false
    newDeviceName.value = ''
  } catch (err) {
    // Error handled by useAuth
  }
}

const cancelAdd = () => {
  showAddInput.value = false
  newDeviceName.value = ''
}

const confirmDelete = (device) => {
  deviceToDelete.value = device
  showDeleteConfirm.value = true
}

const handleDeleteDevice = async () => {
  if (!deviceToDelete.value) return

  try {
    await removeDevice(deviceToDelete.value.credentialId)
    showToast('success', '设备已删除')
    showDeleteConfirm.value = false
    deviceToDelete.value = null
  } catch (err) {
    // Error handled by useAuth
  }
}
</script>

<style scoped>
.device-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(57, 197, 187, 0.1);
  color: #39c5bb;
  border: 1px solid rgba(57, 197, 187, 0.2);
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: rgba(57, 197, 187, 0.2);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-device-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(57, 197, 187, 0.05);
  border: 1px solid rgba(57, 197, 187, 0.2);
  border-radius: 8px;
}

.add-device-form input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.add-device-form input:focus {
  border-color: #39c5bb;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.btn-confirm {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #39c5bb;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm:hover:not(:disabled) {
  background: #4ad3c9;
}

.btn-cancel {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.loading {
  display: flex;
  justify-content: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.device-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.device-icon {
  color: rgba(255, 255, 255, 0.6);
}

.device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.device-name {
  font-size: 0.95rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-badge {
  font-size: 0.7rem;
  background: rgba(57, 197, 187, 0.2);
  color: #39c5bb;
  padding: 2px 6px;
  border-radius: 4px;
}

.device-meta {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.delete-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}
</style>
