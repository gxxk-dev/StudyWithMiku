<template>
  <div
    class="spotify-player-container"
    :class="{ hidden: !visible }"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
    @touchstart="$emit('touchstart')"
    @touchend="$emit('touchend')"
  >
    <iframe
      v-if="embedUrl"
      :src="embedUrl"
      width="100%"
      height="152"
      frameborder="0"
      allowfullscreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    ></iframe>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { getSpotifyEmbedUrl } from '../services/spotify.js'
import { initializeMediaSession, cleanupMediaSession } from '../utils/mediaSession.js'

const props = defineProps({
  playlistId: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: true
  },
  theme: {
    type: Number,
    default: 0 // 0=深色, 1=浅色
  }
})

defineEmits(['mouseenter', 'mouseleave', 'touchstart', 'touchend'])

const embedUrl = computed(() => {
  return getSpotifyEmbedUrl(props.playlistId, { theme: props.theme })
})

// 监听 playlistId 变化，更新 Media Session 静态元数据
watch(() => props.playlistId, (newId) => {
  if (newId) {
    initializeMediaSession('spotify', null, {
      playlistId: newId,
      platform: 'spotify'
    })
  }
})

onMounted(() => {
  if (props.playlistId) {
    initializeMediaSession('spotify', null, {
      playlistId: props.playlistId,
      platform: 'spotify'
    })
  }
})

onUnmounted(() => {
  cleanupMediaSession()
})
</script>

<style scoped>
.spotify-player-container {
  position: fixed;
  bottom: 10px;
  left: 10px;
  width: 330px;
  z-index: 1000;
  background: transparent;
  transition: opacity 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.spotify-player-container.hidden {
  opacity: 0;
  pointer-events: none;
}

.spotify-player-container iframe {
  display: block;
  border-radius: 12px;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .spotify-player-container {
    width: calc(100% - 20px);
    left: 10px;
    right: 10px;
  }
}
</style>
