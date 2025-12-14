import { Hono } from 'hono'
import { OnlineCounter } from './online-counter.js'
import { corsGuard, handleCorsOptions, withCors } from './middleware/cors.js'
import { getCounterStub } from './services/counter.js'

const app = new Hono()

const handleOptionsRoute = (c) => handleCorsOptions(c.req.raw)

app.use('/ws', corsGuard)
app.use('/count', corsGuard)

app.options('/ws', handleOptionsRoute)
app.options('/count', handleOptionsRoute)

app.get('/count', async (c) => {
  const origin = c.req.header('Origin')
  const stub = getCounterStub(c.env)
  const response = await stub.fetch('https://counter/count')
  return withCors(response, origin)
})

app.get('/ws', async (c) => {
  const stub = getCounterStub(c.env)
  return stub.fetch(c.req.raw)
})

app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
export { OnlineCounter }
