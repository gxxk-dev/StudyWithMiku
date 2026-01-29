<template>
  <div class="tab-content">
    <div class="settings-section">
      <h3 class="section-title">Playlist Management</h3>
      <p class="placeholder-text">Add and manage music playlists from various platforms</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Audio Settings</h3>
      <p class="placeholder-text">Volume, crossfade, and playback preferences</p>
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
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
