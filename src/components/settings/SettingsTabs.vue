<template>
  <div class="settings-tabs">
    <!-- 标签导航 -->
    <div class="tabs-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{
          'active': activeTab === tab.id,
          'pomodoro-active': activeTab === 'pomodoro' && tab.id === 'pomodoro',
          'content-active': activeTab === 'content' && tab.id === 'content',
          'advanced-active': activeTab === 'advanced' && tab.id === 'advanced'
        }"
        @click="switchTab(tab.id)"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- 标签内容 -->
    <transition name="tab-slide" mode="out-in">
      <div :key="activeTab" class="tab-content">
        <component
          :is="currentTabComponent"
          v-bind="tabProps"
          v-on="tabEvents"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, provide } from 'vue'
import { safeLocalStorageGet, safeLocalStorageSet } from '../../utils/storage.js'

// 导入标签页组件
import PomodoroTab from './tabs/PomodoroTab.vue'
import ContentTab from './tabs/ContentTab.vue'
import AdvancedTab from './tabs/AdvancedTab.vue'

const props = defineProps({
  // 番茄钟状态
  focusDuration: { type: Number, required: true },
  breakDuration: { type: Number, required: true },
  timeLeft: { type: Number, required: true },
  isRunning: { type: Boolean, required: true },
  completedPomodoros: { type: Number, required: true },
  formattedMinutes: { type: String, required: true },
  formattedSeconds: { type: String, required: true },
  statusText: { type: String, required: true },
  statusClass: { type: String, required: true },
  totalTime: { type: Number, required: true },

  // 音乐状态
  platform: { type: String, required: true },
  songs: { type: Array, default: () => [] },
  platforms: { type: Array, required: true },

  // 服务器状态
  serverList: { type: Array, required: true },
  selectedServerId: { type: String, required: true },
  customServerUrl: { type: String, default: '' },
  autoFallback: { type: Boolean, default: true },
  isConnected: { type: Boolean, required: true },
  serverLatencies: { type: Object, default: () => ({}) },

  // 视频状态（从 App.vue 传入）
  currentVideoIndex: { type: Number, default: 0 },
  videoList: { type: Array, default: () => [] }
})

const emit = defineEmits([
  // 番茄钟事件
  'timer-start',
  'timer-pause',
  'timer-reset',
  'update:focus-duration',
  'update:break-duration',

  // 歌单事件
  'playlist-apply',
  'playlist-reset',

  // 服务器事件
  'server-select',
  'server-apply-custom',
  'update:custom-server-url',
  'update:auto-fallback',

  // 视频事件
  'video-change',

  // 缓存事件
  'cache-clear'
])

// 标签配置
const tabs = [
  { id: 'pomodoro', label: '番茄钟', icon: '🍅' },
  { id: 'content', label: '内容', icon: '🎵' },
  { id: 'advanced', label: '高级', icon: '⚙️' }
]

// 当前激活的标签页
const activeTab = ref(safeLocalStorageGet('settings_active_tab', 'pomodoro'))

// 监听标签变化并持久化
watch(activeTab, (newTab) => {
  safeLocalStorageSet('settings_active_tab', newTab)
})

// 切换标签
const switchTab = (tabId) => {
  activeTab.value = tabId
}

// 当前标签页组件
const currentTabComponent = computed(() => {
  const components = {
    'pomodoro': PomodoroTab,
    'content': ContentTab,
    'advanced': AdvancedTab
  }
  return components[activeTab.value]
})

// 传递给标签页的 props
const tabProps = computed(() => {
  if (activeTab.value === 'pomodoro') {
    return {
      focusDuration: props.focusDuration,
      breakDuration: props.breakDuration,
      timeLeft: props.timeLeft,
      isRunning: props.isRunning,
      completedPomodoros: props.completedPomodoros,
      formattedMinutes: props.formattedMinutes,
      formattedSeconds: props.formattedSeconds,
      statusText: props.statusText,
      statusClass: props.statusClass,
      totalTime: props.totalTime
    }
  } else if (activeTab.value === 'content') {
    return {
      platform: props.platform,
      songs: props.songs,
      platforms: props.platforms,
      currentVideoIndex: props.currentVideoIndex,
      videoList: props.videoList
    }
  } else if (activeTab.value === 'advanced') {
    return {
      serverList: props.serverList,
      selectedServerId: props.selectedServerId,
      customServerUrl: props.customServerUrl,
      autoFallback: props.autoFallback,
      isConnected: props.isConnected,
      serverLatencies: props.serverLatencies
    }
  }

  return {}
})

// 传递给标签页的事件
const tabEvents = computed(() => {
  if (activeTab.value === 'pomodoro') {
    return {
      'timer-start': () => emit('timer-start'),
      'timer-pause': () => emit('timer-pause'),
      'timer-reset': () => emit('timer-reset'),
      'update:focus-duration': (val) => emit('update:focus-duration', val),
      'update:break-duration': (val) => emit('update:break-duration', val)
    }
  } else if (activeTab.value === 'content') {
    return {
      'playlist-apply': (payload) => emit('playlist-apply', payload),
      'playlist-reset': () => emit('playlist-reset'),
      'video-change': (index) => emit('video-change', index)
    }
  } else if (activeTab.value === 'advanced') {
    return {
      'server-select': (id) => emit('server-select', id),
      'server-apply-custom': () => emit('server-apply-custom'),
      'update:custom-server-url': (val) => emit('update:custom-server-url', val),
      'update:auto-fallback': (val) => emit('update:auto-fallback', val),
      'cache-clear': (type) => emit('cache-clear', type)
    }
  }

  return {}
})

// 提供状态给子组件（使用 provide/inject 避免 props 层级过深）
provide('pomodoroState', computed(() => ({
  focusDuration: props.focusDuration,
  breakDuration: props.breakDuration,
  timeLeft: props.timeLeft,
  isRunning: props.isRunning,
  completedPomodoros: props.completedPomodoros,
  formattedMinutes: props.formattedMinutes,
  formattedSeconds: props.formattedSeconds,
  statusText: props.statusText,
  statusClass: props.statusClass,
  totalTime: props.totalTime
})))

provide('musicState', computed(() => ({
  platform: props.platform,
  songs: props.songs,
  platforms: props.platforms
})))

provide('serverState', computed(() => ({
  serverList: props.serverList,
  selectedServerId: props.selectedServerId,
  customServerUrl: props.customServerUrl,
  autoFallback: props.autoFallback,
  isConnected: props.isConnected,
  serverLatencies: props.serverLatencies
})))

provide('videoState', computed(() => ({
  currentVideoIndex: props.currentVideoIndex,
  videoList: props.videoList
})))
</script>

<style scoped lang="scss">
@use '../../styles/settings.scss' as *;

.settings-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
