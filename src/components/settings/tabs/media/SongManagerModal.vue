/** * @module SongManagerModal * 歌曲管理主弹窗，支持查看、添加、删除和排序歌曲 */
<script setup>
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import SongListItem from './SongListItem.vue'
import SongDeleteConfirm from './SongDeleteConfirm.vue'
import { usePlaylistManager } from '../../../../composables/usePlaylistManager.js'
import {
  isOPFSSupported,
  isFileHandleSupported,
  saveToOPFS,
  saveFileHandle,
  generateOPFSFileName,
  generateHandleKey,
  getAudioDuration,
  parseFileNameToSongInfo
} from '../../../../services/localAudioStorage.js'
import { PLAYLIST_CONFIG } from '../../../../config/constants.js'

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

const emit = defineEmits(['close'])

const { addSong, removeSong, reorderSongs, getPlaylist } = usePlaylistManager()

// ============ 状态 ============

/** 当前操作中的歌曲（用于删除确认） */
const deletingSong = ref(null)
const showDeleteConfirm = ref(false)

/** 是否正在添加 */
const isAdding = ref(false)

/** 文件输入引用 */
const fileInputRef = ref(null)
const addMode = ref('opfs') // 'opfs' | 'reference'

// ============ 计算属性 ============

/** 歌单歌曲列表 */
const songs = computed(() => {
  if (!props.playlist || props.playlist.mode !== 'collection') return []
  // 从 manager 获取最新数据
  const latest = getPlaylist(props.playlist.id)
  return latest?.songs || []
})

/** 歌曲数量 */
const songCount = computed(() => songs.value.length)

/** 是否达到上限 */
const isMaxReached = computed(() => songCount.value >= PLAYLIST_CONFIG.MAX_SONGS_PER_COLLECTION)

/** OPFS 是否支持 */
const opfsSupported = computed(() => isOPFSSupported())

/** FileHandle 是否支持 */
const fileHandleSupported = computed(() => isFileHandleSupported())

// ============ 方法 ============

const close = () => {
  emit('close')
}

const onKeydown = (e) => {
  if (e.key === 'Escape') close()
}

/** 打开添加模式选择 - 复制到本地 (OPFS) */
const handleAddOPFS = () => {
  if (!opfsSupported.value || isMaxReached.value) return
  addMode.value = 'opfs'
  fileInputRef.value?.click()
}

/** 打开添加模式选择 - 引用原文件 (FileHandle) */
const handleAddReference = async () => {
  if (!fileHandleSupported.value || isMaxReached.value) return
  addMode.value = 'reference'

  try {
    isAdding.value = true
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: '音频文件',
          accept: {
            'audio/*': ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac']
          }
        }
      ]
    })

    for (const handle of handles) {
      if (isMaxReached.value) break
      await addSongFromFileHandle(handle)
    }
  } catch (err) {
    // 用户取消选择
    if (err.name !== 'AbortError') {
      console.error('[SongManager] 选择文件失败:', err)
    }
  } finally {
    isAdding.value = false
  }
}

