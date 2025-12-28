import { Hono } from 'hono'
import { OnlineCounter } from './online-counter.js'
import { corsGuard, handleCorsOptions } from './middleware/cors.js'
import { getCounterStub } from './services/counter.js'

const app = new Hono()

const handleOptionsRoute = (c) => handleCorsOptions(c.req.raw)

app.use('/ws', corsGuard)
app.use('/count', corsGuard)

app.options('/ws', handleOptionsRoute)
app.options('/count', handleOptionsRoute)

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

app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
export { OnlineCounter }
