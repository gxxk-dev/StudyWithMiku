<script setup>
import DevOverlay from '../DevOverlay.vue'
</script>

<template>
  <div class="tab-content">
    <div class="settings-section">
      <h3 class="section-title">歌单管理</h3>
      <p class="placeholder-text">添加和管理来自各平台的音乐歌单</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">音频设置</h3>
      <p class="placeholder-text">音量、淡入淡出和播放偏好</p>
    </div>

    <DevOverlay />
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
  position: relative;
  min-height: 100%;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
}

.placeholder-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}
</style>
