/**
 * @module workers/auth-challenge
 * @description Durable Object 实现 WebAuthn 挑战的短期存储
 * 每个挑战有 5 分钟有效期，使用后立即删除防止重放攻击
 */

import { WEBAUTHN_CONFIG } from './constants.js'

/**
 * AuthChallenge Durable Object
 * 存储 WebAuthn 注册/认证过程中的临时挑战数据
 */
export class AuthChallenge {
  /**
   * @param {DurableObjectState} state
   */
  constructor(state) {
    this.state = state
    this.storage = state.storage
  }

  /**
   * 处理 HTTP 请求
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    const url = new URL(request.url)
    const method = request.method

    if (method === 'PUT') {
      return this.storeChallenge(request)
    }

    if (method === 'GET') {
      return this.getChallenge(url)
    }

    if (method === 'DELETE') {
      return this.deleteChallenge(url)
    }

    return new Response('Method not allowed', { status: 405 })
  }

  /**
   * 存储挑战
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async storeChallenge(request) {
    const { challengeId, challenge, userId, type, username, displayName } = await request.json()

    await this.storage.put(challengeId, {
      challenge,
      userId,
      type,
      username,
      displayName,
      createdAt: Date.now()
    })

    // 设置自动过期闹钟
    await this.state.storage.setAlarm(Date.now() + WEBAUTHN_CONFIG.CHALLENGE_TTL)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * 获取并验证挑战
   * @param {URL} url
   * @returns {Promise<Response>}
   */
  async getChallenge(url) {
    const challengeId = url.searchParams.get('id')
    if (!challengeId) {
      return new Response(JSON.stringify({ error: 'Missing challenge ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await this.storage.get(challengeId)
    if (!data) {
      return new Response(JSON.stringify({ error: 'Challenge not found or expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 检查是否过期
    if (Date.now() - data.createdAt > WEBAUTHN_CONFIG.CHALLENGE_TTL) {
      await this.storage.delete(challengeId)
      return new Response(JSON.stringify({ error: 'Challenge expired' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * 删除已使用的挑战 (防止重放)
   * @param {URL} url
   * @returns {Promise<Response>}
   */
  async deleteChallenge(url) {
    const challengeId = url.searchParams.get('id')
    if (challengeId) {
      await this.storage.delete(challengeId)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * 闹钟回调 - 清理过期挑战
   */
  async alarm() {
    const allEntries = await this.storage.list()
    const now = Date.now()

    for (const [key, value] of allEntries) {
      if (value && value.createdAt && now - value.createdAt > WEBAUTHN_CONFIG.CHALLENGE_TTL) {
        await this.storage.delete(key)
      }
    }
  }
}
