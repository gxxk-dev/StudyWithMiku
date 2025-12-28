<template>
  <transition name="fade">
    <div v-if="showPrompt" class="orientation-prompt">
      <div class="prompt-content">
        <div class="rotate-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 2H17C18.1046 2 19 2.89543 19 4V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V4C5 2.89543 5.89543 2 7 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 18H12.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 5H15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="rotate-arrow">↻</div>
        </div>
        <h2 class="prompt-title">请旋转设备</h2>
        <p class="prompt-description">为获得最佳体验，请使用横屏模式</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const showPrompt = ref(false)

// 检测是否为移动设备
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
}

// 检测是否为竖屏
const isPortrait = () => {
  return window.innerHeight > window.innerWidth
}

// 更新提示显示状态
const updatePromptVisibility = () => {
  if (isMobileDevice()) {
    showPrompt.value = isPortrait()
  } else {
    showPrompt.value = false
  }
}

onMounted(() => {
  // 初始检测
  updatePromptVisibility()

  // 监听屏幕方向变化
  window.addEventListener('resize', updatePromptVisibility)
  window.addEventListener('orientationchange', updatePromptVisibility)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePromptVisibility)
  window.removeEventListener('orientationchange', updatePromptVisibility)
})
</script>

<style scoped>
.orientation-prompt {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.prompt-content {
  text-align: center;
  color: white;
  padding: 2rem;
}

.rotate-icon {
  position: relative;
  display: inline-block;
  margin-bottom: 2rem;
  animation: pulse 2s ease-in-out infinite;
}

.rotate-icon svg {
  display: block;
  animation: rotatePhone 3s ease-in-out infinite;
}

.rotate-arrow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  color: white;
  animation: rotateArrow 2s linear infinite;
}

.prompt-title {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.prompt-description {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes rotatePhone {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-15deg);
  }
  75% {
    transform: rotate(15deg);
  }
}

@keyframes rotateArrow {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* 淡入淡出过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移动端样式优化 */
@media (max-width: 768px) {
  .prompt-title {
    font-size: 1.5rem;
  }

  .prompt-description {
    font-size: 1rem;
  }

  .rotate-icon svg {
    width: 60px;
    height: 60px;
  }

  .rotate-arrow {
    font-size: 2rem;
  }
}
</style>
