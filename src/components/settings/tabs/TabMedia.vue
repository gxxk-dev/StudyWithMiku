/** * @module TabMedia * 媒体设置标签页 - 歌单管理和视频设置 */
<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePlaylistManager } from '../../../composables/usePlaylistManager.js'
import { useMusic } from '../../../composables/useMusic.js'
import { useVideo } from '../../../composables/useVideo.js'
import {
  downloadPlaylistsAsFile,
  selectAndImportFile,
  mergePlaylists
} from '../../../services/playlistImportExport.js'
import PlaylistGrid from './media/PlaylistGrid.vue'
import PlaylistAddModal from './media/PlaylistAddModal.vue'
import PlaylistEditModal from './media/PlaylistEditModal.vue'
import PlaylistDeleteConfirm from './media/PlaylistDeleteConfirm.vue'
import SongManagerModal from './media/SongManagerModal.vue'
import PlaylistCoverModal from './media/PlaylistCoverModal.vue'

const {
  playlists,
  currentPlaylistId,
  defaultPlaylistId,
  sortedPlaylists,
  initialize,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  setCurrentPlaylist,
  setDefaultPlaylist
} = usePlaylistManager()

const { loadFromPlaylist } = useMusic()

// ============ 视频管理 ============

const { videos, currentVideoIndex, selectVideo, addCustomVideo, removeCustomVideo, isBuiltIn } =
  useVideo()

const newVideoUrl = ref('')
const newVideoName = ref('')
const showAddVideoForm = ref(false)

/**
 * 添加自定义视频
 */
const handleAddVideo = () => {
  const url = newVideoUrl.value.trim()
  const name = newVideoName.value.trim() || `自定义 ${videos.value.length - 2}`

  if (!url) return

  addCustomVideo(url, name)
  newVideoUrl.value = ''
  newVideoName.value = ''
  showAddVideoForm.value = false
}

/**
 * 删除自定义视频
 * @param {number} index - 视频在列表中的索引
 */
const handleRemoveVideo = (index) => {
  removeCustomVideo(index)
}

/**
 * 将缩略图视频跳转到 1 秒处以获取有意义的帧
 * @param {HTMLVideoElement} el
 */
const seekThumbnail = (el) => {
  try {
    el.currentTime = 1
  } catch {
    // 跨域或无法 seek 时静默忽略
  }
}

// ============ 初始化 ============

onMounted(() => {
  initialize()
})

// ============ 弹窗状态 ============

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const showSongManager = ref(false)
const showCoverModal = ref(false)
const editingPlaylist = ref(null)
const deletingPlaylist = ref(null)
const managingPlaylist = ref(null)
const coveringPlaylist = ref(null)

/** 更多菜单 */
const moreMenuOpen = ref(false)

// ============ 歌单操作 ============

/**
 * 播放歌单
 * @param {import('../../../types/playlist.js').Playlist} playlist
 */
const handlePlay = async (playlist) => {
  console.debug('[TabMedia] handlePlay 开始, playlist:', playlist)
  setCurrentPlaylist(playlist.id)
  console.debug('[TabMedia] setCurrentPlaylist 完成, id:', playlist.id)
  const result = await loadFromPlaylist(playlist)
  console.debug('[TabMedia] loadFromPlaylist 结果:', result)
}

/**
 * 添加歌单
 * @param {Object} data - 从 AddModal 传入的歌单数据
 */
const handleAdd = (data) => {
  const result = createPlaylist(data)
  showAddModal.value = false

  if (result.success && result.playlist) {
    // 如果是 playlist 模式，自动开始播放
    if (result.playlist.mode === 'playlist') {
      handlePlay(result.playlist)
    }
  }
}

/**
 * 打开重命名弹窗
 * @param {import('../../../types/playlist.js').Playlist} playlist
 */
const handleRenameOpen = (playlist) => {
  editingPlaylist.value = playlist
  showEditModal.value = true
}

/**
 * 保存重命名
 * @param {{id: string, name: string}} data
 */
const handleRenameSave = (data) => {
  updatePlaylist(data.id, { name: data.name })
  showEditModal.value = false
  editingPlaylist.value = null
}

/**
 * 设置/取消默认歌单
 * @param {import('../../../types/playlist.js').Playlist} playlist
 */
const handleSetDefault = (playlist) => {
  if (defaultPlaylistId.value === playlist.id) {
    setDefaultPlaylist(null)
  } else {
    setDefaultPlaylist(playlist.id)
  }
}

/**
 * 打开删除确认弹窗
 * @param {import('../../../types/playlist.js').Playlist} playlist
 */
const handleDeleteOpen = (playlist) => {
  deletingPlaylist.value = playlist
  showDeleteConfirm.value = true
}

/**
 * 确认删除歌单
 * @param {{id: string, deleteLocalFiles: boolean}} data
 */
