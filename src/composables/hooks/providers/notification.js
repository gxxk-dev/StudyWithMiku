/**
 * 通知 Provider
 * 通过浏览器 Notification API 发送桌面通知
 */

export const notificationProvider = {
  id: 'notification',
  name: '桌面通知',
  icon: 'lucide:bell',
  hidden: false,

  actions: [
    {
      type: 'show_notification',
      name: '显示通知',
      params: [
        { key: 'title', type: 'string', label: '标题', default: '' },
        { key: 'body', type: 'string', label: '内容', default: '' },
        { key: 'tag', type: 'string', label: '标签', default: 'focus-notification' }
      ]
    }
  ],

  isAvailable() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  },

  getStatus() {
    if (typeof Notification === 'undefined') {
      return { available: false, label: '不支持' }
    }
    if (Notification.permission === 'granted') {
      return { available: true, label: '已授权' }
    }
    if (Notification.permission === 'denied') {
      return { available: false, label: '已拒绝' }
    }
    return { available: false, label: '未授权' }
  },

  execute(hook, context) {
    const action = hook.action || {}
    const title = action.title || getDefaultTitle(context)
    const body = action.body || getDefaultBody(context)

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: action.tag || 'focus-notification'
      })
    } catch {
      // 忽略通知错误
    }
  }
}

function getDefaultTitle(context) {
  const trigger = context?.completionType || context?.action
  const mode = context?.mode
  if (trigger === 'completed' || trigger === 'complete') {
    return mode === 'focus' ? '专注完成！' : '休息结束'
  }
  return 'Study with Miku'
}

function getDefaultBody(context) {
  const trigger = context?.completionType || context?.action
  const mode = context?.mode
  if (trigger === 'completed' || trigger === 'complete') {
    if (mode === 'focus') {
      const mins = context?.duration ? Math.round(context.duration / 60) : ''
      return mins ? `完成了 ${mins} 分钟专注，休息一下吧` : '做得好！休息一下吧'
    }
    return '准备好继续专注了吗？'
  }
  return ''
}
