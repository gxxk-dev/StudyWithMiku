/**
 * Push Provider
 * 通过 Web Push API 发送推送通知（服务端 DO Alarm 驱动）
 *
 * 该 provider 的特殊之处在于：它不直接在客户端执行推送，
 * 而是管理服务端 FocusNotifier DO 的会话生命周期。
 * 当 tab 关闭后，DO alarm 会自动触发推送。
 */

import { ref } from 'vue'
import * as pushService from '../../../services/pushService.js'
import * as authStorage from '../../../utils/authStorage.js'
import { HookTrigger } from '../constants.js'
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove
} from '../../../utils/storage.js'

const PUSH_STORAGE_KEY = 'swm_push_subscribed'

// 模块级状态
const subscribed = ref(safeLocalStorageGet(PUSH_STORAGE_KEY) === 'true')

/**
 * 将 Base64 URL 字符串转为 Uint8Array（用于 VAPID key）
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * 订阅 Web Push
 */
async function subscribePush() {
  const publicKey = await pushService.getVapidKey()
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  })
  await pushService.subscribe(subscription)
  subscribed.value = true
  safeLocalStorageSet(PUSH_STORAGE_KEY, 'true')
  return subscription
}

/**
 * 取消 Web Push 订阅
 */
async function unsubscribePush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await pushService.unsubscribe(subscription.endpoint)
    await subscription.unsubscribe()
  }
  subscribed.value = false
  safeLocalStorageRemove(PUSH_STORAGE_KEY)
}

/**
 * 获取当前 focus 设置（延迟导入以避免循环依赖）
 */
async function getFocusSettings() {
  const { useFocus } = await import('../../useFocus.js')
  const focus = useFocus()
  return {
    focusDuration: focus.settings.value.focusDuration,
    shortBreakDuration: focus.settings.value.shortBreakDuration,
    longBreakDuration: focus.settings.value.longBreakDuration,
    longBreakInterval: focus.settings.value.longBreakInterval,
    autoStartBreaks: focus.settings.value.autoStartBreaks,
    autoStartFocus: focus.settings.value.autoStartFocus
  }
}

/**
 * 获取当前模式的时长
 */
function getDurationForMode(mode, settings) {
  switch (mode) {
    case 'focus':
      return settings.focusDuration || 1500
    case 'shortBreak':
      return settings.shortBreakDuration || 300
    case 'longBreak':
      return settings.longBreakDuration || 900
    default:
      return settings.focusDuration || 1500
  }
}

export const pushProvider = {
  id: 'push',
  name: 'Web 推送',
  icon: 'lucide:bell-ring',
  hidden: false,

  actions: [
    {
      type: 'send_push',
      name: '发送推送',
      params: [
        { key: 'title', type: 'string', label: '标题', default: '' },
        { key: 'body', type: 'string', label: '内容', default: '' }
      ]
    }
  ],

  isAvailable() {
    return (
      !!authStorage.getAccessToken() &&
      subscribed.value &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    )
  },

  getStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { available: false, label: '不支持' }
    }
    if (!authStorage.getAccessToken()) {
      return { available: false, label: '未登录' }
    }
    if (!subscribed.value) {
      return { available: false, label: '未订阅' }
    }
    return { available: true, label: '已订阅' }
  },

  /**
   * 执行推送动作
   * 根据触发事件管理 DO 会话生命周期
   */
  async execute(hook, context) {
    const trigger = hook.trigger
    const action = hook.action || {}

    try {
      // START 事件 → 注册 DO 会话
      if (trigger === HookTrigger.FOCUS_START || trigger === HookTrigger.BREAK_START) {
        const settings = await getFocusSettings()
        const duration = getDurationForMode(context.mode, settings)

        await pushService.scheduleSession({
          duration,
          mode: context.mode,
          sessionCount: context.sessionCount || 0,
          settings,
          pushConfig: {
            title: action.title || '',
            body: action.body || ''
          }
        })
        return
      }

      // PAUSE → 暂停 DO 会话
      if (trigger === HookTrigger.FOCUS_PAUSE) {
        await pushService.pauseSession()
        return
      }

      // RESUME → 恢复 DO 会话
      if (trigger === HookTrigger.FOCUS_RESUME) {
        await pushService.resumeSession()
        return
      }

      // CANCELLED / SKIPPED → 取消 DO 会话
      if (
        trigger === HookTrigger.FOCUS_CANCELLED ||
        trigger === HookTrigger.FOCUS_SKIPPED ||
        trigger === HookTrigger.BREAK_CANCELLED ||
        trigger === HookTrigger.BREAK_SKIPPED
      ) {
        await pushService.cancelSession()
        return
      }

      // COMPLETED → DO alarm 已处理推送，无需客户端操作
      // TICK → 不适用于推送
    } catch (err) {
      console.error('[pushProvider] 操作失败:', err.message)
    }
  },

  // 额外暴露的方法供 UI 调用
  subscribePush,
  unsubscribePush,
  subscribed
}
