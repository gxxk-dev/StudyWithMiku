import { Hono } from 'hono'
import { OnlineCounter } from './online-counter.js'
import { AuthChallenge } from './auth-challenge.js'
import { RateLimiter } from './rate-limiter.js'
import { corsGuard, handleCorsOptions } from './middleware/cors.js'
import { securityHeaders } from './middleware/securityHeaders.js'
import { envDefaults } from './middleware/envDefaults.js'
import { getCounterStub } from './services/counter.js'
import authRoutes from './routes/auth/index.js'
import oauthRoutes from './routes/oauth.js'
import dataRoutes from './routes/data.js'

const app = new Hono()

const handleOptionsRoute = (c) => handleCorsOptions(c.req.raw)

// 全局错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

// 全局中间件
app.use('*', envDefaults()) // 自动检测环境变量
app.use('*', securityHeaders())

// CORS 配置
app.use('/ws', corsGuard)
app.use('/count', corsGuard)
app.use('/auth/*', corsGuard)
app.use('/oauth/*', corsGuard)
app.use('/api/*', corsGuard)

// OPTIONS 预检请求
app.options('/ws', handleOptionsRoute)
app.options('/count', handleOptionsRoute)
app.options('/auth/*', handleOptionsRoute)
app.options('/oauth/*', handleOptionsRoute)
app.options('/api/*', handleOptionsRoute)

// 在线计数路由
app.get('/count', async (c) => {
  try {
    const stub = getCounterStub(c.env)
    const response = await stub.fetch('https://counter/count')
    return response
  } catch (error) {
    console.error('Failed to get counter stub or fetch count:', error)
    return c.json({ error: 'Failed to get online count', message: error.message }, 500)
  }
})

app.get('/ws', async (c) => {
  try {
    const stub = getCounterStub(c.env)
    return stub.fetch(c.req.raw)
  } catch (error) {
    console.error('Failed to get counter stub for WebSocket:', error)
    return c.text('Failed to establish WebSocket connection', 500)
  }
})

// 认证路由
app.route('/auth', authRoutes)

// OAuth 路由
app.route('/oauth', oauthRoutes)

// 数据同步路由
app.route('/api/data', dataRoutes)

export default app
export { OnlineCounter, AuthChallenge, RateLimiter }