/** 处理文件选择 (OPFS 模式) */
const handleFileSelect = async (e) => {
  const files = e.target.files
  if (!files || files.length === 0) return

  isAdding.value = true

  try {
    for (const file of files) {
      if (isMaxReached.value) break
      await addSongFromFile(file)
    }
  } finally {
    isAdding.value = false
    // 清空文件输入
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

/** 从文件添加歌曲 (OPFS 模式) */
const addSongFromFile = async (file) => {
  if (!props.playlist) return

  // 生成 OPFS 文件名
  const fileName = generateOPFSFileName(file.name)

  // 保存到 OPFS
  const saveResult = await saveToOPFS(file, fileName)
  if (!saveResult.success) {
    console.error('[SongManager] 保存到 OPFS 失败:', saveResult.error)
    return
  }

  // 解析歌曲信息
  const { name, artist } = parseFileNameToSongInfo(file.name)

  // 获取时长
  const duration = await getAudioDuration(file)

  /** @type {import('../../../../types/playlist.js').LocalSong} */
  const song = {
    name,
    artist,
    duration,
    type: 'local',
    storage: 'managed',
    fileName
  }

  addSong(props.playlist.id, song)
}

/** 从 FileHandle 添加歌曲 (Reference 模式) */
const addSongFromFileHandle = async (handle) => {
  if (!props.playlist) return

  // 生成存储键
  const handleKey = generateHandleKey()

  // 保存 FileHandle
  const saveResult = await saveFileHandle(handleKey, handle)
  if (!saveResult.success) {
    console.error('[SongManager] 保存 FileHandle 失败:', saveResult.error)
    return
  }

  // 获取文件以解析信息
  const file = await handle.getFile()
  const { name, artist } = parseFileNameToSongInfo(file.name)
  const duration = await getAudioDuration(file)

  /** @type {import('../../../../types/playlist.js').LocalSong} */
  const song = {
    name,
    artist,
    duration,
    type: 'local',
    storage: 'reference',
    handleKey
  }

  addSong(props.playlist.id, song)
}

/** 上移歌曲 */
const handleMoveUp = (index) => {
  if (!props.playlist || index <= 0) return
  reorderSongs(props.playlist.id, index, index - 1)
}

/** 下移歌曲 */
const handleMoveDown = (index) => {
  if (!props.playlist || index >= songs.value.length - 1) return
  reorderSongs(props.playlist.id, index, index + 1)
}

/** 打开删除确认 */
const handleDeleteOpen = (song) => {
  deletingSong.value = song
  showDeleteConfirm.value = true
}

/** 确认删除 */
const handleDeleteConfirm = async (data) => {
  if (!props.playlist) return
  await removeSong(props.playlist.id, data.songId, {
    deleteLocalFile: data.deleteLocalFile
  })
  showDeleteConfirm.value = false
  deletingSong.value = null
}

/** 关闭删除确认 */
const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deletingSong.value = null
}

// 监听弹窗关闭时重置状态
watch(
  () => props.isOpen,
  (newVal) => {
    if (!newVal) {
      deletingSong.value = null
      showDeleteConfirm.value = false
      isAdding.value = false
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
            <div class="header-left">
              <h3 class="modal-title">编辑歌曲</h3>
              <span class="playlist-name">{{ playlist?.name }}</span>
            </div>
            <div class="header-right">
              <span class="song-counter"
                >{{ songCount }}/{{ PLAYLIST_CONFIG.MAX_SONGS_PER_COLLECTION }} 首</span
              >
              <button class="close-btn" @click="close">
                <Icon icon="mdi:close" width="20" height="20" />
              </button>
            </div>
          </div>

          <!-- 工具栏 -->
          <div class="toolbar">
            <div class="add-buttons">
              <button
                class="add-btn"
                :class="{ disabled: !opfsSupported || isMaxReached }"
                :disabled="!opfsSupported || isMaxReached || isAdding"
                @click="handleAddOPFS"
              >
                <Icon icon="mdi:content-copy" width="16" height="16" />
                <span class="btn-text">复制到本地</span>
                <span class="btn-hint">可离线播放</span>
              </button>
              <button
                class="add-btn"
                :class="{ disabled: !fileHandleSupported || isMaxReached }"
                :disabled="!fileHandleSupported || isMaxReached || isAdding"
                @click="handleAddReference"
              >
                <Icon icon="mdi:link-variant" width="16" height="16" />
                <span class="btn-text">引用原文件</span>
                <span class="btn-hint">不占用空间</span>
              </button>
            </div>
            <div v-if="isAdding" class="adding-indicator">
              <Icon icon="mdi:loading" width="16" height="16" class="spin" />
              <span>添加中...</span>
            </div>
          </div>

          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInputRef"
            type="file"
            accept="audio/*"
            multiple
            class="hidden-input"
            @change="handleFileSelect"
          />

          <!-- 歌曲列表 -->
          <div class="song-list-container">
            <!-- 空状态 -->
            <div v-if="songCount === 0" class="empty-state">
              <Icon icon="lucide:music" width="40" height="40" />
              <span class="empty-title">暂无歌曲</span>
              <span class="empty-hint">点击上方按钮添加音频文件</span>
            </div>

            <!-- 歌曲列表 -->
            <div v-else class="song-list">
              <SongListItem
                v-for="(song, index) in songs"
                :key="song.id"
                :song="song"
                :index="index"
                :total="songCount"
                :disabled="isAdding"
                @move-up="handleMoveUp"
                @move-down="handleMoveDown"
                @delete="handleDeleteOpen"
              />
            </div>
          </div>

          <!-- 不支持提示 -->
          <div v-if="!opfsSupported && !fileHandleSupported" class="support-warning">
            <Icon icon="mdi:alert-outline" width="16" height="16" />
            <span>当前浏览器不支持本地音频存储功能</span>
          </div>
        </div>

        <!-- 删除确认弹窗 -->
        <SongDeleteConfirm
          :is-open="showDeleteConfirm"
          :song="deletingSong"
          :is-local="deletingSong?.type === 'local'"
          @close="closeDeleteConfirm"
          @confirm="handleDeleteConfirm"
        />
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
  max-width: 560px;
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
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  flex-shrink: 0;
}

.playlist-name {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.song-counter {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
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

/* 工具栏 */
.toolbar {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.add-buttons {
  display: flex;
  gap: 10px;
}

.add-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border: 1px dashed rgba(57, 197, 187, 0.3);
  border-radius: 10px;
  background: rgba(57, 197, 187, 0.06);
  color: #39c5bb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover:not(:disabled) {
  background: rgba(57, 197, 187, 0.12);
  border-color: rgba(57, 197, 187, 0.5);
}

.add-btn.disabled,
.add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-text {
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-hint {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.adding-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

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

.hidden-input {
  display: none;
}

/* 歌曲列表容器 */
.song-list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 20px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.35);
}

.empty-title {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.35);
}

/* 歌曲列表 */
.song-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 不支持提示 */
.support-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  background: rgba(239, 83, 80, 0.1);
  border-top: 1px solid rgba(239, 83, 80, 0.2);
  color: #ef5350;
  font-size: 0.8rem;
  flex-shrink: 0;
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
