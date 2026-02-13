<template>
  <div class="user-avatar" :style="{ width: size + 'px', height: size + 'px' }">
    <img v-if="currentSrc" :src="currentSrc" :alt="alt" class="avatar-img" @error="handleError" />
    <Icon v-else icon="lucide:user" :width="size * 0.6" :height="size * 0.6" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  user: { type: Object, default: null },
  alt: { type: String, default: '头像' },
  size: { type: Number, default: 60 }
})

const failedSrcs = ref(new Set())

const sources = computed(() => {
  if (!props.user) return []
  const list = []
  if (props.user.avatarUrl) list.push(props.user.avatarUrl)
  const oauth = props.user.avatars?.oauth
  if (Array.isArray(oauth)) {
    oauth.forEach((a) => {
      if (a.avatarUrl) list.push(a.avatarUrl)
    })
  } else if (oauth) {
    list.push(oauth)
  }
  if (props.user.avatars?.gravatar) list.push(props.user.avatars.gravatar)
  if (props.user.avatars?.libravatar) list.push(props.user.avatars.libravatar)
  if (props.user.avatars?.qq) list.push(props.user.avatars.qq)
  return list
})

const currentSrc = computed(() => {
  return sources.value.find((src) => !failedSrcs.value.has(src)) || null
})

const handleError = () => {
  if (currentSrc.value) {
    failedSrcs.value = new Set([...failedSrcs.value, currentSrc.value])
  }
}

watch(
  () => props.user,
  () => {
    failedSrcs.value = new Set()
  }
)
</script>

<style scoped>
.user-avatar {
  border-radius: 50%;
  background: rgba(57, 197, 187, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #39c5bb;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
