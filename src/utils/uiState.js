/**
 * UI 状态管理
 * 从 eventBus.js 提取的纯 UI 状态
 */

import { ref } from 'vue'

/**
 * 鼠标是否悬浮在 UI 元素上
 * 用于控制元素显示/隐藏逻辑
 */
export const isHoveringUI = ref(false)

/**
 * 设置悬浮状态
 * @param {boolean} value
 */
export const setHoveringUI = (value) => {
  isHoveringUI.value = value
}
