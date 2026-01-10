<template>
  <div class="content-tab">
    <!-- 横屏左侧区域 -->
    <div class="content-left">
      <!-- 歌单管理占位符 -->
      <div class="placeholder-section">
        <p class="placeholder-text">🎵 歌单管理功能正在开发中</p>
      </div>

      <!-- 现有歌单面板 -->
      <PlaylistPanel
        :platforms="platforms"
        :initial-platform="platform"
        @apply="$emit('playlist-apply', $event)"
        @reset="$emit('playlist-reset')"
      />
    </div>

    <!-- 横屏右侧区域 -->
    <div class="content-right">
      <!-- 视频选择器 -->
      <VideoSelector
        :current-video-index="currentVideoIndex"
        :video-list="videoList"
        @video-change="$emit('video-change', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import PlaylistPanel from '../../pomodoro/PlaylistPanel.vue'
import VideoSelector from '../VideoSelector.vue'

const props = defineProps({
  platform: { type: String, required: true },
  songs: { type: Array, default: () => [] },
  platforms: { type: Array, required: true },
  currentVideoIndex: { type: Number, default: 0 },
  videoList: { type: Array, default: () => [] }
})

defineEmits(['playlist-apply', 'playlist-reset', 'video-change'])
</script>

<style scoped lang="scss">
@use '../../../styles/settings.scss' as *;

.content-tab {
  padding-bottom: 1rem;
}

.placeholder-section {
  text-align: center;
  padding: 1.5rem;
  background: rgba(156, 39, 176, 0.1);
  border: 2px dashed rgba(156, 39, 176, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.placeholder-text {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 0.95rem;
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .content-tab {
    display: flex;
    gap: 1rem;
    height: 100%;
    padding-bottom: 0;
  }

  .content-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;

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

  .content-right {
    flex: 0 0 45%;
    overflow-y: auto;

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
    padding: 0.8rem;
    margin-bottom: 0;

    .placeholder-text {
      font-size: 0.8rem;
    }
  }

  // 超小屏调整
  @media (max-width: 667px) {
    .content-left {
      flex: 0 0 50%;
    }

    .content-right {
      flex: 1;
    }
  }
}
</style>