const handleDeleteConfirm = async (data) => {
  await deletePlaylist(data.id, { deleteLocalFiles: data.deleteLocalFiles })
  showDeleteConfirm.value = false
  deletingPlaylist.value = null
}

// ============ 导入/导出 ============

const handleExport = () => {
  moreMenuOpen.value = false
  downloadPlaylistsAsFile(playlists.value)
}

const handleImport = async () => {
  moreMenuOpen.value = false
  const result = await selectAndImportFile()

  if (!result.success || !result.data) return

  const mergeResult = mergePlaylists(playlists.value, result.data.playlists)

  if (mergeResult.success && mergeResult.playlists) {
    // 直接替换整个 playlists 数组并持久化
    playlists.value = mergeResult.playlists
    // 重新初始化以持久化
    initialize()
  }
}

const closeMoreMenu = () => {
  moreMenuOpen.value = false
}

const closeEditModal = () => {
  showEditModal.value = false
  editingPlaylist.value = null
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deletingPlaylist.value = null
}

// ============ 歌曲管理 ============

/**
 * 打开歌曲管理弹窗
 * @param {import('../../../types/playlist.js').Playlist} playlist
 */
const handleEditSongs = (playlist) => {
  managingPlaylist.value = playlist
  showSongManager.value = true
}

const closeSongManager = () => {
  showSongManager.value = false
  managingPlaylist.value = null
}

// ============ 封面设置 ============

/**
 * 打开封面设置弹窗
 * @param {import('../../../types/playlist.js').Playlist} playlist
 */
const handleSetCoverOpen = (playlist) => {
  coveringPlaylist.value = playlist
  showCoverModal.value = true
}

/**
 * 保存封面
 * @param {{id: string, cover: string}} data
 */
const handleSetCoverSave = (data) => {
  updatePlaylist(data.id, { cover: data.cover })
  showCoverModal.value = false
  coveringPlaylist.value = null
}

const closeCoverModal = () => {
  showCoverModal.value = false
  coveringPlaylist.value = null
}
</script>

<template>
  <div class="tab-content">
    <!-- Section 1: 歌单管理 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">
          <Icon icon="lucide:music" width="18" height="18" />
          <span>歌单管理</span>
        </h3>
        <div class="header-actions">
          <button class="action-btn" @click="showAddModal = true">
            <Icon icon="mdi:plus" width="16" height="16" />
            添加歌单
          </button>

          <!-- 更多菜单 -->
          <div class="more-menu-wrapper">
            <button class="icon-btn" @click.stop="moreMenuOpen = !moreMenuOpen">
              <Icon icon="mdi:dots-horizontal" width="18" height="18" />
            </button>

            <Transition name="menu-fade">
              <div v-if="moreMenuOpen" class="more-dropdown" @click.stop>
                <div class="more-backdrop" @click="closeMoreMenu" />
                <div class="more-list">
                  <button class="more-item" @click="handleImport">
                    <Icon icon="mdi:import" width="16" height="16" />
                    <span>导入歌单</span>
                  </button>
                  <button
                    class="more-item"
                    :disabled="playlists.length === 0"
                    @click="handleExport"
                  >
                    <Icon icon="mdi:export" width="16" height="16" />
                    <span>导出歌单</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- 歌单网格 -->
      <PlaylistGrid
        :playlists="sortedPlaylists"
        :current-id="currentPlaylistId"
        :default-id="defaultPlaylistId"
        @play="handlePlay"
        @rename="handleRenameOpen"
        @set-default="handleSetDefault"
        @delete="handleDeleteOpen"
        @edit-songs="handleEditSongs"
        @set-cover="handleSetCoverOpen"
        @add="showAddModal = true"
      />
    </div>

    <!-- Section 2: 视频设置 -->
    <div class="settings-section">
      <h3 class="section-title">
        <Icon icon="lucide:video" width="18" height="18" />
        <span>背景视频</span>
      </h3>

      <!-- 视频卡片网格 -->
      <div class="video-grid">
        <div
          v-for="(video, index) in videos"
          :key="index"
          class="video-card"
          :class="{ active: currentVideoIndex === index }"
          @click="selectVideo(index)"
        >
          <!-- 视频缩略图 -->
          <div class="video-preview">
            <video
              :src="video.url"
              class="video-thumbnail"
              muted
              preload="metadata"
              @loadeddata="(e) => seekThumbnail(e.target)"
            />
            <div v-if="currentVideoIndex === index" class="active-badge">
              <Icon icon="mdi:play" width="12" height="12" />
              <span>播放中</span>
            </div>
          </div>

          <!-- 卡片底部信息 -->
          <div class="video-card-footer">
            <span class="video-name">{{ video.name }}</span>
            <button
              v-if="!isBuiltIn(index)"
              class="delete-btn"
              title="删除"
              @click.stop="handleRemoveVideo(index)"
            >
              <Icon icon="mdi:trash-can-outline" width="14" height="14" />
            </button>
          </div>
        </div>

        <!-- 添加自定义视频卡片 -->
        <div class="video-card add-card" @click="showAddVideoForm = !showAddVideoForm">
          <div class="video-preview add-preview">
            <Icon icon="mdi:plus" class="preview-icon add-icon" />
          </div>
          <div class="video-card-footer">
            <span class="video-name">添加视频</span>
          </div>
        </div>
      </div>

      <!-- 添加自定义视频表单 -->
      <Transition name="form-slide">
        <div v-if="showAddVideoForm" class="add-video-form">
          <div class="form-group">
            <label class="form-label">视频 URL</label>
            <input
              v-model="newVideoUrl"
              type="url"
              class="input-field"
              placeholder="https://example.com/video.mp4"
            />
          </div>
          <div class="form-group">
            <label class="form-label">名称（可选）</label>
            <input v-model="newVideoName" type="text" class="input-field" placeholder="我的视频" />
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="showAddVideoForm = false">取消</button>
            <button class="confirm-btn" :disabled="!newVideoUrl.trim()" @click="handleAddVideo">
              添加
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 弹窗 -->
    <PlaylistAddModal :is-open="showAddModal" @close="showAddModal = false" @add="handleAdd" />

    <PlaylistEditModal
      :is-open="showEditModal"
      :playlist="editingPlaylist"
      @close="closeEditModal"
      @save="handleRenameSave"
    />

    <PlaylistDeleteConfirm
      :is-open="showDeleteConfirm"
      :playlist="deletingPlaylist"
      @close="closeDeleteConfirm"
      @confirm="handleDeleteConfirm"
    />

    <SongManagerModal
      :is-open="showSongManager"
      :playlist="managingPlaylist"
      @close="closeSongManager"
    />

    <PlaylistCoverModal
      :is-open="showCoverModal"
      :playlist="coveringPlaylist"
      @close="closeCoverModal"
      @save="handleSetCoverSave"
    />
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
  position: relative;
  min-height: 100%;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

