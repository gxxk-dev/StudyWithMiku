<template>
  <div class="advanced-tab">
    <!-- 服务器设置区域 -->
    <section class="server-section">
      <h4>计数服务器</h4>

      <div class="server-list">
        <div
          v-for="server in serverList"
          :key="server.id"
          class="server-item"
          :class="{ active: server.id === selectedServerId }"
          @click="selectServer(server.id)"
        >
          <div class="server-info">
            <strong>{{ server.name }}</strong>
            <small>{{ server.description }}</small>
          </div>
          <div class="server-status">
            <span v-if="isConnected && server.id === selectedServerId">
              已连接
              <span v-if="serverLatencies[server.id]" class="latency">
                {{ serverLatencies[server.id] }}ms
              </span>
            </span>
            <span v-else-if="server.id === selectedServerId" style="color: #FFC107;">
              连接中...
            </span>
            <span v-else style="color: rgba(255,255,255,0.3);">
              --
            </span>
          </div>
        </div>
      </div>

      <!-- 自定义服务器 -->
      <div v-if="selectedServerId === 'custom'" class="custom-server">
        <input
          :value="customServerUrl"
          @input="$emit('update:custom-server-url', $event.target.value)"
          type="url"
          placeholder="wss://example.com/ws"
        />
        <button @click="$emit('server-apply-custom')">应用</button>
      </div>

      <!-- 自动回退选项 -->
      <label class="auto-fallback-option">
        <input
          :checked="autoFallback"
          @change="$emit('update:auto-fallback', $event.target.checked)"
          type="checkbox"
        />
        连接失败时自动切换到默认服务器
      </label>
    </section>

    <div class="divider"></div>

    <!-- 缓存管理 -->
    <CachePanel @cache-clear="$emit('cache-clear', $event)" />
  </div>
</template>

<script setup>
import CachePanel from '../CachePanel.vue'

const props = defineProps({
  serverList: { type: Array, required: true },
  selectedServerId: { type: String, required: true },
  customServerUrl: { type: String, default: '' },
  autoFallback: { type: Boolean, default: true },
  isConnected: { type: Boolean, required: true },
  serverLatencies: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'server-select',
  'server-apply-custom',
  'update:custom-server-url',
  'update:auto-fallback',
  'cache-clear'
])

// 选择服务器
const selectServer = (serverId) => {
  emit('server-select', serverId)
}
</script>

<style scoped lang="scss">
@use '../../../styles/settings.scss' as *;

.advanced-tab {
  padding-bottom: 1rem;
}

.auto-fallback-option {
  margin-top: 1rem;
}

/* 其他样式已在 settings.scss 中定义 */
</style>
