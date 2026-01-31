<template>
  <nav class="settings-sidebar">
    <div class="nav-list">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeTab === item.id }"
        @click="$emit('update:activeTab', item.id)"
      >
        <Icon :icon="item.icon" width="20" height="20" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  activeTab: {
    type: String,
    default: 'focus'
  }
})

defineEmits(['update:activeTab'])

const navItems = [
  { id: 'focus', icon: 'lucide:timer', label: '专注' },
  { id: 'media', icon: 'lucide:music', label: '媒体' },
  { id: 'stats', icon: 'lucide:bar-chart-3', label: '统计' },
  { id: 'about', icon: 'lucide:info', label: '关于' }
]
</script>

<style scoped>
.settings-sidebar {
  width: 150px;
  min-width: 150px;
  background: rgba(20, 25, 30, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
  text-align: left;
  font-size: 0.85rem;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.nav-item.active {
  background: rgba(57, 197, 187, 0.15);
  border-left-color: #39c5bb;
  color: #39c5bb;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
}

/* 响应式 - 窄屏幕只显示图标 */
@media (max-width: 800px) {
  .settings-sidebar {
    width: 60px;
    min-width: 60px;
  }

  .nav-item {
    justify-content: center;
    padding: 10px;
  }

  .nav-label {
    display: none;
  }
}
</style>
