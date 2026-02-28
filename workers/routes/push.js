/**
 * @module workers/routes/push
 * @description Web Push 推送路由
 */

import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { generalRateLimit } from '../middleware/rateLimit.js'
import { createDb, pushSubscriptions } from '../db/index.js'
import { eq } from 'drizzle-orm'

const push = new Hono()

// 所有路由需要速率限制
push.use('*', generalRateLimit)

/**
 * GET /api/push/vapid-key
 * 返回 VAPID 公钥（无需鉴权）
 */
push.get('/vapid-key', async (c) => {
  const publicKey = c.env.VAPID_PUBLIC_KEY
  if (!publicKey) {
    return c.json({ error: 'VAPID not configured' }, 500)
  }
  return c.json({ publicKey })
})

// 以下路由需要认证
push.use('/*', requireAuth())

/**
 * POST /api/push/subscribe
 * 存储浏览器推送订阅
 */
push.post('/subscribe', async (c) => {
  const { id: userId } = c.get('user')
  const body = await c.req.json()
  const { endpoint, keys } = body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return c.json({ error: 'Invalid subscription' }, 400)
  }

  const db = createDb(c.env.DB)

  // upsert: 如果 endpoint 已存在则更新
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: c.req.header('User-Agent') || null
      })
      .where(eq(pushSubscriptions.endpoint, endpoint))
  } else {
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: Date.now(),
      userAgent: c.req.header('User-Agent') || null
    })
  }

  return c.json({ success: true })
})

/**
 * DELETE /api/push/subscribe
 * 移除推送订阅
 */
push.delete('/subscribe', async (c) => {
  const body = await c.req.json()
  const { endpoint } = body

  if (!endpoint) {
    return c.json({ error: 'Missing endpoint' }, 400)
  }

  const db = createDb(c.env.DB)
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))

  return c.json({ success: true })
})

/**
 * 获取 FocusNotifier DO stub
 * @param {Object} env - Worker env
 * @param {string} userId - 用户 ID（作为 DO 实例 ID）
 * @returns {DurableObjectStub}
 */
function getNotifierStub(env, userId) {
  const id = env.FOCUS_NOTIFIER.idFromName(userId)
  return env.FOCUS_NOTIFIER.get(id)
}

/**
 * POST /api/push/session/schedule
 * 注册定时推送（转发到 FocusNotifier DO）
 */
push.post('/session/schedule', async (c) => {
  const { id: userId } = c.get('user')
  const body = await c.req.json()
  const { duration, mode, settings, pushConfig } = body

  if (!duration || duration <= 0) {
    return c.json({ error: 'Invalid duration' }, 400)
  }

  const stub = getNotifierStub(c.env, userId)
  const resp = await stub.fetch('https://focus-notifier/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      duration,
      mode: mode || 'focus',
      sessionCount: body.sessionCount || 0,
      settings: settings || {},
      pushConfig: pushConfig || {}
    })
  })

  return resp
})

/**
 * POST /api/push/session/pause
 */
push.post('/session/pause', async (c) => {
  const { id: userId } = c.get('user')
  const stub = getNotifierStub(c.env, userId)
  return stub.fetch('https://focus-notifier/pause', { method: 'POST' })
})

/**
 * POST /api/push/session/resume
 */
push.post('/session/resume', async (c) => {
  const { id: userId } = c.get('user')
  const stub = getNotifierStub(c.env, userId)
  return stub.fetch('https://focus-notifier/resume', { method: 'POST' })
})

/**
 * POST /api/push/session/cancel
 */
push.post('/session/cancel', async (c) => {
  const { id: userId } = c.get('user')
  const stub = getNotifierStub(c.env, userId)
  return stub.fetch('https://focus-notifier/cancel', { method: 'POST' })
})

/**
 * GET /api/push/session/state
 * 获取 DO 当前状态
 */
push.get('/session/state', async (c) => {
  const { id: userId } = c.get('user')
  const stub = getNotifierStub(c.env, userId)
  return stub.fetch('https://focus-notifier/state')
})

/**
 * POST /api/push/session/update-settings
 * 更新 DO 中的 focus settings
 */
push.post('/session/update-settings', async (c) => {
  const { id: userId } = c.get('user')
  const body = await c.req.json()
  const stub = getNotifierStub(c.env, userId)
  return stub.fetch('https://focus-notifier/update-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
})

export default push