/* 头部区域 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 添加按钮 */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid rgba(57, 197, 187, 0.3);
  border-radius: 6px;
  background: rgba(57, 197, 187, 0.1);
  color: #39c5bb;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(57, 197, 187, 0.2);
  border-color: rgba(57, 197, 187, 0.5);
}

/* 图标按钮 */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
}

/* 更多菜单 */
.more-menu-wrapper {
  position: relative;
}

.more-dropdown {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
}

.more-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
}

.more-list {
  position: absolute;
  top: 34px;
  right: 0;
  min-width: 150px;
  padding: 4px;
  background: rgba(35, 40, 50, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.more-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.more-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.more-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.placeholder-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* 视频卡片网格 */
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 14px;
  margin-bottom: 16px;
}

.video-card {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
}

.video-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.video-card.active {
  background: rgba(57, 197, 187, 0.08);
  border-color: rgba(57, 197, 187, 0.5);
  box-shadow: 0 0 0 1px rgba(57, 197, 187, 0.3);
}

.video-preview {
  position: relative;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.video-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.active-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  background: rgba(57, 197, 187, 0.9);
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #fff;
}

.video-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  min-height: 36px;
}

.video-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: rgba(255, 100, 100, 0.15);
  color: #ff6b6b;
}

/* 添加卡片样式 */
.add-card {
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.15);
}

.add-card:hover {
  border-color: rgba(57, 197, 187, 0.4);
  background: rgba(57, 197, 187, 0.05);
}

.add-preview {
  background: transparent;
}

.add-icon {
  font-size: 28px;
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
}

.add-card:hover .add-icon {
  color: #39c5bb;
  transform: scale(1.1);
}

/* 添加视频表单 */
.add-video-form {
  padding: 16px;
  background: rgba(30, 35, 45, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-of-type {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.input-field:focus {
  outline: none;
  border-color: rgba(57, 197, 187, 0.5);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(57, 197, 187, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn,
.confirm-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
}

.confirm-btn {
  border: none;
  background: linear-gradient(135deg, #39c5bb 0%, #2ea69d 100%);
  color: #fff;
}

.confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #45d4ca 0%, #39c5bb 100%);
  box-shadow: 0 2px 8px rgba(57, 197, 187, 0.3);
}

.confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 表单滑入动画 */
.form-slide-enter-active,
.form-slide-leave-active {
  transition: all 0.25s ease;
}

.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 菜单过渡动画 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.15s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}

.menu-fade-enter-from .more-list,
.menu-fade-leave-to .more-list {
  transform: translateY(-4px) scale(0.95);
}
</style>
