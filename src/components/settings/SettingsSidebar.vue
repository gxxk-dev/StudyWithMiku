<template>
  <nav class="settings-sidebar">
    <div class="nav-list">
      <button
        v-for="item in visibleNavItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeTab === item.id && !isHiddenTab }"
        @click="$emit('update:activeTab', item.id)"
      >
        <Icon :icon="item.icon" width="20" height="20" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'focus'
  },
  isPWA: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:activeTab'])

// 隐藏的 tab（不在侧边栏显示的）
const hiddenTabs = ['changelog']

// 当前 tab 是否是隐藏的
const isHiddenTab = computed(() => hiddenTabs.includes(props.activeTab))

const navItems = [
  { id: 'focus', icon: 'lucide:timer', label: '专注' },
  { id: 'media', icon: 'lucide:music', label: '媒体' },
  { id: 'account', icon: 'lucide:user', label: '账号' },
  { id: 'stats', icon: 'lucide:bar-chart-3', label: '统计' },
  { id: 'cache', icon: 'lucide:hard-drive', label: '缓存', pwaOnly: true },
  { id: 'about', icon: 'lucide:info', label: '关于' }
]

const visibleNavItems = computed(() => {
  return navItems.filter((item) => !item.pwaOnly || props.isPWA)
})
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
