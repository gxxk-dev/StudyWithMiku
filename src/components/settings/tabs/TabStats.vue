<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus, ExportFormat } from '../../../composables/useFocus.js'
import StatsCards from './stats/StatsCards.vue'
import StatsHeatmap from './stats/StatsHeatmap.vue'
import StatsDateModal from './stats/StatsDateModal.vue'
import StatsTrendChart from './stats/StatsTrendChart.vue'
import StatsHourlyChart from './stats/StatsHourlyChart.vue'
import StatsShareCard from './stats/StatsShareCard.vue'

const { exportData } = useFocus()

// 热力图时间范围（固定显示一年）
const heatmapRange = ref(365)

// 日期详情弹窗
const selectedDate = ref(null)
const showDateModal = computed({
  get: () => selectedDate.value !== null,
  set: (val) => {
    if (!val) selectedDate.value = null
  }
})

// 分享卡片弹窗（功能开发中，暂时禁用）
// eslint-disable-next-line no-unused-vars
const showShareCard = ref(false)

// 导出菜单
const showExportMenu = ref(false)

/**
 * 处理热力图日期选中
 */
const handleSelectDate = (data) => {
  selectedDate.value = data
}

/**
 * 关闭日期详情弹窗
 */
const closeDateModal = () => {
  selectedDate.value = null
}

// eslint-disable-next-line no-unused-vars
const openShareCard = () => {
  showShareCard.value = true
}
// eslint-disable-next-line no-unused-vars
const closeShareCard = () => {
  showShareCard.value = false
}

/**
 * 切换导出菜单
 */
const toggleExportMenu = () => {
  showExportMenu.value = !showExportMenu.value
}

/**
 * 处理导出
 */
const handleExport = (format) => {
  showExportMenu.value = false

  const result = exportData(format, {
    download: true,
    includeStats: true
  })

  if (!result.success) {
    console.error('Export failed:', result.error)
  }
}

/**
 * 点击外部关闭导出菜单
 */
const handleClickOutside = (e) => {
  if (!e.target.closest('.export-dropdown')) {
    showExportMenu.value = false
  }
}
</script>

<template>
  <div class="tab-content" @click="handleClickOutside">
    <!-- 数据卡片 -->
    <section class="stats-section">
      <StatsCards />
    </section>

    <!-- 热力图 -->
    <section class="stats-section">
      <div class="section-header">
        <h3 class="section-title">
          <Icon icon="lucide:calendar-check" width="18" height="18" />
          <span>专注热力图</span>
        </h3>
      </div>

      <StatsHeatmap :days="heatmapRange" @select-date="handleSelectDate" />

      <div class="heatmap-actions">
        <button class="action-btn disabled" disabled title="开发中">
          <Icon icon="lucide:share-2" width="16" height="16" />
          <span>生成分享卡片</span>
          <Icon icon="mdi:hammer-wrench" width="14" height="14" class="dev-icon" />
        </button>

        <div class="export-dropdown">
          <button class="action-btn" @click.stop="toggleExportMenu">
            <Icon icon="lucide:download" width="16" height="16" />
            <span>导出数据</span>
            <Icon
              icon="mdi:chevron-down"
              width="16"
              height="16"
              :class="{ rotated: showExportMenu }"
            />
          </button>

          <Transition name="dropdown-fade">
            <div v-if="showExportMenu" class="dropdown-menu">
              <button class="dropdown-item" @click="handleExport(ExportFormat.JSON)">
                <Icon icon="mdi:code-json" width="16" height="16" />
                <span>JSON（完整备份）</span>
              </button>
              <button class="dropdown-item" @click="handleExport(ExportFormat.CSV)">
                <Icon icon="mdi:file-delimited" width="16" height="16" />
                <span>CSV（表格分析）</span>
              </button>
              <button class="dropdown-item" @click="handleExport(ExportFormat.MARKDOWN)">
                <Icon icon="mdi:language-markdown" width="16" height="16" />
                <span>Markdown（笔记软件）</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- 图表区域 -->
    <section class="stats-section charts-section">
      <div class="chart-container">
        <h3 class="section-title">
          <Icon icon="lucide:trending-up" width="18" height="18" />
          <span>每日趋势（近30天）</span>
        </h3>
        <StatsTrendChart :days="30" />
      </div>

      <div class="chart-container">
        <h3 class="section-title">
          <Icon icon="lucide:clock" width="18" height="18" />
          <span>时段分布（近30天）</span>
        </h3>
        <StatsHourlyChart :days="30" />
      </div>
    </section>

    <!-- 日期详情弹窗 -->
    <StatsDateModal
      v-if="selectedDate"
      :is-open="showDateModal"
      :date="selectedDate.date"
      :count="selectedDate.count"
      :total-time="selectedDate.totalTime"
      @close="closeDateModal"
    />

    <!-- 分享卡片弹窗 -->
    <StatsShareCard :is-open="showShareCard" @close="closeShareCard" />
  </div>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

.tab-content {
  padding: 24px;
  min-height: 100%;
  overflow-y: auto;
}

.stats-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

// 时间范围切换器
.range-switcher {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px;
  border-radius: 8px;
}

.range-btn {
  padding: 4px 10px;
  font-size: 0.75rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  &.active {
    background: $color-miku;
    color: white;
  }
}

// 热力图操作按钮
.heatmap-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
  }

  &.disabled,
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .rotated {
    transform: rotate(180deg);
  }

  .dev-icon {
    color: #f59e0b;
    margin-left: 2px;
  }
}

// 导出下拉菜单
.export-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  background: rgba(30, 35, 45, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 6px;
  z-index: 100;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  font-size: 0.85rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  &:hover {
    background: rgba(57, 197, 187, 0.15);
    color: $color-miku;
  }
}

// 图表区域
.charts-section {
  display: flex;
  gap: 20px;
}

.chart-container {
  flex: 1;
  min-width: 0;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;

  .section-title {
    font-size: 0.9rem;
    margin-bottom: 12px;
  }
}

// 下拉菜单过渡
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

// 响应式
@media (max-width: 900px) {
  .charts-section {
    flex-direction: column;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .heatmap-actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 600px) {
  .tab-content {
    padding: 16px;
  }

  .stats-section {
    margin-bottom: 20px;
  }

  .action-btn {
    padding: 6px 10px;
    font-size: 0.75rem;
  }

  .chart-container {
    padding: 12px;
  }
}
</style>
