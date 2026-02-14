import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  rateLimit,
  authRateLimit,
  dataRateLimit,
  generalRateLimit
} from '../../../../workers/middleware/rateLimit.js'

// 每个测试使用唯一 IP 避免状态泄漏
let testIpCounter = 0
const uniqueIp = () => `10.0.${Math.floor(testIpCounter / 256)}.${testIpCounter++ % 256}`

/**
 * 创建模拟 RateLimiter DO 实例（内存状态）
 */
const createMockDO = () => {
  const instances = new Map()

  return {
    idFromName: vi.fn((name) => name),
    get: vi.fn((id) => {
      if (!instances.has(id)) {
        let count = 0
        let resetTime = 0
        instances.set(id, {
          fetch: vi.fn(async (_url, opts) => {
            const { windowMs, max } = JSON.parse(opts.body)
            const now = Date.now()

            if (now > resetTime) {
              count = 0
              resetTime = now + windowMs
            }

            count++
            const allowed = count <= max
            const remaining = Math.max(0, max - count)
            const retryAfter = allowed ? 0 : Math.ceil((resetTime - now) / 1000)

            return new Response(
              JSON.stringify({ allowed, count, remaining, resetTime, retryAfter })
            )
          })
        })
      }
      return instances.get(id)
    })
  }
}

/**
 * 创建 mock Hono context
 */
