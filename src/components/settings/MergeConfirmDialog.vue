<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="merge-overlay" @click.self="$emit('close')">
        <div class="merge-dialog">
          <h3>合并账号</h3>
          <p class="merge-desc">该凭据已绑定到其他账号。确认后将把凭据转移到你的账号。</p>

          <div v-if="sourceHasData" class="data-choices">
            <p class="choices-hint">对方账号有数据，请选择每个类别保留哪边的数据：</p>

            <div class="choice-group">
              <label class="choice-label">专注记录</label>
              <div class="choice-options">
                <button
                  :class="['choice-btn', { active: choices.records === 'target' }]"
                  @click="choices.records = 'target'"
                >
                  保留我的
                </button>
                <button
                  :class="['choice-btn', { active: choices.records === 'source' }]"
                  @click="choices.records = 'source'"
                >
                  保留对方的
                </button>
                <button
                  :class="['choice-btn', { active: choices.records === 'merge' }]"
                  @click="choices.records = 'merge'"
                >
                  合并两边
                </button>
              </div>
            </div>

            <div class="choice-group">
              <label class="choice-label">系统设置</label>
              <div class="choice-options">
                <button
                  :class="['choice-btn', { active: choices.settings === 'target' }]"
                  @click="choices.settings = 'target'"
                >
                  保留我的
                </button>
                <button
                  :class="['choice-btn', { active: choices.settings === 'source' }]"
                  @click="choices.settings = 'source'"
                >
                  保留对方的
                </button>
              </div>
            </div>

            <div class="choice-group">
              <label class="choice-label">歌单</label>
              <div class="choice-options">
                <button
                  :class="['choice-btn', { active: choices.playlists === 'target' }]"
                  @click="choices.playlists = 'target'"
                >
                  保留我的
                </button>
                <button
                  :class="['choice-btn', { active: choices.playlists === 'source' }]"
                  @click="choices.playlists = 'source'"
                >
                  保留对方的
                </button>
                <button
                  :class="['choice-btn', { active: choices.playlists === 'merge' }]"
                  @click="choices.playlists = 'merge'"
                >
                  合并两边
                </button>
              </div>
            </div>
          </div>

          <div v-else class="no-data-hint">
            <p>对方账号没有数据，直接转移凭据即可。</p>
          </div>

          <div class="dialog-actions">
            <button class="btn-cancel" :disabled="merging" @click="$emit('close')">取消</button>
            <button class="btn-confirm" :disabled="merging" @click="handleMerge">
              {{ merging ? '合并中...' : '确认合并' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useToast } from '../../composables/useToast.js'
import { getAccessToken } from '../../utils/authStorage.js'
import { mergeOAuthAccount, mergeWebAuthnAccount } from '../../services/auth.js'

const props = defineProps({
  visible: Boolean,
  mergeToken: {
    type: String,
    default: ''
  },
  mergeType: {
    type: String,
    default: ''
  },
  sourceHasData: Boolean
})

const emit = defineEmits(['close', 'merged'])

const { showToast } = useToast()
const merging = ref(false)

const choices = reactive({
  records: 'target',
  settings: 'target',
  playlists: 'target'
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      choices.records = 'target'
      choices.settings = 'target'
      choices.playlists = 'target'
    }
  }
)

const handleMerge = async () => {
  if (!props.mergeToken) return
  merging.value = true

  try {
    const accessToken = getAccessToken()
    const dataChoices = { ...choices }
    if (props.mergeType === 'oauth') {
      await mergeOAuthAccount(accessToken, props.mergeToken, dataChoices)
    } else {
      await mergeWebAuthnAccount(accessToken, props.mergeToken, dataChoices)
    }
    emit('merged')
  } catch (err) {
    console.error('合并失败:', err)
    showToast('error', err?.message || '合并失败，请重试')
  } finally {
    merging.value = false
  }
}
</script>

<style scoped>
.merge-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.merge-dialog {
  background: #1e1e2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 90%;
  color: white;
}

.merge-dialog h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.merge-desc {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
}

.data-choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.choices-hint {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.choice-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.choice-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  min-width: 70px;
}

.choice-options {
  display: flex;
  gap: 6px;
}

.choice-btn {
  padding: 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.choice-btn:hover {
  border-color: rgba(57, 197, 187, 0.4);
  color: white;
}

.choice-btn.active {
  background: rgba(57, 197, 187, 0.15);
  border-color: #39c5bb;
  color: #39c5bb;
}

.no-data-hint {
  margin-bottom: 20px;
}

.no-data-hint p {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.btn-confirm {
  padding: 8px 16px;
  background: #39c5bb;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm:hover:not(:disabled) {
  background: #4ad3c9;
}

.btn-confirm:disabled,
.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
