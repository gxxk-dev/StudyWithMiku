<script setup>
/**
 * 分享卡片 - 迷你热力图组件
 * GitHub 风格的周布局，固定展示近 30 天数据
 */

import { computed } from 'vue'
import { useFocus } from '../../../../../composables/useFocus.js'

const { getHeatmapData } = useFocus()

/**
 * 固定配置：13 周（约 3 个月）
 */
const WEEKS = 14

/**
 * 周标签
 */
const weekLabels = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 获取 GitHub 风格的热力图数据
 * 返回 7 行，每行带标签和格子数据
 */
const heatmapRows = computed(() => {
  const data = getHeatmapData({ days: WEEKS * 7 + 7 })

  const dateMap = new Map()
  data.forEach((d) => {
    dateMap.set(d.date, d)
  })

  const today = new Date()
  const dayOfWeek = today.getDay()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + ((7 - dayOfWeek) % 7))

  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - WEEKS * 7 + 1)

  const grid = Array.from({ length: 7 }, () => [])
  const current = new Date(startDate)
  let weekIndex = 0

  while (current <= endDate) {
    const dateStr = formatDate(current)
    const dayIndex = (current.getDay() + 6) % 7

    const cellData = dateMap.get(dateStr) || { count: 0, level: 0, date: dateStr }

    while (grid[dayIndex].length < weekIndex) {
      grid[dayIndex].push({ count: 0, level: 0, empty: true })
    }
    grid[dayIndex].push(cellData)

    if (current.getDay() === 0) {
      weekIndex++
    }
    current.setDate(current.getDate() + 1)
  }

  grid.forEach((row) => {
    while (row.length < WEEKS) {
      row.push({ count: 0, level: 0, empty: true })
    }
  })

  return grid.map((cells, i) => ({ label: weekLabels[i], cells }))
})

/**
 * 格式化日期
 */
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<template>
  <div class="mini-heatmap-section">
    <div class="heatmap-grid">
      <div v-for="(row, rowIndex) in heatmapRows" :key="rowIndex" class="heatmap-row">
        <span class="week-label">{{ row.label }}</span>
        <div
          v-for="(cell, colIndex) in row.cells"
          :key="colIndex"
          class="heatmap-cell"
          :class="[`level-${cell.level}`, { empty: cell.empty }]"
        />
      </div>
    </div>
    <!-- 图例 -->
    <div class="heatmap-legend">
      <span class="legend-label">少</span>
      <div class="legend-cells">
        <div class="legend-cell level-0" />
        <div class="legend-cell level-1" />
        <div class="legend-cell level-2" />
        <div class="legend-cell level-3" />
        <div class="legend-cell level-4" />
      </div>
      <span class="legend-label">多</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;
$cell-gap: 3px;

.mini-heatmap-section {
  margin-bottom: 16px;
}

.heatmap-grid {
  display: flex;
  flex-direction: column;
  gap: $cell-gap;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.heatmap-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $cell-gap;
}

.week-label {
  width: 12px;
  flex-shrink: 0;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.35);
  text-align: right;
}

.heatmap-cell {
  width: 18px;
  height: 18px;
  border-radius: 3px;

  &.empty {
    visibility: hidden;
  }

  &.level-0 {
    background: rgba(255, 255, 255, 0.06);
  }

  &.level-1 {
    background: rgba(57, 197, 187, 0.3);
  }

  &.level-2 {
    background: rgba(57, 197, 187, 0.5);
  }

  &.level-3 {
    background: rgba(57, 197, 187, 0.75);
  }

  &.level-4 {
    background: $color-miku;
  }
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
  padding-right: 4px;
}

.legend-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
}

.legend-cells {
  display: flex;
  gap: 2px;
}

.legend-cell {
  width: 8px;
  height: 8px;
  border-radius: 2px;

  &.level-0 {
    background: rgba(255, 255, 255, 0.06);
  }

  &.level-1 {
    background: rgba(57, 197, 187, 0.3);
  }

  &.level-2 {
    background: rgba(57, 197, 187, 0.5);
  }

  &.level-3 {
    background: rgba(57, 197, 187, 0.75);
  }

  &.level-4 {
    background: $color-miku;
  }
}
</style>
