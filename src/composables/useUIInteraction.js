/**
 * UI 交互 Composable
 *
 * 提取自 App.vue 中的鼠标/触摸交互和控件显隐逻辑
 *
 * @module composables/useUIInteraction
 */

import { ref } from 'vue'
import { isHoveringUI } from '../utils/uiState.js'
import { getConfig } from '../services/runtimeConfig.js'

/**
 * @returns {Object} UI 交互状态和处理函数
 */
export function useUIInteraction() {
  const showControls = ref(true)
  const inactivityTimer = ref(null)

  /**
   * 检查是否有模态框打开（由外部注入）
   * @type {Function}
   */
  let isAnyModalOpenFn = () => false

  /**
   * 设置模态框检查函数
   * @param {Function} fn - 返回 boolean 的函数
   */
  const setModalCheckFn = (fn) => {
    isAnyModalOpenFn = fn
  }

  const startHideTimer = () => {
    if (inactivityTimer.value) {
      clearTimeout(inactivityTimer.value)
    }
    inactivityTimer.value = setTimeout(
      () => {
        if (!isHoveringUI.value && !isAnyModalOpenFn()) {
          showControls.value = false
          document.body.style.cursor = 'none'
        }
      },
      getConfig('UI_CONFIG', 'INACTIVITY_HIDE_DELAY')
    )
  }

  const onMouseMove = () => {
    showControls.value = true
    document.body.style.cursor = 'default'
    startHideTimer()
  }

  const onMouseLeave = () => {
    if (!isHoveringUI.value && !isAnyModalOpenFn()) {
      showControls.value = false
      document.body.style.cursor = 'none'
    }
  }

  const onUIMouseEnter = () => {
    isHoveringUI.value = true
    if (inactivityTimer.value) {
      clearTimeout(inactivityTimer.value)
    }
  }

  const onUIMouseLeave = () => {
    isHoveringUI.value = false
    startHideTimer()
  }

  const onUITouchStart = () => {
    isHoveringUI.value = true
    if (inactivityTimer.value) {
      clearTimeout(inactivityTimer.value)
    }
  }

  const onUITouchEnd = () => {
    isHoveringUI.value = false
    startHideTimer()
  }

  return {
    showControls,
    setModalCheckFn,
    onMouseMove,
    onMouseLeave,
    onUIMouseEnter,
    onUIMouseLeave,
    onUITouchStart,
    onUITouchEnd
  }
}
