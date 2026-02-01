<script setup>
/**
 * Changelog 展示组件
 * 使用 marked 渲染 CHANGELOG.md 内容
 * @module components/settings/tabs/TabChangelog
 */

import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { marked } from 'marked'
import changelog from '../../../../CHANGELOG.md?raw'
import { useUpdateChannel } from '../../../composables/useUpdateChannel.js'

const emit = defineEmits(['navigate'])

// 更新通道
const { isBeta, isVersionedPath, pathVersion, switchToBeta, switchToStable } = useUpdateChannel()

const switching = ref(false)

const handleChannelSwitch = async () => {
  if (switching.value) return
  switching.value = true
  try {
    if (isBeta.value) {
      await switchToStable()
    } else {
      await switchToBeta()
    }
  } finally {
    switching.value = false
  }
}

// 配置 marked 选项
marked.setOptions({
  gfm: true,
  breaks: true
})

// 解析 Markdown 内容
const htmlContent = computed(() => {
  return marked.parse(changelog)
})

// 返回关于页面
const goBack = () => {
  emit('navigate', 'about')
}
</script>

<template>
  <div class="tab-content">
    <!-- 顶部栏：返回按钮 + 更新通道 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">
        <Icon icon="lucide:arrow-left" width="18" height="18" />
        <span>返回关于</span>
      </button>

      <!-- 更新通道（紧凑模式） -->
      <div class="channel-compact">
        <div class="channel-badge" :class="{ beta: isBeta }">
          <Icon
            :icon="isBeta ? 'lucide:flask-conical' : 'lucide:shield-check'"
            width="14"
            height="14"
          />
          <span>{{ isBeta ? '测试版' : '稳定版' }}</span>
          <span v-if="isVersionedPath" class="version-tag">{{ pathVersion }}</span>
        </div>
        <button
          class="switch-btn"
          :class="{ 'to-beta': !isBeta, 'to-stable': isBeta }"
          :disabled="switching"
          @click="handleChannelSwitch"
        >
          <Icon
            :icon="switching ? 'lucide:loader-2' : 'lucide:repeat'"
            width="14"
            height="14"
            :class="{ spinning: switching }"
          />
          {{ switching ? '切换中' : isBeta ? '稳定版' : '测试版' }}
        </button>
      </div>
    </div>

    <!-- Changelog 内容 -->
    <div class="changelog-content" v-html="htmlContent"></div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  color: white;
}

/* 更新通道紧凑模式 */
.channel-compact {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 20px;
  font-size: 0.8rem;
  color: #4caf50;
}

.channel-badge.beta {
  background: rgba(255, 152, 0, 0.15);
  border-color: rgba(255, 152, 0, 0.3);
  color: #ff9800;
}

.version-tag {
  font-size: 0.7rem;
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: inherit;
  opacity: 0.8;
}

.switch-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.switch-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.switch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-btn.to-beta:hover:not(:disabled) {
  border-color: rgba(255, 152, 0, 0.4);
  color: #ff9800;
}

.switch-btn.to-stable:hover:not(:disabled) {
  border-color: rgba(76, 175, 80, 0.4);
  color: #4caf50;
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

.changelog-content {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.7;
}

/* Markdown 渲染样式 */
.changelog-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.changelog-content :deep(h2) {
  font-size: 1.2rem;
  font-weight: 600;
  color: #39c5bb;
  margin: 24px 0 12px 0;
}

.changelog-content :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 16px 0 8px 0;
}

.changelog-content :deep(p) {
  margin: 8px 0;
  color: rgba(255, 255, 255, 0.75);
}

.changelog-content :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.changelog-content :deep(li) {
  margin: 4px 0;
  color: rgba(255, 255, 255, 0.75);
}

.changelog-content :deep(code) {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85em;
  color: #f39c12;
}

.changelog-content :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.changelog-content :deep(pre code) {
  background: none;
  padding: 0;
  color: rgba(255, 255, 255, 0.85);
}

.changelog-content :deep(a) {
  color: #39c5bb;
  text-decoration: none;
  transition: color 0.2s ease;
}

.changelog-content :deep(a:hover) {
  color: #4fd1c5;
  text-decoration: underline;
}

.changelog-content :deep(strong) {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.changelog-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 20px 0;
}

.changelog-content :deep(blockquote) {
  border-left: 3px solid #39c5bb;
  margin: 12px 0;
  padding: 8px 16px;
  background: rgba(57, 197, 187, 0.1);
  border-radius: 0 8px 8px 0;
  color: rgba(255, 255, 255, 0.8);
}
</style>
