/** * @module SongListItem * 歌曲列表项组件，显示序号、图标、歌名、艺术家、时长、类型徽章和操作按钮
*/
<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import PlaylistSourceBadge from './PlaylistSourceBadge.vue'

const props = defineProps({
  /** @type {import('../../../../types/playlist.js').Song} */
  song: {
    type: Object,
    required: true
  },
  /** 歌曲在列表中的索引 (0-based) */
  index: {
    type: Number,
    required: true
  },
  /** 歌曲总数 */
  total: {
    type: Number,
    required: true
  },
  /** 是否禁用操作按钮 */
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['move-up', 'move-down', 'delete'])

/** 是否为本地歌曲 */
const isLocal = computed(() => props.song.type === 'local')

/** 显示图标 */
const songIcon = computed(() => {
  return isLocal.value ? 'mdi:music' : 'lucide:globe'
})

/** 时长格式化 */
const formattedDuration = computed(() => {
  const duration = props.song.duration
  if (!duration || duration <= 0) return null
  const min = Math.floor(duration / 60)
  const sec = duration % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
})

/** 是否可以上移 */
const canMoveUp = computed(() => props.index > 0 && !props.disabled)

/** 是否可以下移 */
const canMoveDown = computed(() => props.index < props.total - 1 && !props.disabled)

const handleMoveUp = () => {
  if (canMoveUp.value) {
    emit('move-up', props.index)
  }
}

const handleMoveDown = () => {
  if (canMoveDown.value) {
    emit('move-down', props.index)
  }
}

const handleDelete = () => {
  if (!props.disabled) {
    emit('delete', props.song)
  }
}
</script>

<template>
  <div class="song-item" :class="{ disabled }">
    <!-- 序号 -->
    <span class="song-index">{{ index + 1 }}</span>

    <!-- 图标 -->
    <div class="song-icon">
      <Icon :icon="songIcon" width="18" height="18" />
    </div>

    <!-- 信息区 -->
    <div class="song-info">
      <span class="song-name" :title="song.name">{{ song.name }}</span>
      <div class="song-meta">
        <span class="song-artist">{{ song.artist }}</span>
        <span v-if="formattedDuration" class="song-duration">{{ formattedDuration }}</span>
      </div>
    </div>

    <!-- 来源徽章 -->
    <PlaylistSourceBadge v-if="isLocal" source="local" mode="collection" class="song-badge" />
    <PlaylistSourceBadge v-else :source="song.source" mode="playlist" class="song-badge" />

    <!-- 操作按钮 -->
    <div class="song-actions">
      <button
        class="action-btn"
        :class="{ disabled: !canMoveUp }"
        :disabled="!canMoveUp"
        title="上移"
        @click="handleMoveUp"
      >
        <Icon icon="mdi:chevron-up" width="18" height="18" />
      </button>
      <button
        class="action-btn"
        :class="{ disabled: !canMoveDown }"
        :disabled="!canMoveDown"
        title="下移"
        @click="handleMoveDown"
      >
        <Icon icon="mdi:chevron-down" width="18" height="18" />
      </button>
      <button class="action-btn danger" :disabled="disabled" title="删除" @click="handleDelete">
        <Icon icon="mdi:close" width="18" height="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.song-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.song-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 序号 */
.song-index {
  width: 24px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  flex-shrink: 0;
}

/* 图标 */
.song-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

/* 信息区 */
.song-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.song-name {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}

.song-artist {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-duration {
  flex-shrink: 0;
}

/* 徽章 */
.song-badge {
  flex-shrink: 0;
}

/* 操作按钮 */
.song-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
}

.action-btn.disabled,
.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.danger:hover:not(:disabled) {
  background: rgba(239, 83, 80, 0.15);
  color: #ef5350;
}
</style>
