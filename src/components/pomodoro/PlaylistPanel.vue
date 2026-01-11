<template>
  <div class="playlist-container">
    <div class="playlist-settings">
      <div class="setting-group">
        <label>平台</label>
        <select v-model="selectedPlatform" class="platform-select">
          <option v-for="p in platforms" :key="p.value" :value="p.value">
            {{ p.label }}
          </option>
        </select>
      </div>
      <div class="setting-group">
        <label>歌单ID</label>
        <input v-model="inputPlaylistId" type="text" placeholder="粘贴歌单链接或ID" />
      </div>
      <div v-if="detectedPlatformHint" class="platform-hint">
        {{ detectedPlatformHint }}
      </div>
      <div class="playlist-actions">
        <button class="action-btn apply-btn" @click="handleApply">获取</button>
        <button class="action-btn reset-playlist-btn" @click="handleReset">恢复默认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  usePlaylistDetection,
  extractPlaylistId,
  detectPlatformFromText
} from '../../composables/usePlaylistDetection.js'
import { extractSpotifyPlaylistId } from '../../services/spotify.js'

const props = defineProps({
  platforms: {
    type: Array,
    required: true
  },
  initialPlatform: {
    type: String,
    default: 'netease'
  }
})

const emit = defineEmits(['apply', 'reset'])

const inputPlaylistId = ref('')
const selectedPlatform = ref(props.initialPlatform)

const { detectedPlatformHint } = usePlaylistDetection(inputPlaylistId)

watch(
  () => props.initialPlatform,
  (val) => {
    selectedPlatform.value = val
  }
)

const handleApply = () => {
  if (!inputPlaylistId.value) return

  const detectedPlatform = detectPlatformFromText(inputPlaylistId.value)
  if (detectedPlatform) {
    selectedPlatform.value = detectedPlatform
  }

  let extractedId
  if (selectedPlatform.value === 'spotify') {
    extractedId = extractSpotifyPlaylistId(inputPlaylistId.value)
  } else {
    extractedId = extractPlaylistId(inputPlaylistId.value, selectedPlatform.value)
  }

  inputPlaylistId.value = extractedId

  emit('apply', {
    platform: selectedPlatform.value,
    playlistId: extractedId
  })
}

const handleReset = () => {
  inputPlaylistId.value = ''
  emit('reset')
}
</script>

<style scoped lang="scss">
@use '../../styles/pomodoro.scss' as *;

.playlist-container {
  padding: 0;
  color: white;
}

.playlist-settings {
  margin-top: 0;
  padding-top: 0;
}

.setting-group {
  @extend .pomodoro-setting-group;

  input {
    @extend .pomodoro-input;
    width: 140px;
    text-align: left;
    padding: 0.3rem 0.5rem;
  }
}

.platform-select {
  @extend .pomodoro-select;
  width: 100px;
}

.playlist-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;
  justify-content: center;
}

.action-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.apply-btn {
  background: rgba($color-success, 0.3);
  border-color: rgba($color-success, 0.5);
}

.reset-playlist-btn {
  background: rgba(255, 152, 0, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
}

.platform-hint {
  font-size: 0.75rem;
  color: $color-break;
  margin-top: -0.4rem;
  margin-bottom: 0.4rem;
  text-align: right;
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .setting-group {
    margin-bottom: 0.6rem;
    font-size: 0.75rem;

    label {
      font-size: 0.75rem;
    }

    input {
      width: 120px;
      font-size: 0.75rem;
      padding: 0.25rem 0.4rem;
    }
  }

  .playlist-actions {
    margin-top: 0.6rem;
  }

  .action-btn {
    padding: 0.35rem 0.7rem;
    font-size: 0.7rem;
  }

  .platform-hint {
    font-size: 0.7rem;
    margin-top: -0.3rem;
    margin-bottom: 0.3rem;
  }

  // 超小屏纵向堆叠
  @media (max-width: 667px) {
    .playlist-settings {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .setting-group {
      flex-direction: column;
      align-items: flex-start;

      input {
        width: 100%;
        margin-top: 0.3rem;
      }
    }
  }
}
</style>
