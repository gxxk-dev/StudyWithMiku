<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { coyoteWaveform } from '../../../../services/coyoteWaveform.js'

const props = defineProps({
  audioFileId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['loaded'])

const isConverting = ref(false)
const loadedFileName = ref('')
const loadedDuration = ref(0)
const error = ref('')

const handleFileSelect = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    error.value = '文件过大（超过 10MB）'
    return
  }

  error.value = ''
  isConverting.value = true

  try {
    const result = await coyoteWaveform.audioToPatterns(file)

    // 保存到 OPFS
    const fileId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    await coyoteWaveform.saveWaveformAudio(file, fileId)

    loadedFileName.value = file.name
    loadedDuration.value = result.durationMs

    emit('loaded', {
      patterns: result.patterns,
      durationMs: result.durationMs,
      audioFileId: fileId
    })
  } catch (err) {
    error.value = err.message || '转换失败'
  } finally {
    isConverting.value = false
  }
}

const handleDelete = async () => {
  if (props.audioFileId) {
    await coyoteWaveform.deleteWaveformAudio(props.audioFileId)
  }
  loadedFileName.value = ''
  loadedDuration.value = 0
  emit('loaded', { patterns: [], durationMs: 0, audioFileId: '' })
}

const handlePreview = async () => {
  const fileId = props.audioFileId
  if (!fileId) return

  const result = await coyoteWaveform.loadWaveformAudio(fileId)
  if (result.success && result.file) {
    const url = URL.createObjectURL(result.file)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => URL.revokeObjectURL(url)
  }
}
</script>

<template>
  <div class="waveform-upload">
    <label class="field-label">波形来源</label>

    <label class="upload-btn">
      <Icon icon="lucide:folder-open" width="16" height="16" />
      {{ isConverting ? '转换中...' : '上传音频文件' }}
      <input
        type="file"
        accept="audio/*"
        class="file-input"
        :disabled="isConverting"
        @change="handleFileSelect"
      />
    </label>

    <div v-if="loadedFileName || audioFileId" class="loaded-info">
      <span class="loaded-name">{{ loadedFileName || '已加载波形' }}</span>
      <span v-if="loadedDuration" class="loaded-duration">
        ({{ (loadedDuration / 1000).toFixed(1) }}s)
      </span>
      <div class="loaded-actions">
        <button v-if="audioFileId" class="mini-btn" @click="handlePreview">
          <Icon icon="lucide:play" width="12" height="12" />
          预览
        </button>
        <button class="mini-btn danger" @click="handleDelete">
          <Icon icon="lucide:trash-2" width="12" height="12" />
          删除
        </button>
      </div>
    </div>

    <div v-if="error" class="upload-error">{{ error }}</div>
  </div>
</template>

<style scoped>
.waveform-upload {
  margin-bottom: 10px;
}

.field-label {
  display: block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 6px;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn:hover {
  border-color: rgba(57, 197, 187, 0.4);
  background: rgba(57, 197, 187, 0.08);
  color: #39c5bb;
}

.file-input {
  display: none;
}

.loaded-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
}

.loaded-name {
  color: rgba(255, 255, 255, 0.8);
}

.loaded-duration {
  color: rgba(255, 255, 255, 0.5);
}

.loaded-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.mini-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mini-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.mini-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.upload-error {
  margin-top: 6px;
  font-size: 0.75rem;
  color: #ef4444;
}
</style>
