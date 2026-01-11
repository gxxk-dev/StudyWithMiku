<template>
  <div class="video-selector">
    <h4>视频背景</h4>

    <div class="selector-list">
      <!-- 预设视频选项 -->
      <div
        v-for="(video, index) in videoList"
        :key="index"
        class="selector-item"
        :class="{ active: currentVideoIndex === index }"
        @click="selectVideo(index)"
      >
        <div class="radio-indicator"></div>
        <div class="item-info">
          <div class="item-label">{{ getVideoLabel(index) }}</div>
          <div class="item-url">{{ video }}</div>
        </div>
      </div>
    </div>

    <!-- 自定义视频占位符 -->
    <div class="placeholder-section">
      <p class="placeholder-text">
        <Icon icon="lucide:video" inline />
        自定义视频功能正在开发中
      </p>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  currentVideoIndex: {
    type: Number,
    default: 0
  },
  videoList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['video-change'])

// 视频名称映射
const videoLabels = ['PART 4', 'PART SEKAI', 'PART 1-3']

// 获取视频标签
const getVideoLabel = (index) => {
  return videoLabels[index] || `视频 ${index + 1}`
}

// 选择视频
const selectVideo = (index) => {
  emit('video-change', index)
}
</script>

<style scoped lang="scss">
@use '../../styles/settings.scss' as *;

.video-selector {
  h4 {
    color: white;
    font-size: 1rem;
    margin: 0 0 1rem 0;
    font-weight: 600;
  }

  .selector-list {
    margin-bottom: 1rem;
  }

  .placeholder-section {
    text-align: center;
    padding: 1.2rem;
    background: rgba(33, 150, 243, 0.1);
    border: 2px dashed rgba(33, 150, 243, 0.3);
    border-radius: 8px;
    margin-top: 1rem;
  }

  .placeholder-text {
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
    font-size: 0.9rem;
  }

  /* selector-item 样式已在 settings.scss 中定义 */
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .video-selector {
    height: 100%;
    display: flex;
    flex-direction: column;

    h4 {
      flex-shrink: 0;
      font-size: 0.9rem;
      margin-bottom: 0.8rem;
    }

    .selector-list {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 0.8rem;

      // 自定义滚动条
      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }
    }

    .placeholder-section {
      flex-shrink: 0;
      padding: 0.8rem;
      margin-top: 0.8rem;

      .placeholder-text {
        font-size: 0.8rem;
      }
    }
  }
}
</style>
