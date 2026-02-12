import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthChallenge } from '../../../workers/auth-challenge.js'

/**
 * 创建 mock DurableObjectState
 */
const createMockState = () => {
  const storage = new Map()
  let alarmTime = null

  return {
    storage: {
      get: vi.fn(async (key) => storage.get(key)),
      put: vi.fn(async (key, value) => storage.set(key, value)),
      delete: vi.fn(async (key) => storage.delete(key)),
      list: vi.fn(async () => storage),
      setAlarm: vi.fn(async (time) => {
        alarmTime = time
      }),
      getAlarm: vi.fn(async () => alarmTime),
      // 测试辅助
      __getStorage: () => storage,
      __getAlarmTime: () => alarmTime
    }
  }
}

/**
 * 创建 mock Request
 */
const createRequest = (method, url, body = null) => {
  const init = { method }
  if (body) {
    init.body = JSON.stringify(body)
  }
  return {
    method,
    url,
    json: vi.fn(async () => body)
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('workers/auth-challenge (Durable Object)', () => {
  let state
  let challenge

  beforeEach(() => {
    state = createMockState()
    challenge = new AuthChallenge(state)
  })

  describe('storeChallenge (PUT)', () => {
    it('存储 challenge 数据', async () => {
      const body = {
        challengeId: 'ch-001',
        challenge: 'random-challenge-string',
        userId: 'user-001',
        type: 'registration',
        username: 'testuser',
        displayName: 'Test User'
      }
      const request = createRequest('PUT', 'https://do/challenge', body)

      const response = await challenge.fetch(request)
      const data = await response.json()

      expect(data.ok).toBe(true)
      expect(state.storage.put).toHaveBeenCalledWith(
        'ch-001',
        expect.objectContaining({
          challenge: 'random-challenge-string',
          userId: 'user-001',
          type: 'registration',
          createdAt: expect.any(Number)
        })
      )
    })

    it('设置自动过期闹钟', async () => {
      const body = {
        challengeId: 'ch-002',
        challenge: 'test',
        userId: 'user-001',
        type: 'authentication'
      }
      const request = createRequest('PUT', 'https://do/challenge', body)

      await challenge.fetch(request)

      expect(state.storage.setAlarm).toHaveBeenCalled()
    })
  })

  describe('getChallenge (GET)', () => {
    it('返回有效的 challenge', async () => {
      // 先存储
      const storeBody = {
        challengeId: 'ch-003',
        challenge: 'valid-challenge',
        userId: 'user-001',
        type: 'registration',
        username: 'test',
        displayName: 'Test'
      }
      await challenge.fetch(createRequest('PUT', 'https://do/challenge', storeBody))

      // 获取
      const request = createRequest('GET', 'https://do/challenge?id=ch-003')
      const response = await challenge.fetch(request)
      const data = await response.json()

      expect(data.challenge).toBe('valid-challenge')
      expect(data.userId).toBe('user-001')
    })

    it('不存在的 challenge 返回 404', async () => {
      const request = createRequest('GET', 'https://do/challenge?id=nonexistent')
      const response = await challenge.fetch(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('过期的 challenge 返回 410', async () => {
      // 存储
      const storeBody = {
        challengeId: 'ch-expired',
        challenge: 'old-challenge',
        userId: 'user-001',
        type: 'registration',
        username: 'test',
        displayName: 'Test'
      }
      await challenge.fetch(createRequest('PUT', 'https://do/challenge', storeBody))

      // 前进 6 分钟（超过 5 分钟 TTL）
      vi.advanceTimersByTime(6 * 60 * 1000)

      const request = createRequest('GET', 'https://do/challenge?id=ch-expired')
      const response = await challenge.fetch(request)

      expect(response.status).toBe(410)
      const data = await response.json()
      expect(data.error).toContain('expired')
    })

    it('缺少 challenge ID 返回 400', async () => {
      const request = createRequest('GET', 'https://do/challenge')
      const response = await challenge.fetch(request)

      expect(response.status).toBe(400)
    })
  })

  describe('deleteChallenge (DELETE)', () => {
    it('删除已使用的 challenge', async () => {
      // 存储
      const storeBody = {
        challengeId: 'ch-del',
        challenge: 'to-delete',
        userId: 'user-001',
        type: 'registration',
        username: 'test',
        displayName: 'Test'
      }
      await challenge.fetch(createRequest('PUT', 'https://do/challenge', storeBody))

      // 删除
      const request = createRequest('DELETE', 'https://do/challenge?id=ch-del')
      const response = await challenge.fetch(request)
      const data = await response.json()

      expect(data.ok).toBe(true)
      expect(state.storage.delete).toHaveBeenCalledWith('ch-del')
    })

    it('防重放：删除后无法再获取', async () => {
      // 存储
      const storeBody = {
        challengeId: 'ch-replay',
        challenge: 'replay-test',
        userId: 'user-001',
        type: 'authentication',
        username: 'test',
        displayName: 'Test'
      }
      await challenge.fetch(createRequest('PUT', 'https://do/challenge', storeBody))

      // 删除
      await challenge.fetch(createRequest('DELETE', 'https://do/challenge?id=ch-replay'))

      // 尝试获取
      const response = await challenge.fetch(
        createRequest('GET', 'https://do/challenge?id=ch-replay')
      )
      expect(response.status).toBe(404)
    })
  })

  describe('alarm', () => {
    it('清理过期的 challenge', async () => {
      // 存储两个 challenge
      await challenge.fetch(
        createRequest('PUT', 'https://do/challenge', {
          challengeId: 'ch-old',
          challenge: 'old',
          userId: 'u1',
          type: 'registration',
          username: 'test',
          displayName: 'Test'
        })
      )

      // 前进 3 分钟
      vi.advanceTimersByTime(3 * 60 * 1000)

      await challenge.fetch(
        createRequest('PUT', 'https://do/challenge', {
          challengeId: 'ch-new',
          challenge: 'new',
          userId: 'u2',
          type: 'registration',
          username: 'test2',
          displayName: 'Test2'
        })
      )

      // 前进 3 分钟（ch-old 已过期 6 分钟，ch-new 才 3 分钟）
      vi.advanceTimersByTime(3 * 60 * 1000)

      await challenge.alarm()

      // ch-old 应该被清理
      expect(state.storage.delete).toHaveBeenCalledWith('ch-old')
    })
  })

  describe('fetch 路由', () => {
    it('PUT 分发到 storeChallenge', async () => {
      const request = createRequest('PUT', 'https://do/challenge', {
        challengeId: 'ch-route',
        challenge: 'test',
        userId: 'u1',
        type: 'registration'
      })
      const response = await challenge.fetch(request)
      expect(response.status).toBe(200)
    })

    it('GET 分发到 getChallenge', async () => {
      const request = createRequest('GET', 'https://do/challenge?id=nonexistent')
      const response = await challenge.fetch(request)
      expect(response.status).toBe(404)
    })

    it('DELETE 分发到 deleteChallenge', async () => {
      const request = createRequest('DELETE', 'https://do/challenge?id=test')
      const response = await challenge.fetch(request)
      expect(response.status).toBe(200)
    })

    it('不支持的方法返回 405', async () => {
      const request = createRequest('PATCH', 'https://do/challenge')
      const response = await challenge.fetch(request)
      expect(response.status).toBe(405)
    })
  })
})
