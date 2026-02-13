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
    <label class="form-field">
      <span class="label">邮箱</span>
      <input
        v-model="form.email"
        type="email"
        placeholder="用于 Gravatar 头像"
        class="form-input"
      />
    </label>
    <label class="form-field">
      <span class="label">QQ 号</span>
      <input
        v-model="form.qqNumber"
        type="text"
        inputmode="numeric"
        placeholder="用于 QQ 头像"
        class="form-input"
      />
    </label>
    <label class="form-field">
      <span class="label">自定义头像 URL</span>
      <input v-model="form.avatarUrl" type="url" placeholder="https://..." class="form-input" />
    </label>
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

const { user, authMethods, logout, updateProfile, isLoading } = useAuth()
const { showToast } = useToast()

const editing = ref(false)
const saving = ref(false)
const form = ref({ email: '', qqNumber: '', avatarUrl: '' })

watch(editing, (val) => {
  if (val) {
    form.value = {
      email: user.value?.email || '',
      qqNumber: user.value?.qqNumber || '',
      avatarUrl: user.value?.avatarUrl || ''
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
  if (method.type === 'oauth') {
    switch (method.provider) {
      case 'github':
        return 'mdi:github'
      case 'google':
        return 'flat-color-icons:google'
      case 'microsoft':
        return 'mdi:microsoft-windows'
      default:
        return 'mdi:account'
    }
  }
  return 'mdi:fingerprint'
})

const providerLabel = computed(() => {
  const method = primaryAuthMethod.value
  if (!method) return '已登录'
  if (method.type === 'oauth') {
    switch (method.provider) {
      case 'github':
        return 'GitHub 登录'
      case 'google':
        return 'Google 登录'
      case 'microsoft':
        return 'Microsoft 登录'
      default:
        return '第三方登录'
    }
  }
  return 'WebAuthn 登录'
})

const handleSave = async () => {
  saving.value = true
  try {
    const updates = {}
    if (form.value.email !== (user.value?.email || '')) {
      updates.email = form.value.email || null
    }
    if (form.value.qqNumber !== (user.value?.qqNumber || '')) {
      updates.qqNumber = form.value.qqNumber || null
    }
    if (form.value.avatarUrl !== (user.value?.avatarUrl || '')) {
      updates.avatarUrl = form.value.avatarUrl || null
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
