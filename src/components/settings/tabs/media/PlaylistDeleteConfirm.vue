/** * @module PlaylistDeleteConfirm * 歌单删除确认弹窗 */
<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  /** @type {import('../../../../types/playlist.js').Playlist|null} */
  playlist: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'confirm'])

const deleteLocalFiles = ref(false)

const close = () => {
  deleteLocalFiles.value = false
  emit('close')
}

const onKeydown = (e) => {
  if (e.key === 'Escape') close()
}

const handleConfirm = () => {
  if (!props.playlist) return
  emit('confirm', {
    id: props.playlist.id,
    deleteLocalFiles: deleteLocalFiles.value
  })
  deleteLocalFiles.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="modal-container">
          <div class="modal-body">
            <div class="warning-icon">
              <Icon icon="mdi:alert-outline" width="36" height="36" />
            </div>

            <h3 class="confirm-title">删除歌单？</h3>
            <p class="confirm-text">确定要删除「{{ playlist?.name }}」吗？此操作无法撤销。</p>

            <!-- collection 模式可选删除本地文件 -->
            <label v-if="playlist?.mode === 'collection'" class="checkbox-row">
              <input v-model="deleteLocalFiles" type="checkbox" class="checkbox" />
              <span class="checkbox-label">同时删除本地音频文件</span>
            </label>

            <div class="btn-row">
              <button class="cancel-btn" @click="close">取消</button>
              <button class="danger-btn" @click="handleConfirm">删除</button>
            </div>
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
  max-width: 360px;
  background: rgba(30, 35, 45, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-body {
  padding: 28px 24px;
  text-align: center;
}

.warning-icon {
  color: #ef5350;
  margin-bottom: 12px;
}

.confirm-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
}

.confirm-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

/* 复选框 */
.checkbox-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  cursor: pointer;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: #ef5350;
  cursor: pointer;
}

.checkbox-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

/* 按钮 */
.btn-row {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.cancel-btn {
  padding: 8px 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.danger-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: #ef5350;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.danger-btn:hover {
  background: #e53935;
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
</style>
