/**
 * Toast 通知系统
 * 提供 KDE 风格的右上角堆叠通知
 * @module composables/useToast
 */

import { ref } from 'vue'
import { getConfig } from '../services/runtimeConfig.js'

/**
 * 通知列表（响应式数组，全局单例）
 */
const notifications = ref([])
let notificationId = 0

/**
 * Toast 状态管理
 *
 * 提供 KDE 风格的右上角堆叠通知功能
 * - 支持多条通知同时显示
 * - 新通知从右侧滑入，出现在顶部
 * - 每条通知独立计时消失
 * - 进度条指示剩余时间
 *
 * @returns {Object} { notifications, showToast, removeNotification, clearAll, hideToast }
 */
export function useToast() {
  /**
   * 显示通知
   * @param {string} type - 类型：'info' | 'success' | 'error'
   * @param {string} title - 标题
   * @param {string} message - 消息内容（可选）
   * @param {number} duration - 显示时长（毫秒），0 表示不自动关闭
   * @returns {number} 通知 ID（用于手动关闭）
   */
  const showToast = (type, title, message = '', duration) => {
    const id = ++notificationId
    const toastDuration = duration ?? getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
    const maxCount = getConfig('UI_CONFIG', 'TOAST_MAX_COUNT')

    // 超出最大数量时移除最旧的
    if (notifications.value.length >= maxCount) {
      notifications.value.pop()
    }

    // 新通知插入到数组开头（显示在顶部）
    notifications.value.unshift({
      id,
      type,
      title,
      message,
      duration: toastDuration,
      createdAt: Date.now()
    })

    // 设置自动移除
    if (toastDuration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, toastDuration)
    }

    return id
  }

  /**
   * 移除指定通知
   * @param {number} id - 通知 ID
   */
  const removeNotification = (id) => {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * 清空所有通知
   */
  const clearAll = () => {
    notifications.value = []
  }

  /**
   * 显示确认通知（带 Yes/No 按钮）
   * @param {string} title - 标题
   * @param {string} message - 消息内容（可选）
   * @param {Object} options - 选项
   * @param {Function} options.onConfirm - 点击确认的回调
   * @param {Function} options.onCancel - 点击取消的回调
   * @param {string} options.confirmText - 确认按钮文本（默认 '是'）
   * @param {string} options.cancelText - 取消按钮文本（默认 '否'）
   * @param {Array<{label: string, style: string, callback: Function}>} options.extraActions - 额外的操作按钮
   * @returns {number} 通知 ID
   */
  const showConfirm = (title, message = '', options = {}) => {
    const {
      onConfirm,
      onCancel,
      confirmText = '是',
      cancelText = '否',
      extraActions = []
    } = options
    const id = ++notificationId
    const maxCount = getConfig('UI_CONFIG', 'TOAST_MAX_COUNT')

    if (notifications.value.length >= maxCount) {
      notifications.value.pop()
    }

    // 构建操作按钮列表
    const actions = [
      { label: confirmText, style: 'primary', callback: onConfirm },
      { label: cancelText, style: 'secondary', callback: onCancel },
      ...extraActions
    ]

    notifications.value.unshift({
      id,
      type: 'confirm',
      title,
      message,
      duration: 0,
      createdAt: Date.now(),
      actions
    })

    return id
  }

  /**
   * 处理通知按钮点击
   * @param {number} id - 通知 ID
   * @param {Function} callback - 按钮回调
   */
  const handleAction = (id, callback) => {
    removeNotification(id)
    if (typeof callback === 'function') {
      callback()
    }
  }

  /**
   * 隐藏最新通知（兼容旧 API）
   */
  const hideToast = () => {
    if (notifications.value.length > 0) {
      removeNotification(notifications.value[0].id)
    }
  }

  return {
    notifications,
    showToast,
    showConfirm,
    removeNotification,
    handleAction,
    clearAll,
    hideToast
  }
}
