/** * @module PlaylistCoverModal * 歌单封面设置弹窗 * 支持：URL 输入、本地上传、从歌曲选择 */
<script setup>
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  isOPFSSupported,
  saveToOPFS,
  generateOPFSFileName
} from '../../../../services/localAudioStorage.js'

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

// ============ 状态 ============

/** 当前标签：'url' | 'upload' | 'song' */
const activeTab = ref('url')

/** URL 输入 */
const coverUrl = ref('')

/** 文件输入引用 */
const fileInputRef = ref(null)

/** 上传预览 */
const uploadPreview = ref('')
const uploadFileName = ref('')

/** 选中的歌曲索引 */
const selectedSongIndex = ref(-1)

/** 是否正在上传 */
const isUploading = ref(false)

/** 错误信息 */
const errorMsg = ref('')

// ============ 计算属性 ============

/** 歌单中有封面的歌曲列表 */
const songsWithCover = computed(() => {
  if (!props.playlist || props.playlist.mode !== 'collection') return []
  return props.playlist.songs
    .map((song, index) => ({ ...song, index }))
    .filter((song) => song.cover && song.cover.trim() !== '')
})

/** 当前封面预览 */
const currentPreview = computed(() => {
  if (activeTab.value === 'url') {
    return coverUrl.value
  }
  if (activeTab.value === 'upload') {
    return uploadPreview.value
  }
  if (activeTab.value === 'song' && selectedSongIndex.value >= 0) {
    const song = props.playlist?.songs?.[selectedSongIndex.value]
    return song?.cover || ''
  }
  return ''
})

/** 是否可以保存 */
const canSave = computed(() => {
  if (activeTab.value === 'url') {
    return coverUrl.value.trim() !== ''
  }
  if (activeTab.value === 'upload') {
    return uploadPreview.value !== ''
  }
  if (activeTab.value === 'song') {
    return selectedSongIndex.value >= 0
  }
  return false
})

/** OPFS 是否支持 */
const opfsSupported = computed(() => isOPFSSupported())

// ============ 方法 ============

const close = () => {
  resetState()
  emit('close')
}

const resetState = () => {
  coverUrl.value = ''
  uploadPreview.value = ''
  uploadFileName.value = ''
  selectedSongIndex.value = -1
  errorMsg.value = ''
  isUploading.value = false
  activeTab.value = 'url'
}

const onKeydown = (e) => {
  if (e.key === 'Escape') close()
}

/** 切换标签 */
const switchTab = (tab) => {
  activeTab.value = tab
  errorMsg.value = ''
}

/** 触发文件选择 */
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

