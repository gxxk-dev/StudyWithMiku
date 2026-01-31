<script setup>
/**
 * 分享卡片 - 基础统计组件
 * 展示总专注次数、总时长、完成率、最长连击
 */

import { useFocus } from '../../../../../composables/useFocus.js'

const { allTimeStats } = useFocus()

/**
 * 格式化时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时长
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    const decimalHours = (hours + minutes / 60).toFixed(1)
    return `${decimalHours}h`
  }
  return `${minutes}m`
}
</script>

<template>
  <div class="stats-grid">
    <div class="stat-box">
      <span class="stat-number">{{ allTimeStats.completedSessions }}</span>
      <span class="stat-label">总专注</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">{{ formatDuration(allTimeStats.totalFocusTime) }}</span>
      <span class="stat-label">总时长</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">{{ allTimeStats.longestStreak }}</span>
      <span class="stat-label">最长连击</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">{{ allTimeStats.completionRate }}%</span>
      <span class="stat-label">完成率</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: $color-miku;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}
</style>
