<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { providerRegistry } from '../../../../composables/hooks/providerRegistry.js'

const providers = computed(() => providerRegistry.getAll())
</script>

<template>
  <div v-if="providers.length > 0" class="provider-grid">
    <div
      v-for="p in providers"
      :key="p.id"
      class="provider-card"
      :class="{ available: p.getStatus().available }"
    >
      <Icon :icon="p.icon" width="20" height="20" class="provider-icon" />
      <div class="provider-info">
        <span class="provider-name">{{ p.name }}</span>
        <span class="provider-status" :class="{ ok: p.getStatus().available }">
          {{ p.getStatus().label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 20px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.provider-card.available {
  border-color: rgba(57, 197, 187, 0.25);
}

.provider-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.5);
}

.provider-card.available .provider-icon {
  color: #39c5bb;
}

.provider-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.provider-name {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-status {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.provider-status.ok {
  color: #39c5bb;
}
</style>
