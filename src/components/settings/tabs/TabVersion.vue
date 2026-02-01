<script setup>
import { onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useVersionSwitch } from '../../../composables/useVersionSwitch.js'

const {
  versions,
  currentVersion,
  isLoading,
  error,
  fetchVersions,
  switchVersion,
  switchToLatest,
  isVersionedPath
} = useVersionSwitch()

/**
 * 确认后切换版本
 * @param {string} tag - 目标版本号
 */
const confirmSwitch = async (tag) => {
  const confirmed = window.confirm(
    `确认切换到 v${tag}？\n\n切换版本会清除 PWA 缓存并跳转到对应版本页面。`
  )
  if (confirmed) {
    await switchVersion(tag)
  }
}

/**
 * 确认后切换到最新版本
 */
const confirmSwitchToLatest = async () => {
  const confirmed = window.confirm(
    '确认切换到最新版本？\n\n切换版本会清除 PWA 缓存并跳转到最新版本。'
  )
  if (confirmed) {
    await switchToLatest()
  }
}

/**
 * 判断是否为当前运行的版本
 * @param {string} tag - 版本号
 * @returns {boolean}
 */
const isCurrentVersion = (tag) => {
  return currentVersion.value === tag || currentVersion.value === `${tag}-dirty`
}

onMounted(() => {
  fetchVersions()
})
</script>

<template>
  <div class="tab-content">
    <!-- 当前版本 -->
    <div class="settings-section">
      <h3 class="section-title">当前版本</h3>
      <div class="current-version-card">
        <div class="version-badge">
          <Icon icon="mdi:tag" width="18" height="18" />
          <span>v{{ currentVersion }}</span>
        </div>
        <button v-if="isVersionedPath" class="latest-btn" @click="confirmSwitchToLatest">
          <Icon icon="lucide:arrow-up-circle" width="16" height="16" />
          <span>切换到最新版本</span>
        </button>
      </div>
    </div>

    <!-- 版本列表 -->
    <div class="settings-section">
      <h3 class="section-title">可用版本</h3>

      <!-- 加载中 -->
      <div v-if="isLoading" class="loading-state">
        <Icon icon="mdi:loading" width="20" height="20" class="spinning" />
        <span>加载版本列表...</span>
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="error-state">
        <Icon icon="mdi:alert-circle-outline" width="20" height="20" />
        <span>{{ error }}</span>
        <button class="retry-btn" @click="fetchVersions">重试</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="versions.length === 0" class="empty-state">
        <Icon icon="mdi:package-variant" width="20" height="20" />
        <span>暂无可用版本</span>
      </div>

      <!-- 版本列表 -->
      <div v-else class="version-list">
        <div
          v-for="ver in versions"
          :key="ver.tag"
          class="version-item"
          :class="{ active: isCurrentVersion(ver.tag) }"
        >
          <div class="version-info">
            <div class="version-tag">
              <Icon icon="mdi:tag-outline" width="16" height="16" />
              <span>v{{ ver.tag }}</span>
            </div>
            <div class="version-date">
              <Icon icon="mdi:calendar-outline" width="14" height="14" />
              <span>{{ ver.date }}</span>
            </div>
          </div>
          <div class="version-action">
            <span v-if="isCurrentVersion(ver.tag)" class="current-label">
              <Icon icon="mdi:check-circle" width="16" height="16" />
              当前版本
            </span>
            <button v-else class="switch-btn" @click="confirmSwitch(ver.tag)">
              <Icon icon="lucide:arrow-right-circle" width="16" height="16" />
              切换
            </button>
          </div>
        </div>
      </div>
    </div>
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
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 12px 0;
}

/* 当前版本卡片 */
.current-version-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(57, 197, 187, 0.1);
  border: 1px solid rgba(57, 197, 187, 0.3);
  border-radius: 8px;
}

.version-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #39c5bb;
}

.latest-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(57, 197, 187, 0.15);
  border: 1px solid rgba(57, 197, 187, 0.4);
  border-radius: 6px;
  color: #39c5bb;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.latest-btn:hover {
  background: rgba(57, 197, 187, 0.25);
  border-color: rgba(57, 197, 187, 0.6);
}

/* 状态 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.error-state {
  color: rgba(239, 83, 80, 0.9);
}

.retry-btn {
  margin-left: 8px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.spinning {
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

/* 版本列表 */
.version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.version-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
}

.version-item.active {
  background: rgba(57, 197, 187, 0.08);
  border-color: rgba(57, 197, 187, 0.25);
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.version-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.version-action {
  flex-shrink: 0;
}

.current-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #39c5bb;
}

.switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.switch-btn:hover {
  background: rgba(57, 197, 187, 0.15);
  border-color: rgba(57, 197, 187, 0.4);
  color: #39c5bb;
}
</style>
