/**
 * @module workers/services/push
 * @description Web Push 推送发送服务
 */

import { buildPushHTTPRequest } from '@pushforge/builder'
import { eq } from 'drizzle-orm'
import { createDb, pushSubscriptions } from '../db/index.js'

/**
 * 向用户的所有订阅设备发送推送
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {Object} payload - 推送内容 { title, body }
 * @param {Object} vapidKeys - VAPID 密钥 { privateJWK, subject }
 * @returns {Promise<{sent: number, failed: number, cleaned: number}>}
 */
export async function sendPushToUser(d1, userId, payload, vapidKeys) {
  const db = createDb(d1)
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))

  if (!subs.length) return { sent: 0, failed: 0, cleaned: 0 }

  let sent = 0
  let failed = 0
  let cleaned = 0

  const message = JSON.stringify({
    title: payload.title || 'Study with Miku',
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'focus-push',
    data: { url: '/' }
  })

  for (const sub of subs) {
    try {
      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK: vapidKeys.privateJWK,
        subscription: {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        message: {
          payload: message,
          adminContact: vapidKeys.subject
        }
      })

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body
      })

      if (resp.status === 410 || resp.status === 404) {
        // 订阅已过期，清理
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
        cleaned++
      } else if (resp.ok || resp.status === 201) {
        sent++
      } else {
        console.error(`[push] 推送失败 ${sub.endpoint}: ${resp.status}`)
        failed++
      }
    } catch (err) {
      console.error(`[push] 推送异常 ${sub.endpoint}:`, err.message)
      failed++
    }
  }

  return { sent, failed, cleaned }
}
