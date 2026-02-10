<template>
  <div class="tab-content">
    <div v-if="isAuthenticated" class="authenticated-view">
      <AccountProfilePanel />
      <AccountDeviceList />
      <AccountSyncPanel />
    </div>

    <div v-else-if="isLoading" class="loading-state">
      <Icon icon="eos-icons:loading" width="32" height="32" />
    </div>

    <div v-else class="unauthenticated-view">
      <AccountLoginPanel />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuth } from '../../../composables/useAuth.js'
import AccountLoginPanel from './account/AccountLoginPanel.vue'
import AccountProfilePanel from './account/AccountProfilePanel.vue'
import AccountDeviceList from './account/AccountDeviceList.vue'
import AccountSyncPanel from './account/AccountSyncPanel.vue'

const { isAuthenticated, isLoading, fetchConfig } = useAuth()

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped>
.tab-content {
  padding: 24px;
  position: relative;
  min-height: 100%;
}

.authenticated-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 20px;
}

.unauthenticated-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
