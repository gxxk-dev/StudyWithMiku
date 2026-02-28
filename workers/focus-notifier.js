/**
 * FocusNotifier Durable Object
 * 服务端番茄钟状态机 — 即使客户端关闭也能通过 alarm 发送推送
 */

import { sendPushToUser } from './services/push.js'

export class FocusNotifier {
  constructor(state, env) {
    this.state = state
    this.env = env
  }

  async fetch(request) {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      switch (path) {
        case '/schedule':
          return this.handleSchedule(request)
        case '/pause':
          return this.handlePause()
        case '/resume':
          return this.handleResume()
        case '/cancel':
          return this.handleCancel()
        case '/update-settings':
          return this.handleUpdateSettings(request)
        case '/state':
          return this.handleGetState()
        default:
          return new Response('Not Found', { status: 404 })
      }
    } catch (err) {
      console.error('[FocusNotifier] Error:', err)
      return Response.json({ error: err.message }, { status: 500 })
    }
  }

  async handleSchedule(request) {
    const body = await request.json()
    const { userId, duration, mode, settings, pushConfig } = body

    await this.state.storage.put({
      userId,
      state: 'running',
      mode: mode || 'focus',
      sessionCount: body.sessionCount || 0,
      elapsed: 0,
      startedAt: Date.now(),
      settings: settings || {},
      pushConfig: pushConfig || {}
    })

    // 设置 alarm（duration 秒后触发）
    await this.state.storage.setAlarm(Date.now() + duration * 1000)

    return Response.json({ success: true })
  }

  async handlePause() {
    const data = await this.getAllStorage()
    if (data.state !== 'running') {
      return Response.json({ success: false, error: 'Not running' })
    }

    const now = Date.now()
    const elapsed = Math.floor((now - data.startedAt) / 1000) + (data.elapsed || 0)

    await this.state.storage.put({
      ...data,
      state: 'paused',
      elapsed,
      startedAt: null
    })

    // 取消 alarm
    await this.state.storage.deleteAlarm()

    return Response.json({ success: true })
  }

  async handleResume() {
    const data = await this.getAllStorage()
    if (data.state !== 'paused') {
      return Response.json({ success: false, error: 'Not paused' })
    }

    const remaining = this.getRemainingDuration(data)

    await this.state.storage.put({
      ...data,
      state: 'running',
      startedAt: Date.now()
    })

    await this.state.storage.setAlarm(Date.now() + remaining * 1000)

    return Response.json({ success: true })
  }

  async handleCancel() {
    await this.state.storage.deleteAlarm()
    await this.state.storage.put({
      state: 'idle',
      mode: null,
      sessionCount: 0,
      elapsed: 0,
      startedAt: null,
      settings: {},
      pushConfig: {}
    })

    return Response.json({ success: true })
  }

  async handleUpdateSettings(request) {
    const body = await request.json()
    const data = await this.getAllStorage()
    await this.state.storage.put({
      ...data,
      settings: { ...data.settings, ...body.settings }
    })
    return Response.json({ success: true })
  }

  async handleGetState() {
    const data = await this.getAllStorage()
    return Response.json({
      state: data.state || 'idle',
      mode: data.mode || null,
      sessionCount: data.sessionCount || 0,
      elapsed: this.getCurrentElapsed(data),
      startedAt: data.startedAt || null
    })
  }

  /**
   * Alarm 触发 — 当前阶段计时完成
   */
  async alarm() {
    const data = await this.getAllStorage()
    if (data.state !== 'running') return

    const settings = data.settings || {}
    const pushConfig = data.pushConfig || {}
    const userId = data.userId
    let mode = data.mode
    let sessionCount = data.sessionCount || 0

    // 1. 发送当前阶段完成的推送
    await this.sendPush(userId, this.getCompletionMessage(mode, settings, pushConfig))

    // 2. 计算下一阶段
    if (mode === 'focus') {
      sessionCount++

      const shouldAutoBreak = settings.autoStartBreaks
      if (shouldAutoBreak) {
        const isLong =
          settings.longBreakInterval > 0 && sessionCount % settings.longBreakInterval === 0
        const nextMode = isLong ? 'longBreak' : 'shortBreak'
        const duration = isLong
          ? settings.longBreakDuration || 900
          : settings.shortBreakDuration || 300

        // 休息时长为 0 → 跳过
        if (duration <= 0) {
          await this.state.storage.put({
            ...data,
            state: 'idle',
            mode: 'focus',
            sessionCount,
            elapsed: 0,
            startedAt: null
          })
          return
        }

        await this.state.storage.put({
          ...data,
          state: 'running',
          mode: nextMode,
          sessionCount,
          elapsed: 0,
          startedAt: Date.now()
        })
        await this.state.storage.setAlarm(Date.now() + duration * 1000)

        // 推送"已自动开始休息"
        await this.sendPush(userId, {
          title: '已自动开始休息',
          body: `${isLong ? '长' : '短'}休息 ${Math.round(duration / 60)} 分钟`
        })
      } else {
        await this.state.storage.put({
          ...data,
          state: 'idle',
          mode: 'focus',
          sessionCount,
          elapsed: 0,
          startedAt: null
        })
      }
    } else {
      // 休息完成
      const shouldAutoFocus = settings.autoStartFocus
      if (shouldAutoFocus) {
        const duration = settings.focusDuration || 1500

        await this.state.storage.put({
          ...data,
          state: 'running',
          mode: 'focus',
          sessionCount,
          elapsed: 0,
          startedAt: Date.now()
        })
        await this.state.storage.setAlarm(Date.now() + duration * 1000)

        await this.sendPush(userId, {
          title: '已自动开始专注',
          body: `专注 ${Math.round(duration / 60)} 分钟`
        })
      } else {
        await this.state.storage.put({
          ...data,
          state: 'idle',
          mode: 'focus',
          sessionCount,
          elapsed: 0,
          startedAt: null
        })
      }
    }
  }

  // --- Helpers ---

  getCompletionMessage(mode, settings, pushConfig) {
    if (pushConfig.title || pushConfig.body) {
      return { title: pushConfig.title, body: pushConfig.body }
    }
    if (mode === 'focus') {
      const mins = Math.round((settings.focusDuration || 1500) / 60)
      return { title: '专注完成！', body: `完成了 ${mins} 分钟专注，休息一下吧` }
    }
    return { title: '休息结束', body: '准备好继续专注了吗？' }
  }

  getRemainingDuration(data) {
    const settings = data.settings || {}
    const mode = data.mode
    let totalDuration
    switch (mode) {
      case 'focus':
        totalDuration = settings.focusDuration || 1500
        break
      case 'shortBreak':
        totalDuration = settings.shortBreakDuration || 300
        break
      case 'longBreak':
        totalDuration = settings.longBreakDuration || 900
        break
      default:
        totalDuration = 1500
    }
    return Math.max(0, totalDuration - (data.elapsed || 0))
  }

  getCurrentElapsed(data) {
    if (data.state === 'running' && data.startedAt) {
      return (data.elapsed || 0) + Math.floor((Date.now() - data.startedAt) / 1000)
    }
    return data.elapsed || 0
  }

  async getAllStorage() {
    const entries = await this.state.storage.list()
    const data = {}
    for (const [key, value] of entries) {
      data[key] = value
    }
    return data
  }

  async sendPush(userId, payload) {
    if (!userId) return
    try {
      const privateJWK = JSON.parse(this.env.VAPID_PRIVATE_JWK || '{}')
      const subject = this.env.VAPID_SUBJECT || 'mailto:admin@example.com'
      await sendPushToUser(this.env.DB, userId, payload, { privateJWK, subject })
    } catch (err) {
      console.error('[FocusNotifier] Push 发送失败:', err.message)
    }
  }
}
