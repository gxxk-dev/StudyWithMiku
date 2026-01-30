<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useFocus, FocusMode, CompletionType } from '../../../../composables/useFocus.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  totalTime: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close'])

const { getRecordsByDate } = useFocus()

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
 * 格式化日期标题
 */
const formattedDate = computed(() => {
  const date = new Date(props.date)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = weekDays[date.getDay()]
  return `${year}年${month}月${day}日 ${weekDay}`
})

/**
 * 格式化时长
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

/**
 * 格式化时间 HH:MM
 */
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 获取当日详细记录
 */
const dayRecords = computed(() => {
  if (!props.date) return []

  const result = getRecordsByDate(props.date)
  if (!result.success) return []

  // 只显示专注记录，按时间排序
  return result.data
    .filter((r) => r.mode === FocusMode.FOCUS)
    .sort((a, b) => a.startTime - b.startTime)
    .map((r) => ({
      ...r,
      formattedStart: formatTime(r.startTime),
      formattedDuration: formatDuration(r.elapsed),
      isCompleted: r.completionType === CompletionType.COMPLETED
    }))
})

/**
 * 完成类型标签
 */
const getCompletionLabel = (type) => {
  switch (type) {
    case CompletionType.COMPLETED:
      return '完成'
    case CompletionType.CANCELLED:
      return '取消'
    case CompletionType.SKIPPED:
      return '跳过'
    case CompletionType.INTERRUPTED:
      return '中断'
    default:
      return '未知'
  }
}

/**
 * 完成类型样式类
 */
const getCompletionClass = (type) => {
  switch (type) {
    case CompletionType.COMPLETED:
      return 'completed'
    case CompletionType.CANCELLED:
      return 'cancelled'
    case CompletionType.SKIPPED:
      return 'skipped'
    case CompletionType.INTERRUPTED:
      return 'interrupted'
    default:
      return ''
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="modal-container">
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="close">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>

          <!-- 内容区域 -->
          <div class="modal-content">
            <!-- 日期标题 -->
            <h2 class="modal-title">{{ formattedDate }}</h2>

            <!-- 统计概览 -->
            <div class="stats-overview">
              <div class="stat-item">
                <Icon icon="mdi:check-circle-outline" width="20" height="20" />
                <span class="stat-value">{{ count }}</span>
                <span class="stat-label">完成番茄</span>
              </div>
              <div class="stat-item">
                <Icon icon="mdi:timer-outline" width="20" height="20" />
                <span class="stat-value">{{ formatDuration(totalTime) }}</span>
                <span class="stat-label">专注时长</span>
              </div>
            </div>

            <!-- 详细记录列表 -->
            <div class="records-section">
              <h3 class="section-title">
                <Icon icon="lucide:list" width="16" height="16" />
                <span>详细记录</span>
              </h3>

              <div v-if="dayRecords.length > 0" class="records-list">
                <div v-for="record in dayRecords" :key="record.id" class="record-item">
                  <div class="record-time">{{ record.formattedStart }}</div>
                  <div class="record-duration">{{ record.formattedDuration }}</div>
                  <div class="record-status" :class="getCompletionClass(record.completionType)">
                    {{ getCompletionLabel(record.completionType) }}
                  </div>
                </div>
              </div>

              <div v-else class="empty-state">
                <Icon icon="lucide:calendar-x" width="32" height="32" />
                <span>当日无专注记录</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
$color-miku: #39c5bb;
$color-focus: #ff6b6b;
$color-break: #4ecdc4;

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  position: relative;
  width: 90vw;
  max-width: 420px;
  max-height: 80vh;
  background: rgba(30, 35, 45, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 6px;
  color: rgba(255, 255, 255, 0.5);
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

.modal-content {
  padding: 24px;
  overflow-y: auto;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 20px 0;
  text-align: center;
}

// 统计概览
.stats-overview {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 16px 0;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: $color-miku;

  .stat-value {
    font-size: 1.4rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }

  .stat-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }
}

// 详细记录
.records-section {
  flex: 1;
  min-height: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 12px 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.record-time {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Courier New', monospace;
  min-width: 50px;
}

.record-duration {
  flex: 1;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.record-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;

  &.completed {
    background: rgba(57, 197, 187, 0.2);
    color: $color-miku;
  }

  &.cancelled {
    background: rgba(255, 107, 107, 0.2);
    color: $color-focus;
  }

  &.skipped {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
  }

  &.interrupted {
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);

  span {
    font-size: 0.9rem;
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

  .modal-container {
    transform: scale(0.9);
  }
}

// 滚动条样式
.records-list::-webkit-scrollbar {
  width: 6px;
}

.records-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.records-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
}
</style>
