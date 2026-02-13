<template>
  <div class="device-list-panel">
    <div class="header">
      <h3>凭证管理</h3>
      <div class="header-actions">
        <button
          v-if="!showAddInput && !showLinkOptions"
          class="add-btn"
          :disabled="isLoading || !isWebAuthnSupported"
          @click="showAddInput = true"
        >
          <Icon icon="lucide:plus" width="16" height="16" />
          添加安全密钥
        </button>
        <button
          v-if="!showAddInput && !showLinkOptions && unlinkedProviders.length > 0"
          class="add-btn link-btn"
          :disabled="isLoading"
          @click="showLinkOptions = true"
        >
          <Icon icon="lucide:link" width="16" height="16" />
          关联第三方账号
        </button>
      </div>
    </div>

    <!-- 添加安全密钥输入框 -->
    <div v-if="showAddInput" class="add-device-form">
      <input
        v-model="newDeviceName"
        type="text"
        placeholder="设备名称（可选，如：我的电脑）"
        :disabled="isLoading"
        @keyup.enter="handleAddDevice"
      />
      <div class="form-actions">
        <button class="btn-confirm" :disabled="isLoading" @click="handleAddDevice">
          <Icon icon="lucide:check" width="16" height="16" />
          确认添加
        </button>
        <button class="btn-cancel" :disabled="isLoading" @click="cancelAdd">取消</button>
      </div>
    </div>

    <!-- 关联第三方账号选择 -->
    <div v-if="showLinkOptions" class="link-options">
      <p class="link-hint">选择要关联的第三方账号</p>
      <div class="oauth-buttons">
        <OAuthButton
          v-for="provider in unlinkedProviders"
          :key="provider"
          :provider="provider"
          @click="handleLinkOAuth(provider)"
        />
      </div>
      <button class="btn-cancel" :disabled="isLoading" @click="showLinkOptions = false">
        取消
      </button>
    </div>

    <div v-if="loadingMethods" class="loading">
      <Icon icon="eos-icons:loading" width="24" height="24" />
    </div>

    <div v-else class="list">
      <div v-for="method in authMethods" :key="method.id" class="device-item">
        <div class="device-icon">
          <Icon :icon="getMethodIcon(method)" width="24" height="24" />
        </div>
        <div class="device-info">
          <div class="device-name">
            {{ getMethodName(method) }}
          </div>
          <div class="device-meta">
            {{ getMethodMeta(method) }}
          </div>
        </div>
        <button
          class="delete-btn"
          :disabled="isLoading || authMethods.length <= 1"
          :title="authMethods.length <= 1 ? '至少保留一个认证方式' : '删除'"
          @click="confirmDelete(method)"
        >
          <Icon icon="lucide:trash-2" width="16" height="16" />
        </button>
      </div>

      <div v-if="authMethods.length === 0" class="empty-state">暂无已注册凭证</div>
    </div>

    <AccountDeleteConfirm
      :is-open="showDeleteConfirm"
      :device-name="methodToDelete ? getMethodName(methodToDelete) : ''"
      :is-loading="isLoading"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteMethod"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuth } from '../../../../composables/useAuth.js'
import { useToast } from '../../../../composables/useToast.js'
import { OAUTH_PROVIDER_KEYS, getProviderMeta } from '../../../../config/oauthProviders.js'
import AccountDeleteConfirm from './AccountDeleteConfirm.vue'
import OAuthButton from './OAuthButton.vue'

const emit = defineEmits(['request-merge'])

const {
  authMethods,
  getAuthMethods,
  addDevice,
  removeDevice,
  linkOAuthProvider,
  unlinkOAuthAccount,
  isLoading,
  isWebAuthnSupported,
  availableProviders
} = useAuth()

const { showToast } = useToast()

const loadingMethods = ref(false)
const showDeleteConfirm = ref(false)
const methodToDelete = ref(null)
const showAddInput = ref(false)
const showLinkOptions = ref(false)
const newDeviceName = ref('')

const linkedOAuthProviders = computed(() =>
  authMethods.value.filter((m) => m.type === 'oauth').map((m) => m.provider)
)

const unlinkedProviders = computed(() => {
  return OAUTH_PROVIDER_KEYS.filter(
    (p) => availableProviders.value?.oauth?.[p] && !linkedOAuthProviders.value.includes(p)
  )
})

