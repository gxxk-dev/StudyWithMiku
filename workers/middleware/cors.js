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

const handleCorsOptions = (request) => {
  const origin = request.headers.get('Origin')
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

const corsGuard = async (c, next) => {
  const origin = c.req.header('Origin')
  if (!isOriginAllowed(origin)) {
    return withCors(new Response('Forbidden', { status: 403 }), origin)
  }
  await next()
}

export { corsGuard, handleCorsOptions, withCors }
