<template>
  <button
    class="oauth-btn"
    :style="{ '--hover-bg': meta.hoverBg, '--hover-color': meta.hoverColor }"
    @click="$emit('click')"
  >
    <Icon :icon="meta.icon" width="20" height="20" />
    <span>{{ meta.label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getProviderMeta } from '../../../../config/oauthProviders.js'

const props = defineProps({
  provider: { type: String, required: true }
})

defineEmits(['click'])

const meta = computed(() => getProviderMeta(props.provider))
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
  background: var(--hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--hover-color, white);
  transform: translateY(-1px);
}

.oauth-btn:active {
  transform: translateY(0);
}
</style>
