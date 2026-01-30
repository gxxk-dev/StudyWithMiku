<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip } from 'chart.js'
import { useFocus } from '../../../../composables/useFocus.js'

// 注册 Chart.js 组件
Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip)

const props = defineProps({
  days: {
    type: Number,
    default: 30
  }
})

const { getHourlyDistribution } = useFocus()

const canvasRef = ref(null)
let chartInstance = null

/**
 * 获取时段分布数据
 */
const hourlyData = computed(() => getHourlyDistribution({ days: props.days }))

/**
 * 创建图表
 */
const createChart = () => {
  if (!canvasRef.value) return

  const data = hourlyData.value
  const labels = data.map((d) => d.hour.toString())
  const values = data.map((d) => d.completedSessions)

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '专注次数',
          data: values,
          backgroundColor: 'rgba(57, 197, 187, 0.6)',
          hoverBackgroundColor: 'rgba(57, 197, 187, 0.8)',
          borderRadius: 4,
          barThickness: 10,
          maxBarThickness: 12
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
              const hour = parseInt(items[0].label)
              return `${hour}:00 - ${hour + 1}:00`
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
            callback: (value, index) => (index % 3 === 0 ? index : '')
          },
          grid: {
            display: false
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

  const data = hourlyData.value
  const values = data.map((d) => d.completedSessions)

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
watch(hourlyData, () => {
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
  <div class="hourly-chart">
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped>
.hourly-chart {
  width: 100%;
  height: 180px;
  position: relative;
}

.hourly-chart canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
