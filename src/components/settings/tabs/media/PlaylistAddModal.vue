/** * @module PlaylistAddModal * 添加歌单弹窗，支持从 URL 添加和创建本地歌单 */
<script setup>
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  usePlaylistDetection,
  extractPlaylistId,
  detectPlatformFromText
} from '../../../../composables/usePlaylistDetection.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'add'])

/** 当前标签: 'url' | 'local' */
const activeTab = ref('url')

/** URL 模式字段 */
const urlInput = ref('')
const customName = ref('')
const urlLoading = ref(false)

/** 本地模式字段 */
const localName = ref('')

/** 平台检测 */
const { detectedPlatformHint } = usePlaylistDetection(urlInput)

/** 重置表单 */
const resetForm = () => {
  activeTab.value = 'url'
  urlInput.value = ''
  customName.value = ''
  localName.value = ''
  urlLoading.value = false
}

/** 监听弹窗打开/关闭 */
watch(
  () => props.isOpen,
  (open) => {
    if (!open) resetForm()
  }
)

/** 关闭 */
const close = () => {
  emit('close')
}

/** ESC 关闭 */
const onKeydown = (e) => {
  if (e.key === 'Escape') close()
}

/** 从 URL 添加歌单 */
const handleAddFromUrl = () => {
  const text = urlInput.value.trim()
  if (!text) return

  const detectedPlatform = detectPlatformFromText(text)
  const platform = detectedPlatform || 'netease'
  const sourceId = extractPlaylistId(text, platform)

  if (!sourceId) return

  urlLoading.value = true

  emit('add', {
    mode: 'playlist',
    name: customName.value.trim() || '',
    source: platform,
    sourceId
  })
}

/** 创建本地歌单 */
const handleCreateLocal = () => {
  const name = localName.value.trim()
  if (!name) return

  emit('add', {
    mode: 'collection',
    name,
    songs: []
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="modal-container">
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">添加歌单</h3>
            <button class="close-btn" @click="close">
              <Icon icon="mdi:close" width="20" height="20" />
            </button>
          </div>

          <!-- 标签切换 -->
          <div class="tab-bar">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'url' }"
              @click="activeTab = 'url'"
            >
              <Icon icon="mdi:link-variant" width="16" height="16" />
              从 URL 添加
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'local' }"
              @click="activeTab = 'local'"
            >
              <Icon icon="mdi:folder-plus-outline" width="16" height="16" />
              创建本地歌单
            </button>
          </div>

          <!-- URL 模式 -->
          <div v-if="activeTab === 'url'" class="modal-body">
            <div class="form-group">
              <label class="form-label">歌单 URL 或 ID</label>
              <input
                v-model="urlInput"
                type="text"
                class="form-input"
                placeholder="粘贴网易云/QQ音乐/Spotify链接..."
                @keydown.enter="handleAddFromUrl"
              />
              <Transition name="fade">
                <span v-if="detectedPlatformHint" class="detect-hint">
                  <Icon icon="mdi:check-circle" width="14" height="14" />
                  {{ detectedPlatformHint }}
                </span>
              </Transition>
            </div>

            <div class="form-group">
              <label class="form-label">歌单名称（可选）</label>
              <input
                v-model="customName"
                type="text"
                class="form-input"
                placeholder="留空使用原名称"
              />
            </div>

            <button
              class="primary-btn"
              :disabled="!urlInput.trim() || urlLoading"
              @click="handleAddFromUrl"
            >
              <Icon v-if="urlLoading" icon="mdi:loading" width="16" height="16" class="spin" />
              <Icon v-else icon="mdi:plus" width="16" height="16" />
              添加歌单
            </button>
          </div>

          <!-- 本地模式 -->
          <div v-if="activeTab === 'local'" class="modal-body">
            <div class="form-group">
              <label class="form-label">歌单名称</label>
              <input
                v-model="localName"
                type="text"
                class="form-input"
                placeholder="输入歌单名称..."
                @keydown.enter="handleCreateLocal"
              />
            </div>

            <button class="primary-btn" :disabled="!localName.trim()" @click="handleCreateLocal">
              <Icon icon="mdi:plus" width="16" height="16" />
              创建歌单
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  width: 90vw;
  max-width: 440px;
  background: rgba(30, 35, 45, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 8px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
}

.tab-btn.active {
  color: #39c5bb;
  background: rgba(57, 197, 187, 0.12);
}

/* 内容 */
.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.85rem;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.form-input:focus {
  border-color: rgba(57, 197, 187, 0.5);
  background: rgba(57, 197, 187, 0.06);
}

.detect-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 0.75rem;
  color: #39c5bb;
}

/* 主按钮 */
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #39c5bb;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn:hover:not(:disabled) {
  background: #2db3a9;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载动画 */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