onMounted(async () => {
  loadingMethods.value = true
  try {
    await getAuthMethods()
  } catch {
    // Error handled by useAuth
  } finally {
    loadingMethods.value = false
  }
})

const getMethodIcon = (method) => {
  if (method.type === 'oauth') return getProviderMeta(method.provider).icon
  const name = (method.deviceName || '').toLowerCase()
  if (name.includes('phone') || name.includes('mobile')) return 'lucide:smartphone'
  if (name.includes('mac') || name.includes('windows') || name.includes('linux'))
    return 'lucide:laptop'
  return 'lucide:shield-check'
}

const getMethodName = (method) => {
  if (method.type === 'oauth') {
    const name = getProviderMeta(method.provider).label
    return method.displayName ? `${name} · ${method.displayName}` : name
  }
  return method.deviceName || '未命名安全密钥'
}

const getMethodMeta = (method) => {
  if (method.type === 'oauth') {
    const parts = []
    if (method.email) parts.push(method.email)
    if (method.linkedAt) parts.push(`关联于 ${formatDate(method.linkedAt)}`)
    return parts.join(' · ') || '第三方账号'
  }
  const parts = []
  if (method.lastUsedAt) parts.push(formatDate(method.lastUsedAt))
  if (method.transports?.length) parts.push(method.transports.join(', '))
  return parts.join(' · ') || '安全密钥'
}

const formatDate = (ts) => {
  if (!ts) return '未知时间'
  return new Date(ts).toLocaleDateString()
}

const handleAddDevice = async () => {
  try {
    await addDevice(newDeviceName.value || undefined)
    showToast('success', '安全密钥添加成功')
    showAddInput.value = false
    newDeviceName.value = ''
    await getAuthMethods()
  } catch (err) {
    const details = err?.details
    if (details?.code === 'CREDENTIAL_EXISTS' && details?.mergeToken) {
      // 凭据属于其他用户，触发合并流程
      emit('request-merge', {
        mergeToken: details.mergeToken,
        mergeType: 'webauthn',
        hasData: !!details.hasData
      })
      showAddInput.value = false
      newDeviceName.value = ''
    } else if (details?.code === 'CREDENTIAL_EXISTS') {
      showToast('warning', '该安全密钥已注册')
    } else {
      showToast('error', details?.error || err?.message || '添加安全密钥失败')
    }
  }
}

const cancelAdd = () => {
  showAddInput.value = false
  newDeviceName.value = ''
}

const handleLinkOAuth = async (provider) => {
  try {
    await linkOAuthProvider(provider)
  } catch {
    // Error handled by useAuth
  }
}

const confirmDelete = (method) => {
  methodToDelete.value = method
  showDeleteConfirm.value = true
}

const handleDeleteMethod = async () => {
  if (!methodToDelete.value) return

  try {
    if (methodToDelete.value.type === 'webauthn') {
      await removeDevice(methodToDelete.value.id)
      showToast('success', '安全密钥已删除')
    } else {
      await unlinkOAuthAccount(methodToDelete.value.id)
      showToast('success', '第三方账号已解绑')
    }
    showDeleteConfirm.value = false
    methodToDelete.value = null
  } catch {
    // Error handled by useAuth
  }
}
</script>

<style scoped>
.device-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

h3 {
  margin: 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(57, 197, 187, 0.1);
  color: #39c5bb;
  border: 1px solid rgba(57, 197, 187, 0.2);
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: rgba(57, 197, 187, 0.2);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-device-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(57, 197, 187, 0.05);
  border: 1px solid rgba(57, 197, 187, 0.2);
  border-radius: 8px;
}

.add-device-form input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.add-device-form input:focus {
  border-color: #39c5bb;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.btn-confirm {
  display: flex;
  align-items: center;
  gap: 6px;
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

.link-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(57, 197, 187, 0.05);
  border: 1px solid rgba(57, 197, 187, 0.2);
  border-radius: 8px;
}

.link-hint {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.oauth-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.device-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.device-icon {
  color: rgba(255, 255, 255, 0.6);
}

.device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.device-name {
  font-size: 0.95rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-meta {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.delete-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}
</style>
