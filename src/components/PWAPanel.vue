<template>
  <div
    class="pwa-container"
    :class="{ hidden: !visible }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- 右下角浮动按钮 -->
    <div class="pwa-fab" @click="togglePanel">
      <Icon icon="lucide:settings" width="24" height="24" class="fab-icon" />
      <span v-if="hasUpdate" class="update-badge"></span>
    </div>

    <!-- PWA 功能面板 -->
    <transition name="slide-up">
      <div v-if="showPanel" class="pwa-panel" @click.stop>
        <!-- 头部：状态指示 -->
        <div class="panel-header">
          <div class="status-info">
            <span class="mode-badge" :class="{ pwa: isPWA }">
              {{ isPWA ? 'PWA' : '网页' }}
            </span>
            <span class="offline-indicator" :class="{ online: isOnline }">
              {{ isOnline ? '在线' : '离线' }}
            </span>
          </div>
          <button class="close-btn" @click="closePanel">
            <Icon icon="mdi:close" />
          </button>
        </div>

        <!-- PWA 安装提示（仅网页模式显示） -->
        <div v-if="!isPWA" class="install-section">
          <!-- 浏览器支持自动安装 -->
          <div v-if="canInstall" class="install-auto">
            <div class="install-info">
              <Icon
                icon="mdi:cellphone-arrow-down"
                width="20"
                height="20"
                inline
                class="install-icon"
              />
              <span>安装应用以获得更好的体验</span>
            </div>
            <button class="install-btn" @click="handleInstall">安装到桌面</button>
          </div>

          <!-- 手动安装指引 -->
          <div v-else class="install-manual">
            <div class="install-info">
              <Icon
                icon="mdi:cellphone-arrow-down"
                width="20"
                height="20"
                inline
                class="install-icon"
              />
              <span>将应用添加到主屏幕</span>
            </div>
            <div class="manual-steps">
              <p class="step-hint">{{ manualInstallHint }}</p>
              <button class="guide-btn" @click="showInstallGuide = !showInstallGuide">
                {{ showInstallGuide ? '收起' : '查看详细步骤' }}
              </button>
              <div v-if="showInstallGuide" class="guide-details">
                <p v-for="(step, index) in installSteps" :key="index" class="guide-step">
                  {{ index + 1 }}. {{ step }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 版本与快捷操作 -->
        <div class="version-section">
          <div class="version-info" :title="buildTimeTooltip">
            <span>版本: {{ appVersion }}</span>
            <span v-if="hasUpdate" class="update-hint">有新版本</span>
          </div>
          <div class="quick-actions">
            <button v-if="hasUpdate" class="action-btn update-btn" @click="handleRefresh">
              立即更新
            </button>
            <button class="action-btn refresh-btn" @click="handleRefresh">刷新</button>
          </div>
        </div>

        <!-- 缓存管理（仅 PWA 模式显示） -->
        <div v-if="isPWA" class="cache-section">
          <div class="section-header">
            <h4>缓存管理</h4>
            <div class="header-actions">
              <button class="small-btn danger" @click="confirmClearAll">全部清除</button>
            </div>
          </div>

          <!-- SW 缓存 -->
          <div class="cache-group">
            <div class="group-header" @click="toggleSection('sw')">
              <span>Service Worker 缓存</span>
              <span class="toggle-icon">{{ expandedSections.sw ? '▲' : '▼' }}</span>
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
              <span class="toggle-icon">{{ expandedSections.ls ? '▲' : '▼' }}</span>
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
              <span class="toggle-icon">{{ expandedSections.memory ? '▲' : '▼' }}</span>
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
              <span class="toggle-icon">{{ expandedSections.prefetch ? '▲' : '▼' }}</span>
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
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { usePWA } from '../composables/usePWA.js'
import { useCache } from '../composables/useCache.js'
import { useMusic } from '../composables/useMusic.js'
import { STORAGE_KEYS } from '../config/constants.js'

defineProps({
  visible: {
    type: Boolean,
    default: true,
    required: false // visible 不是必需的，有默认值
  }
})

const emit = defineEmits(['mouseenter', 'mouseleave'])

// 安装指引状态
const showInstallGuide = ref(false)

// PWA 状态
const { isPWA, isOnline, canInstall, hasUpdate, appVersion, appBuildTime, installPWA, refreshApp } =
  usePWA()

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

// 面板状态
const showPanel = ref(false)
const expandedSections = ref({ sw: false, ls: false, memory: false, prefetch: false })
const prefetching = ref(false)

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

// 切换面板
const togglePanel = () => {
  showPanel.value = !showPanel.value
  if (showPanel.value && Object.keys(cacheStats.value.serviceWorker).length === 0) {
    refreshStats()
  }
}

const closePanel = () => {
  showPanel.value = false
}

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

// PWA 操作
const handleInstall = async () => {
  const accepted = await installPWA()
  if (accepted) {
    alert('感谢安装！')
  }
}

const handleRefresh = () => {
  refreshApp(true)
}

// 检测浏览器类型和平台
const detectPlatform = () => {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isChrome = /Chrome/.test(ua)

  if (isIOS) return 'ios'
  if (isAndroid && isChrome) return 'android-chrome'
  if (isAndroid) return 'android'
  if (isSafari) return 'safari'
  return 'other'
}

// 手动安装提示文本
const manualInstallHint = computed(() => {
  const platform = detectPlatform()
  switch (platform) {
    case 'ios':
      return '点击浏览器底部的"分享"按钮'
    case 'android-chrome':
      return '点击浏览器菜单中的"添加到主屏幕"'
    case 'safari':
      return '点击浏览器的"分享"按钮'
    default:
      return '在浏览器菜单中查找"安装"或"添加到主屏幕"选项'
  }
})

// 详细安装步骤
const installSteps = computed(() => {
  const platform = detectPlatform()
  switch (platform) {
    case 'ios':
      return [
        '点击底部工具栏的"分享"图标（方框带向上箭头）',
        '在弹出菜单中找到"添加到主屏幕"',
        '点击"添加"完成安装'
      ]
    case 'android-chrome':
      return ['点击右上角的三个点菜单', '选择"添加到主屏幕"或"安装应用"', '点击"添加"完成安装']
    case 'safari':
      return ['点击工具栏的"分享"按钮', '选择"添加到主屏幕"', '点击"添加"完成']
    default:
      return [
        '打开浏览器菜单（通常是右上角的三个点或三条线）',
        '查找"安装"、"添加到主屏幕"或类似选项',
        '按照提示完成安装'
      ]
  }
})

// 鼠标事件转发
const onMouseEnter = () => emit('mouseenter')
const onMouseLeave = () => emit('mouseleave')
</script>

<style scoped>
.pwa-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1002;
  transition: opacity 0.3s ease;
}

