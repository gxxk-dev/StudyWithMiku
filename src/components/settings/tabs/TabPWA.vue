<script setup>
/**
 * @module TabPWA
 * @description 缓存管理 Tab - 仅在 PWA 模式下显示
 */
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePWA } from '../../../composables/usePWA.js'
import { useCache } from '../../../composables/useCache.js'
import { useMusic } from '../../../composables/useMusic.js'
import { STORAGE_KEYS } from '../../../config/constants.js'

// PWA 状态（用于版本信息）
const { appVersion, appBuildTime, refreshApp, hasUpdate } = usePWA()

// 缓存管理
const {
  cacheStats,
  refreshCacheStats,
  clearServiceWorkerCache,
  clearLocalStorageCategory,
  clearMemoryCacheType,
  clearAllCaches,
  triggerPrefetch,
  clearPrefetchTimestamp
} = useCache()

// 音乐信息（用于预加载）
const { playlistId, platform, songs } = useMusic()

// 缓存折叠状态
const expandedSections = ref({ sw: false, ls: false, memory: false, prefetch: false })
const prefetching = ref(false)

// 获取回退时间
const getFallbackBuildTime = () => {
  const pad = (value) => value.toString().padStart(2, '0')
  const now = new Date()
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  const seconds = pad(now.getSeconds())
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const buildTimeTooltip = computed(() => appBuildTime.value || getFallbackBuildTime())

// 标签映射
const categoryLabels = {
  playlist: '歌单缓存',
  prefetch: '预加载时间戳',
  settings: '应用设置',
  musicConfig: '音乐配置'
}

const memoryTypeLabels = {
  videos: '视频',
  audios: '音频'
}

// 计算上次预加载时间
const lastPrefetchTime = computed(() => {
  const key = `${STORAGE_KEYS.PREFETCH_TIMESTAMP_PREFIX}:${platform.value}:${playlistId.value}`
  try {
    const timestamp = localStorage.getItem(key)
    if (!timestamp) return '从未'
    return new Date(Number(timestamp)).toLocaleString('zh-CN')
  } catch (error) {
    console.warn('读取预加载时间戳失败:', error)
    return '未知'
  }
})

// 切换展开/收起
const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

// 缓存操作
const refreshStats = async () => {
  await refreshCacheStats()
}

const clearSwCache = async (name) => {
  if (confirm(`确定要清除 ${name} 缓存吗？`)) {
    const success = await clearServiceWorkerCache(name)
    alert(success ? `${name} 已清除` : `清除 ${name} 失败`)
  }
}

const clearLsCategory = async (category) => {
  if (confirm(`确定要清除 ${categoryLabels[category]} 吗？`)) {
    await clearLocalStorageCategory(category)
    alert(`${categoryLabels[category]} 已清除`)
  }
}

const clearMemCache = async (type) => {
  if (confirm(`确定要清除 ${memoryTypeLabels[type]} 缓存吗？`)) {
    await clearMemoryCacheType(type)
    alert(`${memoryTypeLabels[type]} 缓存已清除`)
  }
}

const confirmClearAll = async () => {
  if (confirm('确定要清除所有缓存吗？这将删除所有视频、音乐、歌单数据（不包括应用设置）。')) {
    await clearAllCaches()
    alert('所有缓存已清除')
  }
}

// 预加载操作
const handlePrefetch = async () => {
  prefetching.value = true
  try {
    await triggerPrefetch(songs.value, platform.value, playlistId.value)
    alert('预加载完成')
    await refreshStats()
  } catch (error) {
    alert('预加载失败: ' + error.message)
  } finally {
    prefetching.value = false
  }
}

const handleClearPrefetchTimestamp = () => {
  clearPrefetchTimestamp(platform.value, playlistId.value)
  alert('预加载时间戳已重置')
}

// 刷新应用
const handleRefresh = () => {
  refreshApp(true)
}

// 初始化时刷新缓存统计
onMounted(() => {
  if (Object.keys(cacheStats.value.serviceWorker).length === 0) {
    refreshStats()
  }
})
</script>

<template>
  <div class="tab-content">
    <!-- 版本与更新 -->
    <div class="settings-section">
      <h3 class="section-title">版本信息</h3>
      <div class="version-info" :title="buildTimeTooltip">
        <div class="info-row">
          <Icon icon="mdi:tag" width="16" height="16" />
          <span class="info-label">版本：</span>
          <span class="info-value">{{ appVersion }}</span>
        </div>
        <div class="info-row">
          <Icon icon="mdi:clock-outline" width="16" height="16" />
          <span class="info-label">构建时间：</span>
          <span class="info-value">{{ appBuildTime }}</span>
        </div>
      </div>
      <div class="version-actions">
        <button v-if="hasUpdate" class="action-btn update-btn" @click="handleRefresh">
          <Icon icon="lucide:download" width="16" height="16" />
          立即更新
        </button>
        <button class="action-btn refresh-btn" @click="handleRefresh">
          <Icon icon="lucide:refresh-cw" width="16" height="16" />
          刷新应用
        </button>
      </div>
    </div>

    <!-- 缓存管理 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">缓存管理</h3>
        <button class="small-btn danger" @click="confirmClearAll">全部清除</button>
      </div>

      <!-- SW 缓存 -->
      <div class="cache-group">
        <div class="group-header" @click="toggleSection('sw')">
          <span>Service Worker 缓存</span>
          <Icon
            :icon="expandedSections.sw ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            width="16"
            height="16"
          />
        </div>
        <div v-show="expandedSections.sw" class="group-content">
          <div v-for="(stats, name) in cacheStats.serviceWorker" :key="name" class="cache-item">
            <div class="item-info">
              <span class="item-name">{{ name }}</span>
              <span class="item-count">{{ stats.count }} 条</span>
            </div>
            <button class="clear-btn" @click="clearSwCache(name)">清除</button>
          </div>
        </div>
      </div>

      <!-- 本地存储 -->
      <div class="cache-group">
        <div class="group-header" @click="toggleSection('ls')">
          <span>本地存储</span>
          <Icon
            :icon="expandedSections.ls ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            width="16"
            height="16"
          />
        </div>
        <div v-show="expandedSections.ls" class="group-content">
          <div
            v-for="(stats, category) in cacheStats.localStorage"
            :key="category"
            class="cache-item"
          >
            <div class="item-info">
              <span class="item-name">{{ categoryLabels[category] }}</span>
              <span class="item-count">{{ stats.count }} 条</span>
            </div>
            <button
              v-if="category !== 'settings'"
              class="clear-btn"
              @click="clearLsCategory(category)"
            >
              清除
            </button>
          </div>
        </div>
      </div>

      <!-- 内存缓存 -->
      <div class="cache-group">
        <div class="group-header" @click="toggleSection('memory')">
          <span>内存缓存</span>
          <Icon
            :icon="expandedSections.memory ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            width="16"
            height="16"
          />
        </div>
        <div v-show="expandedSections.memory" class="group-content">
          <div v-for="(stats, type) in cacheStats.memory" :key="type" class="cache-item">
            <div class="item-info">
              <span class="item-name">{{ memoryTypeLabels[type] }}</span>
              <span class="item-count">{{ stats.count }} 项</span>
            </div>
            <button class="clear-btn" @click="clearMemCache(type)">清除</button>
          </div>
        </div>
      </div>

      <!-- 预加载管理 -->
      <div class="cache-group">
        <div class="group-header" @click="toggleSection('prefetch')">
          <span>预加载管理</span>
          <Icon
            :icon="expandedSections.prefetch ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            width="16"
            height="16"
          />
        </div>
        <div v-show="expandedSections.prefetch" class="group-content">
          <div class="prefetch-info">
            <p>歌单: {{ platform }} - {{ playlistId }}</p>
            <p>上次: {{ lastPrefetchTime }}</p>
          </div>
          <div class="prefetch-actions">
            <button
              class="action-btn"
              :disabled="prefetching || songs.length === 0"
              @click="handlePrefetch"
            >
              {{ prefetching ? '预加载中...' : '立即预加载' }}
            </button>
            <button class="action-btn" @click="handleClearPrefetchTimestamp">重置时间戳</button>
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header .section-title {
  margin: 0;
}

/* 版本信息 */
.version-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.info-label {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.info-value {
  color: rgba(255, 255, 255, 0.6);
}

.version-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.update-btn {
  background: rgba(255, 152, 0, 0.2);
  border-color: rgba(255, 152, 0, 0.4);
  color: #ff9800;
}

.update-btn:hover {
  background: rgba(255, 152, 0, 0.3);
}

.refresh-btn {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.35);
  color: #4caf50;
}

.refresh-btn:hover {
  background: rgba(76, 175, 80, 0.25);
}

/* 缓存管理 */
.small-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.small-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.small-btn.danger {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.35);
  color: #f44336;
}

.small-btn.danger:hover {
  background: rgba(244, 67, 54, 0.25);
}

/* 缓存组 */
.cache-group {
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  transition: background 0.2s ease;
}

.group-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.group-content {
  padding: 0 12px 12px;
}

.cache-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.cache-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
}

.item-count {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.clear-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 152, 0, 0.4);
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(255, 152, 0, 0.25);
}

/* 预加载区域 */
.prefetch-info {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
}

.prefetch-info p {
  margin: 4px 0;
}

.prefetch-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prefetch-actions .action-btn {
  width: 100%;
  justify-content: center;
}
</style>
