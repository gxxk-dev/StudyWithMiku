<template>
  <div class="sync-panel">
    <h3>云同步</h3>

    <div class="sync-status">
      <div class="status-icon" :class="syncStatus">
        <Icon :icon="statusIcon" width="24" height="24" :class="{ spin: isSyncing }" />
      </div>
      <div class="status-info">
        <div class="status-text">{{ statusText }}</div>
        <div v-if="lastSyncTime" class="last-sync">上次同步: {{ formatTime(lastSyncTime) }}</div>
      </div>
    </div>

    <div class="sync-actions">
      <button class="btn-sync" :disabled="isSyncing" @click="handleSync">
        <Icon icon="lucide:refresh-cw" width="16" height="16" :class="{ spin: isSyncing }" />
        立即同步
      </button>
      <!-- Hidden advanced options for now, can be enabled later -->
      <!--
      <button class="btn-secondary" @click="handleForceUpload" :disabled="isSyncing">
        上传本地数据
      </button>
      <button class="btn-secondary" @click="handleForceDownload" :disabled="isSyncing">
        下载云端数据
      </button>
      -->
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useDataSync } from '../../../../composables/useDataSync.js'
import { useToast } from '../../../../composables/useToast.js'

const { syncStatus, lastSyncTime, isSyncing, triggerSync, initialize } = useDataSync()

const { showToast } = useToast()

// 挂载时初始化同步状态
onMounted(() => {
  initialize()
})

// 计算整体同步状态
const overallStatus = computed(() => {
  const statuses = Object.values(syncStatus.value)
  if (statuses.length === 0) return 'pending'
  if (statuses.some((s) => s.error)) return 'error'
  if (statuses.every((s) => s.synced)) return 'synced'
  return 'pending'
})

const statusIcon = computed(() => {
  if (isSyncing.value) return 'lucide:loader-2'
  switch (overallStatus.value) {
    case 'synced':
      return 'lucide:check-circle-2'
    case 'error':
      return 'lucide:alert-circle'
    case 'offline':
      return 'lucide:wifi-off'
    default:
      return 'lucide:cloud'
  }
})

const statusText = computed(() => {
  if (isSyncing.value) return '正在同步...'
  switch (overallStatus.value) {
    case 'synced':
      return '数据已同步'
    case 'error':
      return '同步失败'
    case 'offline':
      return '离线模式'
    default:
      return '等待同步'
  }
})

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

const handleSync = async () => {
  try {
    await triggerSync()
    showToast('success', '同步完成')
  } catch (err) {
    // Error handled by useDataSync
    showToast('同步失败', 'error')
  }
}
</script>

<style scoped>
.sync-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

h3 {
  margin: 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
}

.status-icon.synced {
  color: #39c5bb;
  background: rgba(57, 197, 187, 0.2);
}

.status-icon.error {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.2);
}

.status-info {
  flex: 1;
}

.status-text {
  font-weight: 500;
  color: white;
  margin-bottom: 4px;
}

.last-sync {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.sync-actions {
  display: flex;
  gap: 12px;
}

button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sync {
  background: #39c5bb;
  color: #1a1a1a;
}

.btn-sync:hover:not(:disabled) {
  background: #4ad3c9;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
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
