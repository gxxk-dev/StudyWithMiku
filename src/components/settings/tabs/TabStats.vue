<template>
  <div class="tab-content">
    <div class="settings-section">
      <h3 class="section-title">Today</h3>
      <p class="placeholder-text">Focus sessions and time spent today</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">This Week</h3>
      <p class="placeholder-text">Weekly progress and trends</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">All Time</h3>
      <p class="placeholder-text">Total statistics and heatmap</p>
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
