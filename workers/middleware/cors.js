const parseAllowedOrigins = (corsOriginsStr) => {
  if (!corsOriginsStr) return new Set()
  return new Set(
    corsOriginsStr
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  )
}

const getSelfOrigin = (requestUrl) => {
  if (!requestUrl) return null
  try {
    const url = new URL(requestUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

const isOriginAllowed = (origin, allowedOrigins, requestUrl, env) => {
  if (!origin) return false
  // 开发环境自动允许 localhost
  try {
    const url = new URL(origin)
    if (
      env?.ENVIRONMENT === 'development' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    ) {
      return true
    }
  } catch {
    return false
  }
  // 自动允许与 Worker 同源的请求
  const selfOrigin = getSelfOrigin(requestUrl)
  if (selfOrigin && origin === selfOrigin) return true
  // 额外白名单（CORS_ORIGINS 环境变量）
  return allowedOrigins.has(origin)
}

const getCorsHeaders = (origin, env, requestUrl) => {
  const allowedOrigins = parseAllowedOrigins(env?.CORS_ORIGINS)
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  }
  if (origin && isOriginAllowed(origin, allowedOrigins, requestUrl, env)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

const withCors = (response, origin, env, requestUrl) => {
  const headers = new Headers(response.headers)
  const cors = getCorsHeaders(origin, env, requestUrl)
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

const handleCorsOptions = (request, env) => {
  const origin = request.headers.get('Origin')
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, env, request.url)
  })
}

const corsGuard = async (c, next) => {
  const origin = c.req.header('Origin')
  await next()
  if (c.res && c.res.status >= 200) {
    c.res = withCors(c.res, origin, c.env, c.req.url)
  }
}

export { corsGuard, handleCorsOptions, withCors }
