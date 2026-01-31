<script setup>
/**
 * 分享卡片 - SVG 趋势图组件
 * 展示近 30 天每日专注趋势
 */

import { computed } from 'vue'
import { useFocus } from '../../../../../composables/useFocus.js'

const { getDailyTrend } = useFocus()

/**
 * 图表尺寸配置
 */
const CHART = {
  width: 280,
  height: 80,
  paddingX: 8,
  paddingY: 8
}

/**
 * 趋势数据
 */
const trendData = computed(() => getDailyTrend({ days: 30 }))

/**
 * 计算 SVG 路径
 */
const chartPath = computed(() => {
  const data = trendData.value
  if (!data || data.length === 0) return { linePath: '', areaPath: '', maxValue: 0 }

  // 获取最大值
  const maxValue = Math.max(...data.map((d) => d.completedSessions), 1)

  // 计算可用绘图区域
  const drawWidth = CHART.width - CHART.paddingX * 2
  const drawHeight = CHART.height - CHART.paddingY * 2

  // 生成点坐标
  const points = data.map((d, i) => {
    const x = CHART.paddingX + (i / (data.length - 1)) * drawWidth
    const y = CHART.paddingY + drawHeight - (d.completedSessions / maxValue) * drawHeight
    return { x, y }
  })

  // 生成折线路径
  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ')

  // 生成填充区域路径
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x},${CHART.height - CHART.paddingY}` +
    ` L ${points[0].x},${CHART.height - CHART.paddingY} Z`

  return { linePath, areaPath, maxValue, points }
})

/**
 * 是否有数据
 */
const hasData = computed(() => {
  return trendData.value.some((d) => d.completedSessions > 0)
})
</script>

<template>
  <div class="trend-chart-section">
    <div class="chart-header">
      <span class="chart-title">近30天趋势</span>
    </div>
    <div class="chart-container">
      <svg v-if="hasData" :width="CHART.width" :height="CHART.height" class="trend-svg">
        <!-- 填充区域 -->
        <path :d="chartPath.areaPath" class="area-path" />
        <!-- 折线 -->
        <path :d="chartPath.linePath" class="line-path" />
        <!-- 数据点 -->
        <circle
          v-for="(point, index) in chartPath.points"
          :key="index"
          :cx="point.x"
          :cy="point.y"
          r="2"
          class="data-point"
        />
      </svg>
      <div v-else class="no-data">
        <span>暂无数据</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

.trend-chart-section {
  margin-bottom: 16px;
}

.chart-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.chart-container {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
}

.trend-svg {
  display: block;
}

.area-path {
  fill: rgba(57, 197, 187, 0.15);
}

.line-path {
  fill: none;
  stroke: $color-miku;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.data-point {
  fill: $color-miku;
}

.no-data {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.8rem;
}
</style>
