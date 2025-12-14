import { Hono } from 'hono'
import { OnlineCounter } from './online-counter.js'

const allowedOrigins = [
  'https://study.mikugame.icu',
  'https://study.mikumod.com',
  'http://localhost:3000',
  'http://localhost:8787',
]

const isOriginAllowed = (origin) => {
  if (!origin) return true
  return allowedOrigins.includes(origin)
}

const getCorsHeaders = (origin) => {
  if (isOriginAllowed(origin) && origin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  }
  return {}
}

const withCors = (response, origin) => {
  const headers = new Headers(response.headers)
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const getCounterStub = (env) => {
  const id = env.ONLINE_COUNTER.idFromName('global')
  return env.ONLINE_COUNTER.get(id)
}

const handleOptions = (request) => {
  const origin = request.headers.get('Origin')
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

const app = new Hono()

app.options('/ws', (c) => handleOptions(c.req.raw))
app.options('/count', (c) => handleOptions(c.req.raw))

app.get('/count', async (c) => {
  const origin = c.req.header('Origin')
  if (!isOriginAllowed(origin)) {
    return withCors(new Response('Forbidden', { status: 403 }), origin)
  }
  const stub = getCounterStub(c.env)
  const response = await stub.fetch('https://counter/count')
  return withCors(response, origin)
})

app.get('/ws', async (c) => {
  const origin = c.req.header('Origin')
  if (!isOriginAllowed(origin)) {
    return new Response('Forbidden', { status: 403, headers: getCorsHeaders(origin) })
  }

  const stub = getCounterStub(c.env)
  return stub.fetch(c.req.raw)
})

const apiPaths = new Set(['/count', '/ws'])

const isApiRequest = (request) => {
  const url = new URL(request.url)
  return apiPaths.has(url.pathname)
}

export default {
  fetch(request, env, ctx) {
    const apiRoute = isApiRequest(request)
    if (apiRoute) {
      return app.fetch(request, env, ctx)
    }
    return env.ASSETS.fetch(request)
  },
}
export { OnlineCounter }
