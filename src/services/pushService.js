/**
 * @module services/pushService
 * @description Web Push 推送 API 客户端
 */

import * as authStorage from '../utils/authStorage.js'

/**
 * 创建带认证头的 fetch 选项
 */
const authHeaders = (extra = {}) => {
  const accessToken = authStorage.getAccessToken()
  if (!accessToken) throw new Error('未登录')
  return {
    ...extra,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...extra.headers
    }
  }
}

/**
 * 获取 VAPID 公钥
 * @returns {Promise<string>} Base64 编码的公钥
 */
export async function getVapidKey() {
  const resp = await fetch('/api/push/vapid-key')
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || '获取 VAPID 公钥失败')
  return data.publicKey
}

/**
 * 注册推送订阅
 * @param {PushSubscription} subscription - 浏览器推送订阅对象
 */
export async function subscribe(subscription) {
  const sub = subscription.toJSON()
  const resp = await fetch(
    '/api/push/subscribe',
    authHeaders({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: sub.keys
      })
    })
  )
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || '注册推送订阅失败')
  return data
}

/**
 * 取消推送订阅
 * @param {string} endpoint - 推送端点 URL
 */
export async function unsubscribe(endpoint) {
  const resp = await fetch(
    '/api/push/subscribe',
    authHeaders({
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    })
  )
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || '取消推送订阅失败')
  return data
}

/**
 * 注册定时推送会话
 * @param {Object} config
 * @param {number} config.duration - 持续时间（秒）
 * @param {string} config.mode - 模式 (focus/shortBreak/longBreak)
 * @param {number} [config.sessionCount] - 当前专注轮次
 * @param {Object} [config.settings] - 番茄钟设置
 * @param {Object} [config.pushConfig] - 推送内容 { title, body }
 */
export async function scheduleSession(config) {
  const resp = await fetch(
    '/api/push/session/schedule',
    authHeaders({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
  )
  return resp.json()
}

/**
 * 暂停推送会话
 */
export async function pauseSession() {
  const resp = await fetch('/api/push/session/pause', authHeaders({ method: 'POST' }))
  return resp.json()
}

/**
 * 恢复推送会话
 */
export async function resumeSession() {
  const resp = await fetch('/api/push/session/resume', authHeaders({ method: 'POST' }))
  return resp.json()
}

/**
 * 取消推送会话
 */
export async function cancelSession() {
  const resp = await fetch('/api/push/session/cancel', authHeaders({ method: 'POST' }))
  return resp.json()
}

/**
 * 获取 DO 当前状态
 * @returns {Promise<Object>} { state, mode, sessionCount, elapsed, startedAt }
 */
export async function getSessionState() {
  const resp = await fetch('/api/push/session/state', authHeaders())
  return resp.json()
}

/**
 * 更新 DO 中的 focus settings
 * @param {Object} settings - 番茄钟设置
 */
export async function updateSessionSettings(settings) {
  const resp = await fetch(
    '/api/push/session/update-settings',
    authHeaders({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    })
  )
  return resp.json()
}
