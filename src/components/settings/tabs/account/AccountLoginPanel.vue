<template>
  <div class="login-panel">
    <!-- WebAuthn Section -->
    <div class="section webauthn-section">
      <h3>WebAuthn 登录 / 注册</h3>
      <div class="input-group">
        <input
          v-model="username"
          type="text"
          placeholder="请输入用户名"
          :disabled="isLoading"
          @keyup.enter="handleLogin"
        />
      </div>
      <div v-if="showDeviceNameInput" class="input-group">
        <input
          v-model="deviceName"
          type="text"
          placeholder="设备名称（可选，如：我的电脑）"
          :disabled="isLoading"
        />
      </div>
      <div class="btn-group">
        <button class="btn-primary" :disabled="!username || isLoading" @click="handleLogin">
          登录
        </button>
        <button
          v-if="!showDeviceNameInput"
          class="btn-secondary"
          :disabled="!username || isLoading"
          @click="showDeviceNameInput = true"
        >
          注册
        </button>
        <button
          v-else
          class="btn-secondary"
          :disabled="!username || isLoading"
          @click="handleRegister"
        >
          确认注册
        </button>
      </div>
      <p v-if="!isWebAuthnSupported" class="warning-text">
        您的浏览器不支持 WebAuthn，请使用第三方登录。
      </p>
    </div>

    <div class="divider">
      <span>或使用第三方登录</span>
    </div>

    <!-- OAuth Section -->
    <div class="section oauth-section">
      <div class="oauth-grid">
        <OAuthButton
          v-if="availableProviders.oauth.github"
          provider="github"
          @click="handleOAuthLogin('github')"
        />
        <OAuthButton
          v-if="availableProviders.oauth.google"
          provider="google"
          @click="handleOAuthLogin('google')"
        />
        <OAuthButton
          v-if="availableProviders.oauth.microsoft"
          provider="microsoft"
          @click="handleOAuthLogin('microsoft')"
        />

        <div v-if="!hasOAuthProviders" class="no-providers">暂无可用第三方登录</div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuth } from '../../../../composables/useAuth.js'
import OAuthButton from './OAuthButton.vue'
import { useToast } from '../../../../composables/useToast.js'

const {
  login,
  register,
  loginWithOAuth,
  isLoading,
  error,
  isWebAuthnSupported,
  availableProviders
} = useAuth()

const { showToast } = useToast()

const username = ref('')
const deviceName = ref('')
const showDeviceNameInput = ref(false)

const hasOAuthProviders = computed(() => {
  const oauth = availableProviders.value?.oauth
  return oauth && (oauth.github || oauth.google || oauth.microsoft)
})

const handleLogin = async () => {
  if (!username.value) return
  try {
    await login(username.value)
    showToast('success', '登录成功')
  } catch (err) {
    // Error is handled by useAuth
  }
}

const handleRegister = async () => {
  if (!username.value) return
  try {
    await register(username.value, deviceName.value || undefined)
    showToast('success', '注册成功')
    showDeviceNameInput.value = false
    deviceName.value = ''
  } catch (err) {
    // Error is handled by useAuth
  }
}

const handleOAuthLogin = (provider) => {
  try {
    loginWithOAuth(provider)
  } catch (err) {
    // Error is handled by useAuth
  }
}
</script>

<style scoped>
.login-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px 0;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h3 {
  margin: 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
}

.input-group input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

.input-group input:focus {
  border-color: #39c5bb;
}

.btn-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

button {
  padding: 10px;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #39c5bb;
  color: #1a1a1a;
}

.btn-primary:hover:not(:disabled) {
  background: #4ad3c9;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.oauth-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.warning-text {
  color: #f39c12;
  font-size: 0.85rem;
  margin: 0;
}

.error-message {
  padding: 10px;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 8px;
  color: #e74c3c;
  font-size: 0.9rem;
  text-align: center;
}

.no-providers {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  padding: 10px;
}
</style>
