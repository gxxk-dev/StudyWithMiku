<script setup>
/**
 * 分享卡片 - 预览容器组件
 * 组合所有模块，用于 html2canvas 捕获
 */

import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import ShareCardMiniHeatmap from './ShareCardMiniHeatmap.vue'
import ShareCardStats from './ShareCardStats.vue'
import ShareCardTrendChart from './ShareCardTrendChart.vue'
import ShareCardHitokoto from './ShareCardHitokoto.vue'

const props = defineProps({
  /**
   * 配置
   */
  config: {
    type: Object,
    required: true
  },
  /**
   * 一言数据
   */
  hitokoto: {
    type: Object,
    default: null
  },
  /**
   * 一言加载状态
   */
  hitokotoLoading: {
    type: Boolean,
    default: false
  }
})

/**
 * 日期范围标题（近3个月）
 */
const dateRangeTitle = computed(() => {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 90) // 约3个月

  const formatDate = (d) => `${d.getMonth() + 1}.${d.getDate()}`
  return `${formatDate(start)} - ${formatDate(now)}`
})

/**
 * 获取当前网站域名
 */
const siteUrl = computed(() => {
  try {
    return window.location.host || 'study.miku.fan'
  } catch {
    return 'study.miku.fan'
  }
})

/**
 * 是否显示任何内容
 */
const hasAnyContent = computed(() => {
  const { modules, showHitokoto } = props.config
  return modules.basicStats || modules.miniHeatmap || modules.trendChart || showHitokoto
})
</script>

<template>
  <div class="share-card">
    <!-- 头部 -->
    <div class="card-header">
      <div class="logo-section">
        <Icon icon="mdi:music-note" width="28" height="28" class="logo-icon" />
      </div>
      <div class="title-section">
        <h1 class="app-title">Study with Miku</h1>
        <p class="date-subtitle">{{ dateRangeTitle }} 学习报告</p>
      </div>
    </div>

    <!-- 模块内容 -->
    <div v-if="hasAnyContent" class="card-content">
      <ShareCardMiniHeatmap v-if="config.modules.miniHeatmap" />
      <ShareCardStats v-if="config.modules.basicStats" />
      <ShareCardTrendChart v-if="config.modules.trendChart" />
      <ShareCardHitokoto
        v-if="config.showHitokoto"
        :hitokoto="hitokoto"
        :loading="hitokotoLoading"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <span>请选择至少一项内容</span>
    </div>

    <!-- 底部品牌 -->
    <div class="card-footer">
      <span>Study with Miku</span>
      <span class="dot">·</span>
      <span>{{ siteUrl }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

.share-card {
  width: 360px;
  background: linear-gradient(180deg, #1a1f25 0%, #0d1117 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.logo-section {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, $color-miku, #2da8a0);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-icon {
  color: white;
}

.title-section {
  flex: 1;
  min-width: 0;
}

.app-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 2px 0;
}

.date-subtitle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.card-content {
  margin-bottom: 16px;

  // 移除最后一个子元素的底部边距
  > :last-child {
    margin-bottom: 0;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.9rem;
  text-align: center;
}

.card-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.dot {
  font-size: 0.5rem;
}
</style>
