/**
 * @module workers/rate-limiter
 * @description Durable Object 实现分布式速率限制
 * 每个实例按 key（keyPrefix:IP）隔离，跨 Worker 实例共享计数
 */

export class RateLimiter {
  /**
   * @param {DurableObjectState} state
   */
  constructor(state) {
    this.state = state
    /** @type {number} */
    this.count = 0
    /** @type {number} */
    this.resetTime = 0
  }

  /**
   * 处理限流检查请求
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { windowMs, max } = await request.json()
    const now = Date.now()

    // 窗口过期则重置
    if (now > this.resetTime) {
      this.count = 0
      this.resetTime = now + windowMs
      // 窗口结束后自动唤醒清理
      await this.state.storage.setAlarm(this.resetTime + 1000)
    }

    this.count++

    const allowed = this.count <= max
    const remaining = Math.max(0, max - this.count)
    const retryAfter = allowed ? 0 : Math.ceil((this.resetTime - now) / 1000)

    return new Response(
      JSON.stringify({
        allowed,
        count: this.count,
        remaining,
        resetTime: this.resetTime,
        retryAfter
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  /**
   * 闹钟回调 — 窗口过期后重置状态
   */
  async alarm() {
    this.count = 0
    this.resetTime = 0
  }
}
