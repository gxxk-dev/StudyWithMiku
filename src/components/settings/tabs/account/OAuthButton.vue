<template>
  <button class="oauth-btn" :class="provider" @click="$emit('click')">
    <Icon :icon="icon" width="20" height="20" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  provider: {
    type: String,
    required: true,
    validator: (value) => ['github', 'google', 'microsoft'].includes(value)
  }
})

defineEmits(['click'])

const icon = computed(() => {
  switch (props.provider) {
    case 'github':
      return 'mdi:github'
    case 'google':
      return 'flat-color-icons:google'
    case 'microsoft':
      return 'mdi:microsoft-windows'
    default:
      return 'mdi:help'
  }
})

const label = computed(() => {
  switch (props.provider) {
    case 'github':
      return 'GitHub'
    case 'google':
      return 'Google'
    case 'microsoft':
      return 'Microsoft'
    default:
      return props.provider
  }
})
</script>

<style scoped>
.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.oauth-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.oauth-btn:active {
  transform: translateY(0);
}

.oauth-btn.github:hover {
  background: rgba(36, 41, 46, 0.8);
}

.oauth-btn.google:hover {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
}

.oauth-btn.microsoft:hover {
  background: rgba(0, 164, 239, 0.8);
}
</style>
