<template>
  <div class="tab-content">
    <div class="settings-section">
      <h3 class="section-title">Timer Duration</h3>
      <p class="placeholder-text">Configure focus and break durations</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Automation</h3>
      <p class="placeholder-text">Auto-start breaks and focus sessions</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Notifications</h3>
      <p class="placeholder-text">Sound and browser notification settings</p>
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
