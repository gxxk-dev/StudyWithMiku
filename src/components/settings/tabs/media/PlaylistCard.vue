/** * @module PlaylistCard * 歌单卡片组件，展示封面、名称、歌曲数、来源和操作菜单 */
<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import PlaylistSourceBadge from './PlaylistSourceBadge.vue'
import { readFromOPFS } from '../../../../services/localAudioStorage.js'

const props = defineProps({
  /** @type {import('../../../../types/playlist.js').Playlist} */
  playlist: {
    type: Object,
    required: true
  },
  /** 是否为当前播放的歌单 */
  isCurrent: {
    type: Boolean,
    default: false
  },
  /** 是否为默认歌单 */
  isDefault: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['play', 'rename', 'set-default', 'delete', 'edit-songs', 'set-cover'])

const menuOpen = ref(false)

/** 歌曲数量 */
const songCount = computed(() => {
  if (props.playlist.mode === 'collection') {
    return props.playlist.songs?.length || 0
  }
  return null
})

/** OPFS 封面 Blob URL */
const opfsCoverUrl = ref('')

/** 封面图 URL */
const coverUrl = computed(() => {
  const cover = props.playlist.cover
  if (!cover) return ''
  // 如果是 OPFS 存储的图片，使用解析后的 blob URL
  if (cover.startsWith('opfs:')) {
    return opfsCoverUrl.value
  }
  return cover
})

/** 加载 OPFS 封面 */
const loadOpfsCover = async (fileName) => {
  try {
    const result = await readFromOPFS(fileName)
    if (result.success && result.file) {
      // 释放旧的 URL
      if (opfsCoverUrl.value) {
        URL.revokeObjectURL(opfsCoverUrl.value)
      }
      opfsCoverUrl.value = URL.createObjectURL(result.file)
    }
  } catch (err) {
    console.warn('[PlaylistCard] 加载 OPFS 封面失败:', err)
  }
}

// 监听封面变化，加载 OPFS 图片
watch(
  () => props.playlist.cover,
  (newCover) => {
    if (newCover && newCover.startsWith('opfs:')) {
      const fileName = newCover.slice(5) // 移除 'opfs:' 前缀
      loadOpfsCover(fileName)
    } else {
      // 清理旧的 OPFS URL
      if (opfsCoverUrl.value) {
        URL.revokeObjectURL(opfsCoverUrl.value)
        opfsCoverUrl.value = ''
      }
    }
  },
  { immediate: true }
)

// 组件卸载时清理
onUnmounted(() => {
  if (opfsCoverUrl.value) {
    URL.revokeObjectURL(opfsCoverUrl.value)
  }
})

/** 关闭菜单 */
const closeMenu = () => {
  menuOpen.value = false
}

/** 切换菜单 */
const toggleMenu = (e) => {
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

/** 菜单操作 */
const handlePlay = () => {
  closeMenu()
  emit('play', props.playlist)
}

const handleRename = () => {
  closeMenu()
  emit('rename', props.playlist)
}

const handleSetDefault = () => {
  closeMenu()
  emit('set-default', props.playlist)
}

const handleDelete = () => {
  closeMenu()
  emit('delete', props.playlist)
}

/** 编辑歌曲 (仅 collection 模式) */
const handleEditSongs = () => {
  closeMenu()
  emit('edit-songs', props.playlist)
}

/** 设置封面 */
const handleSetCover = () => {
  closeMenu()
  emit('set-cover', props.playlist)
}

/** 点击卡片播放 */
const handleCardClick = () => {
  if (!menuOpen.value) {
    emit('play', props.playlist)
  }
}
</script>

<template>
  <div
    class="playlist-card"
    :class="{ 'is-current': isCurrent, 'is-default': isDefault }"
    @click="handleCardClick"
  >
    <!-- 菜单按钮 -->
    <button class="menu-btn" @click="toggleMenu">
      <Icon icon="mdi:dots-vertical" width="16" height="16" />
    </button>

    <!-- 下拉菜单 -->
    <Transition name="menu-fade">
      <div v-if="menuOpen" class="menu-dropdown" @click.stop>
        <div class="menu-backdrop" @click="closeMenu" />
        <div class="menu-list">
          <button class="menu-item" @click="handlePlay">
            <Icon icon="mdi:play" width="16" height="16" />
            <span>播放</span>
          </button>
          <button class="menu-item" @click="handleRename">
            <Icon icon="mdi:pencil-outline" width="16" height="16" />
            <span>重命名</span>
          </button>
          <button v-if="playlist.mode === 'collection'" class="menu-item" @click="handleEditSongs">
            <Icon icon="mdi:playlist-edit" width="16" height="16" />
            <span>编辑歌曲</span>
          </button>
          <button class="menu-item" @click="handleSetCover">
            <Icon icon="mdi:image-outline" width="16" height="16" />
            <span>设置封面</span>
          </button>
          <button class="menu-item" @click="handleSetDefault">
            <Icon icon="mdi:star-outline" width="16" height="16" />
            <span>{{ isDefault ? '取消默认' : '设为默认' }}</span>
          </button>
          <div class="menu-divider" />
          <button class="menu-item danger" @click="handleDelete">
            <Icon icon="mdi:delete-outline" width="16" height="16" />
            <span>删除</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 卡片内容 -->
    <div class="card-body">
      <!-- 封面 -->
      <div class="cover-wrapper">
        <img v-if="coverUrl" :src="coverUrl" alt="" class="cover-img" loading="lazy" />
        <div v-else class="cover-placeholder">
          <Icon icon="lucide:music" width="24" height="24" />
        </div>
        <!-- 播放中指示 -->
        <div v-if="isCurrent" class="playing-indicator">
          <Icon icon="mdi:play" width="16" height="16" />
        </div>
      </div>

      <!-- 信息区 -->
      <div class="card-info">
        <span class="card-name" :title="playlist.name">{{ playlist.name }}</span>
        <div class="card-meta">
          <span v-if="songCount !== null" class="song-count">{{ songCount }} 首</span>
          <PlaylistSourceBadge :source="playlist.source" :mode="playlist.mode" />
        </div>
        <span v-if="isDefault" class="default-tag">
          <Icon icon="mdi:star" width="12" height="12" />
          默认
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playlist-card {
  position: relative;
  padding: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.playlist-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.playlist-card.is-current {
  border-color: rgba(57, 197, 187, 0.5);
  background: rgba(57, 197, 187, 0.08);
}

/* 菜单按钮 */
.menu-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
}

.playlist-card:hover .menu-btn,
.menu-btn:focus-visible {
  opacity: 1;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
}

/* 下拉菜单 */
.menu-dropdown {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
}

.menu-list {
  position: absolute;
  top: 32px;
  right: 4px;
  min-width: 140px;
  padding: 4px;
  background: rgba(35, 40, 50, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.menu-item {
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

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item.danger {
  color: #ef5350;
}

.menu-item.danger:hover {
  background: rgba(239, 83, 80, 0.15);
}

.menu-divider {
  height: 1px;
  margin: 4px 6px;
  background: rgba(255, 255, 255, 0.08);
}

/* 卡片内容 */
.card-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 封面 */
.cover-wrapper {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.25);
}

.playing-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: #39c5bb;
}

/* 信息区 */
.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.song-count {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.default-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.7rem;
  color: #39c5bb;
  opacity: 0.8;
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

.menu-fade-enter-from .menu-list,
.menu-fade-leave-to .menu-list {
  transform: translateY(-4px) scale(0.95);
}
</style>
