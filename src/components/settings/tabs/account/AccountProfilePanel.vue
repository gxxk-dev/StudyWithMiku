<template>
  <div class="profile-panel">
    <div class="user-info">
      <UserAvatar :user="user" :size="60" />
      <div class="details">
        <h3 class="username">{{ user?.displayName || user?.username }}</h3>
        <p class="meta">
          <span class="provider">
            <Icon :icon="providerIcon" width="14" height="14" />
            {{ providerLabel }}
          </span>
        </p>
      </div>
    </div>

    <div class="actions">
      <button class="edit-btn" @click="editing = !editing">
        <Icon :icon="editing ? 'lucide:x' : 'lucide:pencil'" width="18" height="18" />
      </button>
      <button class="logout-btn" :disabled="isLoading" @click="handleLogout">
        <Icon icon="lucide:log-out" width="18" height="18" />
        退出登录
      </button>
    </div>
  </div>

  <div v-if="editing" class="edit-form">
    <div class="form-field">
      <span class="label">选择头像</span>
      <div class="avatar-picker">
        <button
          class="avatar-option"
          :class="{ selected: selectedAvatar === 'auto' }"
          title="自动选择"
          @click="selectedAvatar = 'auto'"
        >
          <Icon icon="lucide:sparkles" :width="20" :height="20" />
          <span class="avatar-option-label">自动</span>
        </button>
        <button
          v-for="opt in oauthOptions"
          :key="opt.key"
          class="avatar-option"
          :class="{ selected: selectedAvatar === opt.key }"
          :title="opt.label"
          @click="selectedAvatar = opt.key"
        >
          <img :src="opt.url" :alt="opt.label" class="avatar-thumb" @error="opt.failed = true" />
          <span class="avatar-option-label">{{ opt.label }}</span>
        </button>
        <button
          class="avatar-option"
          :class="{ selected: selectedAvatar === 'gravatar' }"
          title="Gravatar"
          @click="selectedAvatar = 'gravatar'"
        >
          <img
            v-if="user?.avatars?.gravatar"
            :src="user.avatars.gravatar"
            alt="Gravatar"
            class="avatar-thumb"
          />
          <Icon v-else icon="simple-icons:gravatar" :width="20" :height="20" />
          <span class="avatar-option-label">Gravatar</span>
        </button>
        <button
          class="avatar-option"
          :class="{ selected: selectedAvatar === 'qq' }"
          title="QQ 头像"
          @click="selectedAvatar = 'qq'"
        >
          <img v-if="user?.avatars?.qq" :src="user.avatars.qq" alt="QQ" class="avatar-thumb" />
          <Icon v-else icon="simple-icons:tencentqq" :width="20" :height="20" />
          <span class="avatar-option-label">QQ</span>
        </button>
        <button
          class="avatar-option"
          :class="{ selected: selectedAvatar === 'custom' }"
          title="自定义 URL"
          @click="selectedAvatar = 'custom'"
        >
          <Icon icon="lucide:link" :width="20" :height="20" />
          <span class="avatar-option-label">自定义</span>
        </button>
      </div>
      <label v-if="selectedAvatar === 'gravatar'" class="context-input">
        <span class="context-label">邮箱</span>
        <input
          v-model="form.email"
          type="email"
          placeholder="输入邮箱以使用 Gravatar 头像"
          class="form-input"
        />
      </label>
      <label v-if="selectedAvatar === 'qq'" class="context-input">
        <span class="context-label">QQ 号</span>
        <input
          v-model="form.qqNumber"
          type="text"
          inputmode="numeric"
          placeholder="输入 QQ 号以使用 QQ 头像"
          class="form-input"
        />
      </label>
      <label v-if="selectedAvatar === 'custom'" class="context-input">
        <span class="context-label">头像 URL</span>
        <input v-model="form.customUrl" type="url" placeholder="https://..." class="form-input" />
      </label>
    </div>
    <button class="save-btn" :disabled="saving" @click="handleSave">
      {{ saving ? '保存中...' : '保存' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import UserAvatar from '../../../common/UserAvatar.vue'
import { useAuth } from '../../../../composables/useAuth.js'
import { useToast } from '../../../../composables/useToast.js'
import { getProviderMeta } from '../../../../config/oauthProviders.js'

const { user, authMethods, logout, updateProfile, isLoading } = useAuth()
const { showToast } = useToast()

const editing = ref(false)
const saving = ref(false)
const selectedAvatar = ref('auto')
const form = ref({ email: '', qqNumber: '', customUrl: '' })

const avatarOptions = computed(() => {
  const avatars = user.value?.avatars
  if (!avatars) return []
  const opts = []
  if (Array.isArray(avatars.oauth)) {
    avatars.oauth.forEach((a) => {
      const meta = getProviderMeta(a.provider)
      opts.push({ key: `oauth:${a.provider}`, label: meta.label, url: a.avatarUrl })
    })
  }
  if (avatars.gravatar) opts.push({ key: 'gravatar', url: avatars.gravatar })
  if (avatars.qq) opts.push({ key: 'qq', url: avatars.qq })
  return opts
})

const oauthOptions = computed(() => {
  const avatars = user.value?.avatars
  if (!avatars || !Array.isArray(avatars.oauth)) return []
  return avatars.oauth.map((a) => {
    const meta = getProviderMeta(a.provider)
    return { key: `oauth:${a.provider}`, label: meta.label, url: a.avatarUrl }
  })
})

const buildQQUrl = (qq) => `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=100`

const buildGravatarUrl = async (email) => {
  const data = new TextEncoder().encode(email.trim().toLowerCase())
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  return `https://www.gravatar.com/avatar/${hex}?d=404&s=80`
}

const resolveAvatarUrl = async () => {
  if (selectedAvatar.value === 'auto') return null
  if (selectedAvatar.value === 'custom') return form.value.customUrl || null
  if (selectedAvatar.value === 'qq' && form.value.qqNumber) {
    return buildQQUrl(form.value.qqNumber)
  }
  if (selectedAvatar.value === 'gravatar' && form.value.email) {
    return buildGravatarUrl(form.value.email)
  }
  const opt = avatarOptions.value.find((o) => o.key === selectedAvatar.value)
  return opt?.url || null
}

const detectCurrentSelection = () => {
  const current = user.value?.avatarUrl
  if (!current) return 'auto'
  const match = avatarOptions.value.find((o) => o.url === current)
  if (match) return match.key
  return 'custom'
}

watch(editing, (val) => {
  if (val) {
    form.value = {
      email: user.value?.email || '',
      qqNumber: user.value?.qqNumber || '',
      customUrl: ''
    }
    const sel = detectCurrentSelection()
    selectedAvatar.value = sel
    if (sel === 'custom') {
      form.value.customUrl = user.value?.avatarUrl || ''
    }
  }
})

const primaryAuthMethod = computed(() => {
  const methods = authMethods.value
  if (!methods || methods.length === 0) return null
  return methods.find((m) => m.type === 'oauth') || methods[0]
})

const providerIcon = computed(() => {
  const method = primaryAuthMethod.value
  if (!method) return 'mdi:account'
  if (method.type === 'oauth') return getProviderMeta(method.provider).icon
  return 'mdi:fingerprint'
})

const providerLabel = computed(() => {
  const method = primaryAuthMethod.value
  if (!method) return '已登录'
  if (method.type === 'oauth') return `${getProviderMeta(method.provider).label} 登录`
  return 'WebAuthn 登录'
})

const handleSave = async () => {
  saving.value = true
  try {
    const updates = {}
    const sel = selectedAvatar.value

    if (sel === 'gravatar' && form.value.email !== (user.value?.email || '')) {
      updates.email = form.value.email || null
    }
    if (sel === 'qq' && form.value.qqNumber !== (user.value?.qqNumber || '')) {
      updates.qqNumber = form.value.qqNumber || null
    }

    const newAvatarUrl = await resolveAvatarUrl()
    if (newAvatarUrl !== (user.value?.avatarUrl || null)) {
      updates.avatarUrl = newAvatarUrl
    }

    if (Object.keys(updates).length === 0) {
      showToast('info', '没有需要保存的更改')
      return
    }

    await updateProfile(updates)
    showToast('success', '资料已更新')
    editing.value = false
  } catch (err) {
    showToast('error', err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout()
    showToast('success', '已退出登录')
  } catch (err) {
    // Error handled by useAuth
  }
}
</script>

<style scoped>
.profile-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.meta {
  margin: 0;
  display: flex;
  gap: 10px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.provider {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.edit-form {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.avatar-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.avatar-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  width: 64px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  color: rgba(255, 255, 255, 0.5);
}

.avatar-option:hover {
  border-color: rgba(57, 197, 187, 0.4);
  background: rgba(57, 197, 187, 0.05);
}

.avatar-option.selected {
  border-color: #39c5bb;
  background: rgba(57, 197, 187, 0.1);
  color: #39c5bb;
}

.avatar-thumb {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-option-label {
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.context-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.context-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.form-input {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #39c5bb;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.save-btn {
  align-self: flex-end;
  padding: 8px 24px;
  background: #39c5bb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #2db5ab;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.2);
  transform: translateY(-1px);
}

.logout-btn:active {
  transform: translateY(0);
}

.logout-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .profile-panel {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
  }

  .logout-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
