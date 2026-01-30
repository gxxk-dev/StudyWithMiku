<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus } from '../../../../composables/useFocus.js'
import { useHitokoto, HitokotoCategory } from '../../../../composables/useHitokoto.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const { allTimeStats, getHeatmapData } = useFocus()
const {
  hitokoto,
  loading: hitokotoLoading,
  fetchHitokoto,
  refresh: refreshHitokoto
} = useHitokoto()

const cardRef = ref(null)
const saving = ref(false)

const close = () => {
  emit('close')
}

// ESC 键关闭
const onKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
  }
}

/**
 * 获取当前月份标题
 */
const monthTitle = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月 学习报告`
})

/**
 * 格式化时长
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

/**
 * 获取迷你热力图数据（最近30天）
 */
const miniHeatmapData = computed(() => {
  const data = getHeatmapData({ days: 30 })

  // 组织成 5x6 或 6x5 的网格
  const rows = 5
  const cols = 6

  const grid = []
  for (let row = 0; row < rows; row++) {
    const rowData = []
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      if (index < data.length) {
        rowData.push(data[index])
      } else {
        rowData.push({ count: 0, level: 0 })
      }
    }
    grid.push(rowData)
  }

  return grid
})

/**
 * 保存为图片
 */
const saveAsImage = async () => {
  if (!cardRef.value || saving.value) return

  saving.value = true

  try {
    const { default: html2canvas } = await import('html2canvas')

    const canvas = await html2canvas(cardRef.value, {
      backgroundColor: '#1a1f25',
      scale: 2,
      useCORS: true,
      logging: false
    })

    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.download = `study-with-miku-${date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (err) {
    console.error('Failed to save image:', err)
  } finally {
    saving.value = false
  }
}

// 打开时获取一言
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && !hitokoto.value) {
      fetchHitokoto([HitokotoCategory.ANIMATION, HitokotoCategory.PHILOSOPHY])
    }
  }
)

onMounted(() => {
  if (props.isOpen && !hitokoto.value) {
    fetchHitokoto([HitokotoCategory.ANIMATION, HitokotoCategory.PHILOSOPHY])
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="share-modal-container">
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="close">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>

          <!-- 分享卡片预览 -->
          <div ref="cardRef" class="share-card">
            <!-- 头部 -->
            <div class="card-header">
              <div class="logo-section">
                <Icon icon="mdi:music-note" width="28" height="28" class="logo-icon" />
              </div>
              <div class="title-section">
                <h1 class="app-title">Study with Miku</h1>
                <p class="month-subtitle">{{ monthTitle }}</p>
              </div>
            </div>

            <!-- 迷你热力图 -->
            <div class="mini-heatmap-section">
              <div class="mini-heatmap">
                <div v-for="(row, rowIndex) in miniHeatmapData" :key="rowIndex" class="heatmap-row">
                  <div
                    v-for="(cell, colIndex) in row"
                    :key="colIndex"
                    class="heatmap-cell"
                    :class="`level-${cell.level}`"
                  />
                </div>
              </div>
            </div>

            <!-- 核心数据 -->
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

            <!-- 一言 -->
            <div class="hitokoto-section">
              <div v-if="hitokotoLoading" class="hitokoto-loading">
                <Icon icon="mdi:loading" width="20" height="20" class="spin" />
              </div>
              <template v-else-if="hitokoto">
                <p class="hitokoto-text">「{{ hitokoto.text }}」</p>
                <p class="hitokoto-from">—— {{ hitokoto.from }}</p>
              </template>
            </div>

            <!-- 底部品牌 -->
            <div class="card-footer">
              <span>Study with Miku</span>
              <span class="dot">·</span>
              <span>study.miku.fan</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <button
              class="action-btn secondary"
              :disabled="hitokotoLoading"
              @click="refreshHitokoto([HitokotoCategory.ANIMATION, HitokotoCategory.PHILOSOPHY])"
            >
              <Icon icon="mdi:refresh" width="18" height="18" :class="{ spin: hitokotoLoading }" />
              <span>换一言</span>
            </button>
            <button class="action-btn primary" :disabled="saving" @click="saveAsImage">
              <Icon icon="mdi:download" width="18" height="18" />
              <span>{{ saving ? '保存中...' : '保存图片' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.share-modal-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 6px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
}

// 分享卡片
.share-card {
  width: 320px;
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
}

.logo-icon {
  color: white;
}

.title-section {
  flex: 1;
}

.app-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 2px 0;
}

.month-subtitle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

// 迷你热力图
.mini-heatmap-section {
  margin-bottom: 20px;
}

.mini-heatmap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.heatmap-row {
  display: flex;
  gap: 3px;
  justify-content: center;
}

.heatmap-cell {
  width: 16px;
  height: 16px;
  border-radius: 3px;

  &.level-0 {
    background: rgba(255, 255, 255, 0.05);
  }

  &.level-1 {
    background: rgba(57, 197, 187, 0.25);
  }

  &.level-2 {
    background: rgba(57, 197, 187, 0.5);
  }

  &.level-3 {
    background: rgba(57, 197, 187, 0.75);
  }

  &.level-4 {
    background: rgba(57, 197, 187, 1);
  }
}

// 核心数据
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
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

// 一言
.hitokoto-section {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  margin-bottom: 20px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hitokoto-loading {
  display: flex;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
}

.hitokoto-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  margin: 0 0 8px 0;
  text-align: center;
}

.hitokoto-from {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  text-align: right;
}

// 底部品牌
.card-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
}

.dot {
  font-size: 0.5rem;
}

// 操作按钮
.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: $color-miku;
    color: white;

    &:hover:not(:disabled) {
      background: #2da8a0;
      transform: translateY(-2px);
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 旋转动画
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 过渡动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .share-card {
    transform: scale(0.9);
  }
}
</style>
