<template>
  <div class="tab-content">
    <div class="settings-section">
      <h3 class="section-title">Version</h3>
      <p class="placeholder-text">Application version and build information</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Credits</h3>
      <p class="placeholder-text">Contributors and acknowledgments</p>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Links</h3>
      <p class="placeholder-text">GitHub repository and documentation</p>
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
