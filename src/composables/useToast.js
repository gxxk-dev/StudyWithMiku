import { reactive } from 'vue'
import { getConfig } from '../services/runtimeConfig.js'

/**
 * Toast 状态（全局单例）
 */
const toastState = reactive({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  duration: 3000
})

// Toast 队列
let toastQueue = []
let isShowingToast = false

/**
 * Toast 状态管理
 *
 * 提供全局 Toast 通知功能（支持队列）
 *
 * @returns {Object} { toastState, showToast, hideToast }
 */
export function useToast() {
  /**
   * 处理队列中的下一个 Toast
   */
  const processQueue = () => {
    if (toastQueue.length === 0) {
      isShowingToast = false
      return
    }

    isShowingToast = true
    const next = toastQueue.shift()

    // 更新状态并显示
    toastState.type = next.type
    toastState.title = next.title
    toastState.message = next.message
    toastState.duration = next.duration
    toastState.visible = true

    // 设置自动隐藏
    if (next.duration > 0) {
      setTimeout(() => {
        hideToast()
      }, next.duration)
    }
  }

  /**
   * 显示 Toast 通知
   * @param {string} type - 类型：'info' | 'success' | 'error'
   * @param {string} title - 标题
   * @param {string} message - 消息内容（可选）
   * @param {number} duration - 显示时长（毫秒），0 表示不自动关闭
   */
  const showToast = (type, title, message = '', duration) => {
    const toastDuration = duration ?? getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
    // 将 Toast 加入队列
    toastQueue.push({ type, title, message, duration: toastDuration })

    // 如果当前没有显示 Toast，立即处理
    if (!isShowingToast) {
      processQueue()
    }
  }

  /**
   * 隐藏 Toast 通知
   */
  const hideToast = () => {
    toastState.visible = false

    // 等待动画完成后处理下一个
    setTimeout(
      () => {
        processQueue()
      },
      getConfig('UI_CONFIG', 'TOAST_ANIMATION_DURATION')
    )
  }

  return {
    toastState,
    showToast,
    hideToast
  }
}
