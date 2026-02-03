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
 * 暂停状态（全局单例）
 */
const paused = ref(false)

/**
 * 存储每个通知的计时器信息
 * @type {Map<number, {timerId: number, remaining: number, startTime: number}>}
 */
const timerMap = new Map()

/**
 * Toast 状态管理
 *
 * 提供 KDE 风格的右上角堆叠通知功能
 * - 支持多条通知同时显示
 * - 新通知从右侧滑入，出现在顶部
 * - 每条通知独立计时消失
 * - 进度条指示剩余时间
 * - 支持暂停/恢复自动消失计时
 *
 * @returns {Object} { notifications, paused, showToast, removeNotification, clearAll, hideToast, pauseTimers, resumeTimers }
 */
export function useToast() {
  /**
   * 启动通知的自动移除计时器
   * @param {number} id - 通知 ID
   * @param {number} duration - 剩余时长（毫秒）
   */
  const startTimer = (id, duration) => {
    if (duration <= 0) return

    const timerId = setTimeout(() => {
      removeNotification(id)
      timerMap.delete(id)
    }, duration)

    timerMap.set(id, {
      timerId,
      remaining: duration,
      startTime: Date.now()
    })
  }

  /**
   * 暂停所有通知的自动消失计时器
   */
  const pauseTimers = () => {
    if (paused.value) return
    paused.value = true

    timerMap.forEach((timer) => {
      clearTimeout(timer.timerId)
      const elapsed = Date.now() - timer.startTime
      timer.remaining = Math.max(0, timer.remaining - elapsed)
    })
  }

  /**
   * 恢复所有通知的自动消失计时器
   */
  const resumeTimers = () => {
    if (!paused.value) return
    paused.value = false

    timerMap.forEach((timer, id) => {
      if (timer.remaining > 0) {
        timer.startTime = Date.now()
        timer.timerId = setTimeout(() => {
          removeNotification(id)
          timerMap.delete(id)
        }, timer.remaining)
      } else {
        removeNotification(id)
        timerMap.delete(id)
      }
    })
  }

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
      const oldest = notifications.value[notifications.value.length - 1]
      if (oldest) {
        const timer = timerMap.get(oldest.id)
        if (timer) {
          clearTimeout(timer.timerId)
          timerMap.delete(oldest.id)
        }
      }
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

    // 设置自动移除（如果未暂停）
    if (toastDuration > 0 && !paused.value) {
      startTimer(id, toastDuration)
    } else if (toastDuration > 0 && paused.value) {
      // 暂停状态下，记录计时器信息但不启动
      timerMap.set(id, {
        timerId: null,
        remaining: toastDuration,
        startTime: Date.now()
      })
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
    // 清理计时器
    const timer = timerMap.get(id)
    if (timer) {
      clearTimeout(timer.timerId)
      timerMap.delete(id)
    }
  }

  /**
   * 清空所有通知
   */
  const clearAll = () => {
    // 清理所有计时器
    timerMap.forEach((timer) => {
      clearTimeout(timer.timerId)
    })
    timerMap.clear()
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
    paused,
    showToast,
    showConfirm,
    removeNotification,
    handleAction,
    clearAll,
    hideToast,
    pauseTimers,
    resumeTimers
  }
}
