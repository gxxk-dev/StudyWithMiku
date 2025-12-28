<template>
  <transition name="fade-down">
    <div v-if="show" class="server-panel-container" @click.stop>
      <div class="server-panel">
        <div class="server-header">
          <h4>选择计数服务器</h4>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="server-list">
          <div
            v-for="server in serverList"
            :key="server.id"
            class="server-item"
            :class="{ active: selectedServerId === server.id }"
            @click="handleSelect(server.id)"
          >
            <div class="server-info">
              <div class="server-name">{{ server.name }}</div>
              <div class="server-desc">{{ server.description }}</div>
            </div>
            <div class="server-status">
              <span v-if="selectedServerId === server.id && isConnected" class="status-badge">已连接</span>
              <span v-if="latencies[server.id]" class="latency">{{ latencies[server.id] }}ms</span>
            </div>
          </div>
        </div>

        <!-- 自定义服务器输入框 -->
        <div v-if="selectedServerId === 'custom'" class="custom-server-section">
          <input
            :value="customServerUrl"
            @input="$emit('update:customServerUrl', $event.target.value)"
            type="text"
            placeholder="wss://example.com/ws"
            class="custom-url-input"
          />
          <button @click="$emit('applyCustom')" class="apply-btn">应用</button>
        </div>

        <div class="server-panel-footer">
          <label class="auto-fallback-label">
            <input
              type="checkbox"
              :checked="autoFallback"
              @change="$emit('update:autoFallback', $event.target.checked)"
            />
            <span>连接失败时自动切换到默认服务器</span>
          </label>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  serverList: {
    type: Array,
    required: true
  },
  selectedServerId: {
    type: String,
    default: ''
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  latencies: {
    type: Object,
    default: () => ({})
  },
  customServerUrl: {
    type: String,
    default: ''
  },
  autoFallback: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'close',
  'select',
  'applyCustom',
  'update:customServerUrl',
  'update:autoFallback'
])

const handleSelect = (serverId) => {
  emit('select', serverId)
}
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.server-panel-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1003;
}

.server-panel {
  min-width: 320px;
  max-width: 400px;
  @include glass-panel;
  border-radius: $radius-lg;
  color: white;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid $glass-border;

  h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
}

.close-btn {
  @extend .pomodoro-close-btn;
}

.server-list {
  max-height: 300px;
  overflow-y: auto;
}

.server-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  cursor: pointer;
  transition: background 0.3s ease;
  border-radius: $radius-md;
  margin-bottom: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &.active {
    background: rgba($color-success, 0.2);
    border-left: 3px solid $color-success;
    padding-left: calc(0.8rem - 3px);
  }
}

.server-info {
  flex: 1;
}

.server-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.server-desc {
  font-size: 0.85rem;
  opacity: 0.7;
  line-height: 1.3;
}

.server-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.status-badge {
  background: rgba($color-success, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  white-space: nowrap;
}

.latency {
  font-size: 0.75rem;
  opacity: 0.8;
}

.custom-server-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid $glass-border;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.custom-url-input {
  @extend .pomodoro-input;
  flex: 1;
  padding: 0.5rem;
  font-size: 0.9rem;
}

.apply-btn {
  @extend .pomodoro-btn;
  @extend .pomodoro-btn--apply;
  padding: 0.5rem 1rem;
  white-space: nowrap;
}

.server-panel-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid $glass-border;
}

.auto-fallback-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;

  input[type="checkbox"] {
    cursor: pointer;
  }
}

// Transition
.fade-down-enter-active,
.fade-down-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.fade-down-enter-to,
.fade-down-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
