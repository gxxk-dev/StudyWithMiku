const getCorsHeaders = (origin) => {
  const allowOrigin = origin ?? '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  }
}

const withCors = (response, origin) => {
  const headers = new Headers(response.headers)
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

const handleCorsOptions = (request) => {
  const origin = request.headers.get('Origin')
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  })
}

const corsGuard = async (c, next) => {
  const origin = c.req.header('Origin')
  await next()
  if (c.res && c.res.status >= 200) {
    c.res = withCors(c.res, origin)
  }
}

export { corsGuard, handleCorsOptions, withCors }
