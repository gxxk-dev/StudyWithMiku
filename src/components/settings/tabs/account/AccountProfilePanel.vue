<template>
  <div class="profile-panel">
    <div class="user-info">
      <div class="avatar">
        <Icon icon="lucide:user" width="40" height="40" />
      </div>
      <div class="details">
        <h3 class="username">{{ user?.display_name || user?.username }}</h3>
        <p class="meta">
          <span class="provider">
            <Icon :icon="providerIcon" width="14" height="14" />
            {{ providerLabel }}
          </span>
        </p>
      </div>
    </div>

    <button class="logout-btn" :disabled="isLoading" @click="handleLogout">
      <Icon icon="lucide:log-out" width="18" height="18" />
      退出登录
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuth } from '../../../../composables/useAuth.js'
import { useToast } from '../../../../composables/useToast.js'

const { user, logout, isLoading } = useAuth()
const { showToast } = useToast()

const providerIcon = computed(() => {
  switch (user.value?.authProvider) {
    case 'github':
      return 'mdi:github'
    case 'google':
      return 'flat-color-icons:google'
    case 'microsoft':
      return 'mdi:microsoft-windows'
    case 'webauthn':
      return 'mdi:fingerprint'
    default:
      return 'mdi:account'
  }
})

const providerLabel = computed(() => {
  switch (user.value?.authProvider) {
    case 'github':
      return 'GitHub 登录'
    case 'google':
      return 'Google 登录'
    case 'microsoft':
      return 'Microsoft 登录'
    case 'webauthn':
      return 'WebAuthn 登录'
    default:
      return '未知方式登录'
  }
})

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

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(57, 197, 187, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #39c5bb;
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

  .logout-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
