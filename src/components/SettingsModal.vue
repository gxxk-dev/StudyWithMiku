<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="settings-overlay" @click.self="$emit('close')">
      <div class="settings-modal">
        <!-- 头部 -->
        <div class="modal-header">
          <h2 class="modal-title">设置</h2>
          <button class="close-btn" @click="$emit('close')">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>

        <!-- 主体：双栏布局 -->
        <div class="modal-body">
          <!-- 左侧导航 -->
          <SettingsSidebar v-model:active-tab="activeTab" :is-p-w-a="isPWA" />

          <!-- 右侧内容 -->
          <div class="content-area">
            <Transition :name="transitionName">
              <component
                :is="currentTabComponent"
                :key="activeTab"
                @navigate="setActiveTab"
                @request-merge="(e) => emit('request-merge', e)"
              />
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePWA } from '../composables/usePWA.js'
import SettingsSidebar from './settings/SettingsSidebar.vue'
import TabFocus from './settings/tabs/TabFocus.vue'
import TabMedia from './settings/tabs/TabMedia.vue'
import TabAccount from './settings/tabs/TabAccount.vue'
import TabStats from './settings/tabs/TabStats.vue'
import TabCache from './settings/tabs/TabPWA.vue'
import TabAbout from './settings/tabs/TabAbout.vue'
import TabChangelog from './settings/tabs/TabChangelog.vue'
import TabHooks from './settings/tabs/TabHooks.vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'request-merge'])

const { isPWA } = usePWA()

const activeTab = ref('about')
const slideDirection = ref('right')

const tabOrder = ['focus', 'media', 'account', 'stats', 'hooks', 'cache', 'about', 'changelog']

const tabComponents = {
  focus: TabFocus,
  media: TabMedia,
  account: TabAccount,
  stats: TabStats,
  hooks: TabHooks,
  cache: TabCache,
  about: TabAbout,
  changelog: TabChangelog
}

const currentTabComponent = computed(() => {
  return tabComponents[activeTab.value] || TabFocus
})

const transitionName = computed(() => `tab-slide-${slideDirection.value}`)

const setActiveTab = (tab) => {
  const oldIndex = tabOrder.indexOf(activeTab.value)
  const newIndex = tabOrder.indexOf(tab)
  slideDirection.value = newIndex > oldIndex ? 'right' : 'left'
  activeTab.value = tab
}

defineExpose({ setActiveTab })

// ESC 键关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* 遮罩 */
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* 模态框 */
.settings-modal {
  width: 90vw;
  height: 85vh;
  max-width: 1000px;
  max-height: 650px;
  background: rgba(30, 35, 40, 0.95);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: white;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* 头部 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* 主体 */
.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 内容区域 */
.content-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.content-area > :deep(*) {
  overflow-y: auto;
  height: 100%;
}

/* 滚动条样式 */
.content-area > :deep(*)::-webkit-scrollbar {
  width: 6px;
}

.content-area > :deep(*)::-webkit-scrollbar-track {
  background: transparent;
}

.content-area > :deep(*)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.content-area > :deep(*)::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Tab 切换动画 */
.tab-slide-right-enter-active,
.tab-slide-right-leave-active,
.tab-slide-left-enter-active,
.tab-slide-left-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.tab-slide-right-leave-active,
.tab-slide-left-leave-active {
  position: absolute;
  inset: 0;
}

.tab-slide-right-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.tab-slide-right-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.tab-slide-left-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.tab-slide-left-leave-to {
  transform: translateX(30px);
  opacity: 0;
}

/* 响应式 */
@media (max-width: 600px) {
  .settings-modal {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  .settings-overlay {
    padding: 0;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .modal-title {
    font-size: 1.1rem;
  }
}
</style>
