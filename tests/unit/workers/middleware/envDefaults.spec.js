/**
 * envDefaults 中间件测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { envDefaults } from '../../../../workers/middleware/envDefaults.js'
import { createMockContext } from '../../../setup/fixtures/workerMocks.js'

describe('envDefaults', () => {
  let mockEnv

  beforeEach(() => {
    mockEnv = {
      JWT_SECRET: 'test-secret'
      // 故意不设置 WEBAUTHN_RP_ID 等变量
    }
  })

  it('应该自动检测 WEBAUTHN_RP_ID', async () => {
    const c = createMockContext({
      env: mockEnv,
      headers: { Host: 'example.com' }
    })
    c.req.raw = new Request('https://example.com/auth/register/options')

    const next = () => Promise.resolve()
    const middleware = envDefaults()

    await middleware(c, next)

    expect(c.env.WEBAUTHN_RP_ID).toBe('example.com')
  })

  it('应该自动检测 OAUTH_CALLBACK_BASE', async () => {
    const c = createMockContext({
      env: mockEnv,
      headers: { Host: 'example.com' }
    })
    c.req.raw = new Request('https://example.com/oauth/github')

    const next = () => Promise.resolve()
    const middleware = envDefaults()

    await middleware(c, next)

    expect(c.env.OAUTH_CALLBACK_BASE).toBe('https://example.com')
  })

  it('应该自动设置 WEBAUTHN_RP_NAME', async () => {
    const c = createMockContext({
      env: mockEnv,
      headers: { Host: 'example.com' }
    })
    c.req.raw = new Request('https://example.com/auth/me')

    const next = () => Promise.resolve()
    const middleware = envDefaults()

    await middleware(c, next)

    expect(c.env.WEBAUTHN_RP_NAME).toBe('Study with Miku')
  })

  it('不应该覆盖已设置的环境变量', async () => {
    const envWithConfig = {
      ...mockEnv,
      WEBAUTHN_RP_ID: 'custom.domain.com',
      OAUTH_CALLBACK_BASE: 'https://custom.domain.com',
      WEBAUTHN_RP_NAME: 'Custom App'
    }

    const c = createMockContext({
      env: envWithConfig,
      headers: { Host: 'example.com' }
    })
    c.req.raw = new Request('https://example.com/auth/me')

    const next = () => Promise.resolve()
    const middleware = envDefaults()

    await middleware(c, next)

    expect(c.env.WEBAUTHN_RP_ID).toBe('custom.domain.com')
    expect(c.env.OAUTH_CALLBACK_BASE).toBe('https://custom.domain.com')
    expect(c.env.WEBAUTHN_RP_NAME).toBe('Custom App')
  })

  it('应该处理 localhost 开发环境', async () => {
    const c = createMockContext({
      env: mockEnv,
      headers: { Host: 'localhost:8787' }
    })
    c.req.raw = new Request('http://localhost:8787/auth/me')

    const next = () => Promise.resolve()
    const middleware = envDefaults()

    await middleware(c, next)

    expect(c.env.WEBAUTHN_RP_ID).toBe('localhost')
    expect(c.env.OAUTH_CALLBACK_BASE).toBe('http://localhost:8787')
  })

  it('应该处理 Workers 子域名', async () => {
    const c = createMockContext({
      env: mockEnv,
      headers: { Host: 'my-worker.my-subdomain.workers.dev' }
    })
    c.req.raw = new Request('https://my-worker.my-subdomain.workers.dev/auth/me')

    const next = () => Promise.resolve()
    const middleware = envDefaults()

    await middleware(c, next)

    expect(c.env.WEBAUTHN_RP_ID).toBe('my-worker.my-subdomain.workers.dev')
    expect(c.env.OAUTH_CALLBACK_BASE).toBe('https://my-worker.my-subdomain.workers.dev')
  })
})
