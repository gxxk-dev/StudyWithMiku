<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
} from 'chart.js'
import { useFocus } from '../../../../composables/useFocus.js'

// 注册 Chart.js 组件
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
)

const props = defineProps({
  days: {
    type: Number,
    default: 30
  }
})

const { getDailyTrend } = useFocus()

const canvasRef = ref(null)
let chartInstance = null

/**
 * 获取趋势数据
 */
const trendData = computed(() => getDailyTrend({ days: props.days }))

/**
 * 格式化日期为 MM-DD
 */
const formatLabel = (dateStr) => {
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}

/**
 * 创建图表
 */
const createChart = () => {
  if (!canvasRef.value) return

  const data = trendData.value
  const labels = data.map((d) => formatLabel(d.date))
  const values = data.map((d) => d.completedSessions)

  chartInstance = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '完成次数',
          data: values,
          borderColor: '#39c5bb',
          backgroundColor: 'rgba(57, 197, 187, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#39c5bb',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(30, 35, 45, 0.95)',
          titleColor: 'rgba(255, 255, 255, 0.9)',
          bodyColor: 'rgba(255, 255, 255, 0.7)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items) => {
              if (items.length === 0) return ''
              const index = items[0].dataIndex
              const date = new Date(trendData.value[index].date)
              return `${date.getMonth() + 1}月${date.getDate()}日`
            },
            label: (item) => `完成 ${item.raw} 次专注`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: { size: 10 },
            maxTicksLimit: 7,
            maxRotation: 0
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: { size: 10 },
            stepSize: 1,
            callback: (value) => (Number.isInteger(value) ? value : '')
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          beginAtZero: true
        }
      }
    }
  })
}

/**
 * 更新图表数据
 */
const updateChart = () => {
  if (!chartInstance) return

  const data = trendData.value
  const labels = data.map((d) => formatLabel(d.date))
  const values = data.map((d) => d.completedSessions)

  chartInstance.data.labels = labels
  chartInstance.data.datasets[0].data = values
  chartInstance.update('none')
}

/**
 * 销毁图表
 */
const destroyChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  destroyChart()
})

// 监听数据变化
watch(trendData, () => {
  updateChart()
})

// 监听天数变化
watch(
  () => props.days,
  () => {
    destroyChart()
    createChart()
  }
)
</script>

<template>
  <div class="trend-chart">
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped>
.trend-chart {
  width: 100%;
  height: 180px;
  position: relative;
}

.trend-chart canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
