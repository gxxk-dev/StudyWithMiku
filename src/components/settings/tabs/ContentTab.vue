<template>
  <div class="content-tab">
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

    <!-- 分隔线 -->
    <div class="divider"></div>

    <!-- 视频选择器 -->
    <VideoSelector
      :current-video-index="currentVideoIndex"
      :video-list="videoList"
      @video-change="$emit('video-change', $event)"
    />
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
</style>
