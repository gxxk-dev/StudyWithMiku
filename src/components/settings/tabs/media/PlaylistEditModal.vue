/** * @module PlaylistEditModal * 歌单重命名弹窗 */
<script setup>
import { ref, watch } from 'vue'
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

const emit = defineEmits(['close', 'save'])

const nameInput = ref('')

/** 监听弹窗打开，同步歌单名称 */
watch(
  () => props.isOpen,
  (open) => {
    if (open && props.playlist) {
      nameInput.value = props.playlist.name
    }
  }
)

const close = () => {
  emit('close')
}

const onKeydown = (e) => {
  if (e.key === 'Escape') close()
}

const handleSave = () => {
  const name = nameInput.value.trim()
  if (!name || !props.playlist) return
  emit('save', { id: props.playlist.id, name })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">重命名歌单</h3>
            <button class="close-btn" @click="close">
              <Icon icon="mdi:close" width="20" height="20" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">歌单名称</label>
              <input
                v-model="nameInput"
                type="text"
                class="form-input"
                placeholder="输入新名称..."
                autofocus
                @keydown.enter="handleSave"
              />
            </div>

            <div class="btn-row">
              <button class="cancel-btn" @click="close">取消</button>
              <button class="primary-btn" :disabled="!nameInput.trim()" @click="handleSave">
                保存
              </button>
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
  max-width: 380px;
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

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
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

.btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn {
  padding: 8px 16px;
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

.primary-btn {
  padding: 8px 16px;
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