const createMockContext = (ip, rateLimiterBinding) => {
  const resHeaders = new Headers()
  return {
    req: {
      header: vi.fn((name) => {
        if (name === 'CF-Connecting-IP') return ip
        if (name === 'X-Forwarded-For') return null
        return null
      })
    },
    env: { RATE_LIMITER: rateLimiterBinding },
    json: vi.fn((data, status, headers = {}) => {
      Object.entries(headers).forEach(([k, v]) => resHeaders.set(k, v))
      return { data, status }
    }),
    res: { headers: resHeaders }
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('workers/middleware/rateLimit', () => {
  describe('rateLimit', () => {
    it('未超限时通过请求', async () => {
      const ip = uniqueIp()
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'test' })
      const c = createMockContext(ip, doBinding)
      const next = vi.fn()

      await middleware(c, next)

      expect(next).toHaveBeenCalled()
    })

    it('超限时返回 429 和 Retry-After', async () => {
      const ip = uniqueIp()
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 2, keyPrefix: 'test2' })

      // 前 2 次通过
      for (let i = 0; i < 2; i++) {
        const c = createMockContext(ip, doBinding)
        await middleware(c, vi.fn())
      }

      // 第 3 次被限制
      const c = createMockContext(ip, doBinding)
      const next = vi.fn()
      await middleware(c, next)

      expect(next).not.toHaveBeenCalled()
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Too many requests', code: 'RATE_LIMITED' }),
        429,
        expect.objectContaining({ 'Retry-After': expect.any(String) })
      )
    })

    it('窗口过期后重置计数', async () => {
      const ip = uniqueIp()
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 1000, max: 1, keyPrefix: 'test3' })

      // 第 1 次通过
      const c1 = createMockContext(ip, doBinding)
      await middleware(c1, vi.fn())

      // 第 2 次被限制
      const c2 = createMockContext(ip, doBinding)
      await middleware(c2, vi.fn())
      expect(c2.json).toHaveBeenCalled()

      // 窗口过期
      vi.advanceTimersByTime(1100)

      // 第 3 次通过（新窗口）
      const c3 = createMockContext(ip, doBinding)
      const next3 = vi.fn()
      await middleware(c3, next3)
      expect(next3).toHaveBeenCalled()
    })

    it('设置 X-RateLimit-* 响应头', async () => {
      const ip = uniqueIp()
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'test4' })
      const c = createMockContext(ip, doBinding)
      const next = vi.fn()

      await middleware(c, next)

      expect(c.res.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(c.res.headers.get('X-RateLimit-Remaining')).toBe('9')
      expect(c.res.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('不同 IP 独立计数', async () => {
      const ip1 = uniqueIp()
      const ip2 = uniqueIp()
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 1, keyPrefix: 'test5' })

      // IP1 第 1 次通过
      const c1 = createMockContext(ip1, doBinding)
      await middleware(c1, vi.fn())

      // IP1 第 2 次被限制
      const c1b = createMockContext(ip1, doBinding)
      await middleware(c1b, vi.fn())
      expect(c1b.json).toHaveBeenCalled()

      // IP2 第 1 次仍然通过
      const c2 = createMockContext(ip2, doBinding)
      const next2 = vi.fn()
      await middleware(c2, next2)
      expect(next2).toHaveBeenCalled()
    })

    it('不同 keyPrefix 独立计数', async () => {
      const ip = uniqueIp()
      const doBinding = createMockDO()
      const middleware1 = rateLimit({ windowMs: 60000, max: 1, keyPrefix: 'prefixA' })
      const middleware2 = rateLimit({ windowMs: 60000, max: 1, keyPrefix: 'prefixB' })

      // prefixA 第 1 次通过
      const c1 = createMockContext(ip, doBinding)
      await middleware1(c1, vi.fn())

      // prefixA 第 2 次被限制
      const c1b = createMockContext(ip, doBinding)
      await middleware1(c1b, vi.fn())
      expect(c1b.json).toHaveBeenCalled()

      // prefixB 第 1 次仍然通过
      const c2 = createMockContext(ip, doBinding)
      const next2 = vi.fn()
      await middleware2(c2, next2)
      expect(next2).toHaveBeenCalled()
    })

    it('通过 DO idFromName 生成正确的 key', async () => {
      const ip = uniqueIp()
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'myprefix' })
      const c = createMockContext(ip, doBinding)

      await middleware(c, vi.fn())

      expect(doBinding.idFromName).toHaveBeenCalledWith(`myprefix:${ip}`)
    })
  })

  describe('getClientIP', () => {
    it('优先使用 CF-Connecting-IP', async () => {
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 100, keyPrefix: 'ip1' })
      const c = {
        req: {
          header: vi.fn((name) => {
            if (name === 'CF-Connecting-IP') return '1.1.1.1'
            if (name === 'X-Forwarded-For') return '2.2.2.2'
            return null
          })
        },
        env: { RATE_LIMITER: doBinding },
        res: { headers: new Headers() }
      }
      await middleware(c, vi.fn())
      expect(c.req.header).toHaveBeenCalledWith('CF-Connecting-IP')
    })

    it('回退到 X-Forwarded-For', async () => {
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 100, keyPrefix: 'ip2' })
      const c = {
        req: {
          header: vi.fn((name) => {
            if (name === 'CF-Connecting-IP') return null
            if (name === 'X-Forwarded-For') return '3.3.3.3'
            return null
          })
        },
        env: { RATE_LIMITER: doBinding },
        res: { headers: new Headers() }
      }
      await middleware(c, vi.fn())
      expect(c.req.header).toHaveBeenCalledWith('X-Forwarded-For')
    })

    it('都没有时使用 unknown', async () => {
      const doBinding = createMockDO()
      const middleware = rateLimit({ windowMs: 60000, max: 100, keyPrefix: 'ip3' })
      const c = {
        req: { header: vi.fn(() => null) },
        env: { RATE_LIMITER: doBinding },
        res: { headers: new Headers() }
      }
      const next = vi.fn()
      await middleware(c, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('预配置中间件', () => {
    it('authRateLimit 是函数', () => {
      expect(typeof authRateLimit).toBe('function')
    })

    it('dataRateLimit 是函数', () => {
      expect(typeof dataRateLimit).toBe('function')
    })

    it('generalRateLimit 是函数', () => {
      expect(typeof generalRateLimit).toBe('function')
    })
  })
})
