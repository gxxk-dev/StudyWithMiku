/** * @module PlaylistGrid * 歌单网格容器，展示歌单卡片列表或空状态 */
<script setup>
import { Icon } from '@iconify/vue'
import PlaylistCard from './PlaylistCard.vue'

defineProps({
  /** @type {import('../../../../types/playlist.js').Playlist[]} */
  playlists: {
    type: Array,
    required: true
  },
  /** 当前播放歌单 ID */
  currentId: {
    type: String,
    default: null
  },
  /** 默认歌单 ID */
  defaultId: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'play',
  'rename',
  'set-default',
  'delete',
  'add',
  'edit-songs',
  'set-cover'
])
</script>

<template>
  <!-- 空状态 -->
  <div v-if="playlists.length === 0" class="empty-state">
    <Icon icon="lucide:music" width="40" height="40" />
    <span class="empty-title">暂无歌单</span>
    <button class="add-first-btn" @click="emit('add')">
      <Icon icon="mdi:plus" width="16" height="16" />
      添加你的第一个歌单
    </button>
  </div>

  <!-- 歌单网格 -->
  <div v-else class="playlist-grid">
    <PlaylistCard
      v-for="playlist in playlists"
      :key="playlist.id"
      :playlist="playlist"
      :is-current="playlist.id === currentId"
      :is-default="playlist.id === defaultId"
      @play="emit('play', $event)"
      @rename="emit('rename', $event)"
      @set-default="emit('set-default', $event)"
      @delete="emit('delete', $event)"
      @edit-songs="emit('edit-songs', $event)"
      @set-cover="emit('set-cover', $event)"
    />
  </div>
</template>

<style scoped>
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.35);
}

.empty-title {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
}

.add-first-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px dashed rgba(57, 197, 187, 0.4);
  border-radius: 8px;
  background: rgba(57, 197, 187, 0.08);
  color: #39c5bb;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-first-btn:hover {
  background: rgba(57, 197, 187, 0.15);
  border-color: rgba(57, 197, 187, 0.6);
}
</style>
