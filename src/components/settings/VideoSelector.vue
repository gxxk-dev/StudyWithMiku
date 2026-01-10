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
          <div class="item-label">视频 {{ index + 1 }}</div>
          <div class="item-url">{{ getVideoName(video) }}</div>
        </div>
      </div>
    </div>

    <!-- 自定义视频占位符 -->
    <div class="placeholder-section">
      <p class="placeholder-text">🎬 自定义视频功能正在开发中</p>
    </div>
  </div>
</template>

<script setup>
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

// 选择视频
const selectVideo = (index) => {
  emit('video-change', index)
}

// 从URL提取视频名称
const getVideoName = (url) => {
  try {
    const parts = url.split('/')
    return parts[parts.length - 1]
  } catch {
    return url
  }
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
</style>
