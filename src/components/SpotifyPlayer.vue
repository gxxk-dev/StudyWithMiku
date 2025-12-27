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
import { computed } from 'vue'
import { getSpotifyEmbedUrl } from '../services/spotify.js'

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
