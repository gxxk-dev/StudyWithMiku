<script setup>
import { computed, ref } from 'vue'
import { useFocus } from '../../../../composables/useFocus.js'

const props = defineProps({
  days: {
    type: Number,
    default: 90,
    validator: (v) => [90, 180, 365].includes(v)
  }
})

const emit = defineEmits(['select-date'])

const { getHeatmapData } = useFocus()

// 获取热力图数据
const heatmapData = computed(() => getHeatmapData({ days: props.days }))

// Tooltip 状态
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipContent = ref({ date: '', count: 0, totalTime: 0 })

/**
 * 根据日期计算周数和偏移
 */
const gridData = computed(() => {
  const data = heatmapData.value
  if (!data || data.length === 0) return { cells: [], weeks: 0, monthLabels: [] }

  // 计算起始日期是周几（0=周日，1=周一...）
  const firstDate = new Date(data[0].date)
  const firstDayOfWeek = firstDate.getDay()
  // 转换为周一为0的索引
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // 构建单元格数组
  const cells = []
  const monthLabels = []
  let lastMonth = -1

  // 添加空白单元格对齐
  for (let i = 0; i < startOffset; i++) {
    cells.push({ empty: true, row: i, col: 0 })
  }

  // 添加数据单元格
  data.forEach((item, index) => {
    const cellIndex = index + startOffset
    const col = Math.floor(cellIndex / 7)
    const row = cellIndex % 7

    cells.push({
      ...item,
      row,
      col,
      empty: false
    })

    // 记录月份标签位置
    const date = new Date(item.date)
    const month = date.getMonth()
    if (month !== lastMonth) {
      monthLabels.push({
        month: getMonthName(month),
        col
      })
      lastMonth = month
    }
  })

  const weeks = Math.ceil((data.length + startOffset) / 7)

  return { cells, weeks, monthLabels }
})

/**
 * 获取月份简称
 */
const getMonthName = (month) => {
  const names = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月'
  ]
  return names[month]
}

/**
 * 获取星期标签
 */
const weekLabels = ['一', '', '三', '', '五', '', '日']

/**
 * 格式化时长
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * 格式化日期显示
 */
const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 处理单元格悬停
 */
const handleCellHover = (event, cell) => {
  if (cell.empty) return

  tooltipContent.value = {
    date: formatDateDisplay(cell.date),
    count: cell.count,
    totalTime: cell.totalTime
  }

  const rect = event.target.getBoundingClientRect()
  const containerRect = event.target.closest('.heatmap-container').getBoundingClientRect()

  tooltipX.value = rect.left - containerRect.left + rect.width / 2
  tooltipY.value = rect.top - containerRect.top - 8
  tooltipVisible.value = true
}

/**
 * 隐藏 Tooltip
 */
const hideTooltip = () => {
  tooltipVisible.value = false
}

/**
 * 处理单元格点击
 */
const handleCellClick = (cell) => {
  if (cell.empty || cell.count === 0) return

  emit('select-date', {
    date: cell.date,
    count: cell.count,
    totalTime: cell.totalTime
  })
}
</script>

<template>
  <div class="heatmap-container">
    <!-- 月份标签 -->
    <div class="month-labels" :style="{ '--weeks': gridData.weeks }">
      <span
        v-for="(label, index) in gridData.monthLabels"
        :key="index"
        class="month-label"
        :style="{ gridColumn: label.col + 2 }"
      >
        {{ label.month }}
      </span>
    </div>

    <!-- 热力图主体 -->
    <div class="heatmap-body">
      <!-- 星期标签 -->
      <div class="week-labels">
        <span v-for="(label, index) in weekLabels" :key="index" class="week-label">
          {{ label }}
        </span>
      </div>

      <!-- 网格 -->
      <div class="heatmap-grid" :style="{ '--weeks': gridData.weeks }">
        <div
          v-for="(cell, index) in gridData.cells"
          :key="index"
          class="heatmap-cell"
          :class="[
            `level-${cell.level || 0}`,
            { empty: cell.empty, clickable: !cell.empty && cell.count > 0 }
          ]"
          :style="{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }"
          @mouseenter="handleCellHover($event, cell)"
          @mouseleave="hideTooltip"
          @click="handleCellClick(cell)"
        />
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <span class="legend-label">少</span>
      <div class="legend-cell level-0" />
      <div class="legend-cell level-1" />
      <div class="legend-cell level-2" />
      <div class="legend-cell level-3" />
      <div class="legend-cell level-4" />
      <span class="legend-label">多</span>
    </div>

    <!-- Tooltip -->
    <Transition name="tooltip-fade">
      <div
        v-if="tooltipVisible"
        class="heatmap-tooltip"
        :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      >
        <div class="tooltip-date">{{ tooltipContent.date }}</div>
        <div class="tooltip-stats">
          <span v-if="tooltipContent.count > 0">
            {{ tooltipContent.count }} 次专注 · {{ formatDuration(tooltipContent.totalTime) }}
          </span>
          <span v-else>无专注记录</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

// 热力图颜色等级
$heatmap-colors: (
  0: rgba(255, 255, 255, 0.05),
  1: rgba(57, 197, 187, 0.25),
  2: rgba(57, 197, 187, 0.5),
  3: rgba(57, 197, 187, 0.75),
  4: rgba(57, 197, 187, 1)
);

.heatmap-container {
  position: relative;
  width: 100%;
  padding-bottom: 8px;
}

.month-labels {
  display: grid;
  // 使用 1fr 让单元格自适应宽度铺满
  grid-template-columns: 24px repeat(var(--weeks), 1fr);
  gap: 1px;
  margin-bottom: 2px;
  padding-left: 0;
  min-height: 16px;
}

.month-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: visible;
}

.heatmap-body {
  display: flex;
  gap: 2px;
}

.week-labels {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 20px;
  flex-shrink: 0;
}

.week-label {
  // 使用 1fr 让高度自适应
  flex: 1;
  min-height: 8px;
  max-height: 16px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
}

.heatmap-grid {
  display: grid;
  flex: 1;
  grid-template-rows: repeat(7, 1fr);
  grid-template-columns: repeat(var(--weeks), 1fr);
  gap: 1px;
}

.heatmap-cell {
  // 使用 aspect-ratio 保持正方形
  aspect-ratio: 1;
  min-width: 6px;
  min-height: 6px;
  max-width: 16px;
  max-height: 16px;
  width: 100%;
  height: auto;
  border-radius: 2px;
  transition: all 0.15s ease;

  @each $level, $color in $heatmap-colors {
    &.level-#{$level} {
      background: $color;
    }
  }

  &.empty {
    background: transparent;
  }

  &.clickable {
    cursor: pointer;

    &:hover {
      transform: scale(1.3);
      box-shadow: 0 0 8px rgba(57, 197, 187, 0.6);
      z-index: 10;
    }
  }

  &:not(.clickable):not(.empty):hover {
    transform: scale(1.2);
    z-index: 10;
  }
}

.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  justify-content: flex-end;
}

.legend-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
}

.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;

  @each $level, $color in $heatmap-colors {
    &.level-#{$level} {
      background: $color;
    }
  }
}

// Tooltip
.heatmap-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  background: rgba(30, 35, 45, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
}

.tooltip-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2px;
}

.tooltip-stats {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

// Tooltip 过渡
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