/** 处理文件选择 */
const handleFileSelect = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '请选择图片文件'
    return
  }

  // 验证文件大小 (最大 5MB)
  if (file.size > 5 * 1024 * 1024) {
    errorMsg.value = '图片大小不能超过 5MB'
    return
  }

  isUploading.value = true
  errorMsg.value = ''

  try {
    // 创建预览
    const reader = new FileReader()
    reader.onload = (event) => {
      uploadPreview.value = event.target.result
    }
    reader.readAsDataURL(file)

    // 保存到 OPFS
    const fileName = generateOPFSFileName(file.name)
    const result = await saveToOPFS(file, fileName)

    if (result.success) {
      uploadFileName.value = fileName
    } else {
      errorMsg.value = '保存图片失败'
      uploadPreview.value = ''
    }
  } catch (err) {
    console.error('[CoverModal] 上传失败:', err)
    errorMsg.value = '上传失败'
    uploadPreview.value = ''
  } finally {
    isUploading.value = false
    // 清空文件输入
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

/** 选择歌曲封面 */
const selectSong = (index) => {
  selectedSongIndex.value = index
}

/** 自动选择第一个有封面的歌曲 */
const autoSelectFirst = () => {
  if (songsWithCover.value.length > 0) {
    selectedSongIndex.value = songsWithCover.value[0].index
  }
}

/** 清除封面 */
const clearCover = () => {
  emit('save', { id: props.playlist?.id, cover: '' })
  close()
}

/** 保存封面 */
const handleSave = async () => {
  if (!props.playlist || !canSave.value) return

  let coverValue = ''

  if (activeTab.value === 'url') {
    coverValue = coverUrl.value.trim()
  } else if (activeTab.value === 'upload') {
    // 对于上传的图片，我们存储 OPFS 文件名，使用特殊前缀标识
    coverValue = `opfs:${uploadFileName.value}`
  } else if (activeTab.value === 'song') {
    const song = props.playlist.songs?.[selectedSongIndex.value]
    coverValue = song?.cover || ''
  }

  emit('save', { id: props.playlist.id, cover: coverValue })
  close()
}

// 监听弹窗打开，初始化状态
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && props.playlist) {
      // 如果歌单已有封面，显示在 URL 输入框
      if (props.playlist.cover && !props.playlist.cover.startsWith('opfs:')) {
        coverUrl.value = props.playlist.cover
      }
    } else {
      resetState()
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="close" @keydown="onKeydown">
        <div class="modal-container">
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">设置封面</h3>
            <button class="close-btn" @click="close">
              <Icon icon="mdi:close" width="20" height="20" />
            </button>
          </div>

          <!-- 标签栏 -->
          <div class="tab-bar">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'url' }"
              @click="switchTab('url')"
            >
              <Icon icon="mdi:link" width="16" height="16" />
              <span>图片 URL</span>
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'upload', disabled: !opfsSupported }"
              :disabled="!opfsSupported"
              @click="switchTab('upload')"
            >
              <Icon icon="mdi:upload" width="16" height="16" />
              <span>本地上传</span>
            </button>
            <button
              v-if="playlist?.mode === 'collection'"
              class="tab-btn"
              :class="{ active: activeTab === 'song', disabled: songsWithCover.length === 0 }"
              :disabled="songsWithCover.length === 0"
              @click="switchTab('song')"
            >
              <Icon icon="mdi:music-box" width="16" height="16" />
              <span>从歌曲选择</span>
            </button>
          </div>

          <!-- 内容区 -->
          <div class="modal-body">
            <!-- URL 输入 -->
            <div v-if="activeTab === 'url'" class="tab-content">
              <input
                v-model="coverUrl"
                type="url"
                class="form-input"
                placeholder="输入图片 URL..."
              />
            </div>

            <!-- 本地上传 -->
            <div v-else-if="activeTab === 'upload'" class="tab-content">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden-input"
                @change="handleFileSelect"
              />
              <button
                class="upload-btn"
                :class="{ uploading: isUploading }"
                :disabled="isUploading"
                @click="triggerFileSelect"
              >
                <Icon v-if="isUploading" icon="mdi:loading" width="20" height="20" class="spin" />
                <Icon v-else icon="mdi:cloud-upload" width="20" height="20" />
                <span>{{ isUploading ? '上传中...' : '选择图片' }}</span>
              </button>
              <p class="upload-hint">支持 JPG、PNG、GIF，最大 5MB</p>
            </div>

            <!-- 从歌曲选择 -->
            <div v-else-if="activeTab === 'song'" class="tab-content">
              <button class="auto-select-btn" @click="autoSelectFirst">
                <Icon icon="mdi:auto-fix" width="16" height="16" />
                <span>自动选择第一个</span>
              </button>
              <div class="song-grid">
                <button
                  v-for="song in songsWithCover"
                  :key="song.id"
                  class="song-cover-btn"
                  :class="{ selected: selectedSongIndex === song.index }"
                  @click="selectSong(song.index)"
                >
                  <img :src="song.cover" :alt="song.name" class="song-cover-img" />
                  <span class="song-cover-name">{{ song.name }}</span>
                </button>
              </div>
            </div>

            <!-- 预览区 -->
            <div v-if="currentPreview" class="preview-section">
              <p class="preview-label">预览</p>
              <div class="preview-container">
                <img :src="currentPreview" alt="封面预览" class="preview-img" />
              </div>
            </div>

            <!-- 错误提示 -->
            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
          </div>

          <!-- 底部按钮 -->
          <div class="modal-footer">
            <button v-if="playlist?.cover" class="clear-btn" @click="clearCover">
              <Icon icon="mdi:delete-outline" width="16" height="16" />
              <span>清除封面</span>
            </button>
            <div class="footer-right">
              <button class="cancel-btn" @click="close">取消</button>
              <button class="save-btn" :disabled="!canSave" @click="handleSave">保存</button>
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
  z-index: 10000;
}

.modal-container {
  width: 90vw;
  max-width: 480px;
  max-height: 80vh;
  background: rgba(30, 35, 45, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
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
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
}

.tab-btn.active {
  background: rgba(57, 197, 187, 0.15);
  color: #39c5bb;
}

.tab-btn.disabled,
.tab-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 内容区 */
.modal-body {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.tab-content {
  min-height: 80px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: rgba(57, 197, 187, 0.5);
  background: rgba(57, 197, 187, 0.06);
}

.hidden-input {
  display: none;
}

/* 上传按钮 */
.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  border: 2px dashed rgba(57, 197, 187, 0.3);
  border-radius: 10px;
  background: rgba(57, 197, 187, 0.06);
  color: #39c5bb;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn:hover:not(:disabled) {
  background: rgba(57, 197, 187, 0.12);
  border-color: rgba(57, 197, 187, 0.5);
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-hint {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

/* 自动选择按钮 */
.auto-select-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(57, 197, 187, 0.3);
  border-radius: 6px;
  background: rgba(57, 197, 187, 0.1);
  color: #39c5bb;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auto-select-btn:hover {
  background: rgba(57, 197, 187, 0.2);
}

/* 歌曲封面网格 */
.song-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.song-cover-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
}

.song-cover-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.song-cover-btn.selected {
  border-color: #39c5bb;
  background: rgba(57, 197, 187, 0.1);
}

.song-cover-img {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
}

.song-cover-name {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  max-width: 70px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 预览区 */
.preview-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.preview-label {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.preview-container {
  display: flex;
  justify-content: center;
}

.preview-img {
  max-width: 120px;
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
}

/* 错误信息 */
.error-msg {
  margin: 12px 0 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
  font-size: 0.8rem;
}

/* 底部按钮 */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid rgba(239, 83, 80, 0.3);
  border-radius: 6px;
  background: transparent;
  color: #ef5350;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(239, 83, 80, 0.1);
}

.footer-right {
  display: flex;
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
}

.save-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: #39c5bb;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover:not(:disabled) {
  background: #2db3a9;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
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
</style>
