<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus } from '../../../../composables/useFocus.js'

const { todayStats, weekStats, monthStats, allTimeStats } = useFocus()

/**
 * 格式化时长（秒 → "Xh Xm" 或 "Xm"）
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * 格式化平均时长（秒 → 分钟）
 */
const formatAverage = (seconds) => {
  return `${Math.round(seconds / 60)}m`
}

/**
 * 计算本周已过天数（周一为1）
 */
const getWeekDaysPassed = () => {
  const now = new Date()
  const day = now.getDay()
  return day === 0 ? 7 : day
}

/**
 * 计算本月已过天数
 */
const getMonthDaysPassed = () => {
  return new Date().getDate()
}

/**
 * 四个卡片的配置
 */
const cards = computed(() => {
  const weekDays = getWeekDaysPassed()
  const monthDays = getMonthDaysPassed()

  return [
    {
      key: 'today',
      label: '今日',
      icon: 'lucide:sun',
      color: '#39c5bb',
      stats: todayStats.value,
      extraLabel: '休息时长',
      extraValue: formatDuration(todayStats.value.totalBreakTime)
    },
    {
      key: 'week',
      label: '本周',
      icon: 'lucide:calendar-days',
      color: '#ff6b6b',
      stats: weekStats.value,
      extraLabel: '日均专注',
      extraValue: `${(weekStats.value.completedSessions / weekDays).toFixed(1)} 次`
    },
    {
      key: 'month',
      label: '本月',
      icon: 'lucide:calendar',
      color: '#4ecdc4',
      stats: monthStats.value,
      extraLabel: '日均专注',
      extraValue: `${(monthStats.value.completedSessions / monthDays).toFixed(1)} 次`
    },
    {
      key: 'total',
      label: '总计',
      icon: 'lucide:infinity',
      color: '#ffd93d',
      stats: allTimeStats.value,
      extraLabel: '最长连击',
      extraValue: `${allTimeStats.value.longestStreak} 天`
    }
  ]
})
</script>

<template>
  <div class="stats-cards">
    <div
      v-for="card in cards"
      :key="card.key"
      class="stat-card"
      :style="{ '--card-color': card.color }"
    >
      <div class="card-header">
        <Icon :icon="card.icon" width="18" height="18" :style="{ color: card.color }" />
        <span class="card-label">{{ card.label }}</span>
      </div>

      <div class="card-metrics">
        <div class="metric">
          <span class="metric-value">{{ card.stats.completedSessions }}</span>
          <span class="metric-label">专注次数</span>
        </div>

        <div class="metric">
          <span class="metric-value">{{ formatDuration(card.stats.totalFocusTime) }}</span>
          <span class="metric-label">专注时长</span>
        </div>

        <div class="metric">
          <span class="metric-value">{{ card.stats.completionRate }}%</span>
          <span class="metric-label">完成率</span>
        </div>

        <div class="metric">
          <span class="metric-value">{{ formatAverage(card.stats.averageFocusTime) }}</span>
          <span class="metric-label">平均时长</span>
        </div>

        <div class="metric extra">
          <span class="metric-value">{{ card.extraValue }}</span>
          <span class="metric-label">{{ card.extraLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--card-color, rgba(255, 255, 255, 0.15));
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.card-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric {
  flex: 1 1 45%;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-value {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.metric-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
}

.metric.extra {
  flex: 1 1 100%;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

// 窄横屏适配
@media (max-width: 900px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

// 更窄的屏幕
@media (max-width: 600px) {
  .stat-card {
    padding: 12px;
  }

  .metric-value {
    font-size: 0.9rem;
  }

  .metric-label {
    font-size: 0.65rem;
  }
}
</style>
