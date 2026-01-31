/** * @module PlaylistSourceBadge * 歌单来源徽章组件，显示平台图标和名称 */
<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  /** @type {'netease'|'tencent'|'spotify'|'local'} */
  source: {
    type: String,
    default: 'local'
  },
  /** @type {'playlist'|'collection'} */
  mode: {
    type: String,
    default: 'collection'
  }
})

/** 来源配置映射 */
const SOURCE_CONFIG = {
  netease: {
    label: '网易云',
    icon: 'simple-icons:neteasecloudmusic',
    color: '#e53935'
  },
  tencent: {
    label: 'QQ音乐',
    icon: 'simple-icons:tencentqq',
    color: '#12b7f5'
  },
  spotify: {
    label: 'Spotify',
    icon: 'mdi:spotify',
    color: '#1ed760'
  },
  local: {
    label: '本地',
    icon: 'mdi:folder-music',
    color: '#9e9e9e'
  }
}

const config = computed(() => {
  if (props.mode === 'collection') {
    return SOURCE_CONFIG.local
  }
  return SOURCE_CONFIG[props.source] || SOURCE_CONFIG.local
})
</script>

<template>
  <span class="source-badge" :style="{ '--badge-color': config.color }">
    <Icon :icon="config.icon" width="12" height="12" />
    <span class="badge-label">{{ config.label }}</span>
  </span>
</template>

<style scoped>
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--badge-color) 15%, transparent);
  color: var(--badge-color);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.badge-label {
  letter-spacing: 0.02em;
}
</style>