.pwa-container.hidden {
  opacity: 0;
  pointer-events: none;
}

/* 浮动按钮 */
.pwa-fab {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #39c5bb;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.3s,
    background 0.3s,
    box-shadow 0.3s;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.pwa-fab:hover {
  transform: scale(1.1);
  background: #2db5ab;
  box-shadow: 0 6px 16px rgba(57, 197, 187, 0.4);
}

.fab-icon {
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.update-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #ff4444;
  border-radius: 50%;
  border: 2px solid #39c5bb;
}

/* 面板 */
.pwa-panel {
  position: absolute;
  bottom: 60px;
  right: 0;
  width: 320px;
  max-height: calc(100vh - 100px);
  height: 480px;
  background: rgba(30, 30, 40, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow-y: auto;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* 手机横屏优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .pwa-panel {
    max-height: calc(100vh - 80px);
    height: auto;
  }
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.status-info {
  display: flex;
  gap: 8px;
}

.mode-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.mode-badge.pwa {
  background: rgba(57, 197, 187, 0.3);
  color: #39c5bb;
}

.offline-indicator {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  background: rgba(255, 100, 100, 0.2);
  color: #ff6464;
}

.offline-indicator.online {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  opacity: 1;
}

/* 安装区域 */
.install-section {
  padding: 12px 16px;
  background: rgba(57, 197, 187, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.install-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 0.85rem;
}

.install-icon {
  font-size: 1.2rem;
}

/* 自动安装（支持 beforeinstallprompt 的浏览器） */
.install-btn {
  width: 100%;
  padding: 8px;
  background: rgba(57, 197, 187, 0.8);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.3s;
}

.install-btn:hover {
  background: rgba(57, 197, 187, 1);
}

/* 手动安装指引（iOS、Safari 等不支持的浏览器） */
.install-manual {
  width: 100%;
}

.manual-steps {
  margin-top: 8px;
}

.step-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 8px 0;
  line-height: 1.4;
}

.guide-btn {
  width: 100%;
  padding: 8px;
  background: rgba(57, 197, 187, 0.6);
  border: 1px solid rgba(57, 197, 187, 0.8);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.3s;
}

.guide-btn:hover {
  background: rgba(57, 197, 187, 0.8);
}

.guide-details {
  margin-top: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border-left: 3px solid rgba(57, 197, 187, 0.8);
}

.guide-step {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 6px 0;
  line-height: 1.5;
}

/* 版本区域 */
.version-section {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
  opacity: 0.8;
}

.update-hint {
  color: #ff9800;
  font-size: 0.75rem;
}

.quick-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.3s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.update-btn {
  background: rgba(255, 152, 0, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
}

.refresh-btn {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.4);
}

/* 缓存管理区域 */
.cache-section {
  padding: 12px 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.small-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.7rem;
  cursor: pointer;
}

.small-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.small-btn.danger {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.4);
}

.small-btn:disabled {
  opacity: 0.5;
}

/* 缓存组 */
.cache-group {
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.3s;
}

.group-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.toggle-icon {
  font-size: 0.7rem;
  opacity: 0.6;
}

.group-content {
  padding: 0 12px 10px;
}

.cache-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
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
  font-size: 0.75rem;
}

.item-count {
  font-size: 0.7rem;
  opacity: 0.6;
}

.clear-btn {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 152, 0, 0.4);
  background: rgba(255, 152, 0, 0.15);
  color: white;
  font-size: 0.7rem;
  cursor: pointer;
}

.clear-btn:hover {
  background: rgba(255, 152, 0, 0.25);
}

/* 预加载区域 */
.prefetch-info {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-bottom: 10px;
}

.prefetch-info p {
  margin: 4px 0;
}

.prefetch-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prefetch-actions .action-btn {
  width: 100%;
  text-align: center;
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* 滚动条 */
.pwa-panel::-webkit-scrollbar {
  width: 4px;
}

.pwa-panel::-webkit-scrollbar-track {
  background: transparent;
}

.pwa-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
</style>
