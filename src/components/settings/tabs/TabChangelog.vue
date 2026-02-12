<script setup>
/**
 * Changelog 展示组件
 * 使用 marked 渲染 CHANGELOG.md 内容
 * @module components/settings/tabs/TabChangelog
 */

import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { marked } from 'marked'
import changelog from '../../../../CHANGELOG.md?raw'

const emit = defineEmits(['navigate'])

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
    <!-- 返回按钮 -->
    <button class="back-btn" @click="goBack">
      <Icon icon="lucide:arrow-left" width="18" height="18" />
      <span>返回关于</span>
    </button>

    <!-- Changelog 内容 -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="changelog-content" v-html="htmlContent"></div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  margin-bottom: 20px;
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
