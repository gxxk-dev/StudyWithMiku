export class OnlineCounter {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.sessions = []
  }

  async fetch(request) {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.state.acceptWebSocket(server)
    this.sessions.push(server)
    
    this.broadcast()

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message)
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    } catch (err) {
      console.error('Parse error:', err)
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    ws.close(1000, 'Goodbye')
    this.sessions = this.sessions.filter(s => s !== ws)
    this.broadcast()
  }

  async webSocketError(ws, error) {
    this.sessions = this.sessions.filter(s => s !== ws)
    this.broadcast()
  }

  broadcast() {
    const count = this.sessions.length
    const message = JSON.stringify({ type: 'count', count })
    
    this.sessions = this.sessions.filter(session => {
      try {
        session.send(message)
        return true
      } catch (err) {
        return false
      }
    })
  }
}

const getAllowedOrigins = () => {
  return [
    'https://study.mikugame.icu',
    'https://study.mikumod.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]
}

const isOriginAllowed = (origin) => {
  return getAllowedOrigins().includes(origin)
}

const getCorsHeaders = (origin) => {
  if (isOriginAllowed(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  }
  return {}
}

const verifyToken = (request, env) => {
  const url = new URL(request.url)
  const tokenFromUrl = url.searchParams.get('token')
  
  if (tokenFromUrl && tokenFromUrl === env.WS_TOKEN) {
    return true
  }
  
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return token === env.WS_TOKEN
  }
  
  return false
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      })
    }

    if (url.pathname === '/ws') {
      if (!isOriginAllowed(origin)) {
        return new Response('Forbidden', { status: 403 })
      }

      if (!verifyToken(request, env)) {
        return new Response('Unauthorized', { status: 401 })
      }

      const upgradeHeader = request.headers.get('Upgrade')
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 })
      }
      
      const id = env.ONLINE_COUNTER.idFromName('global')
      const stub = env.ONLINE_COUNTER.get(id)
      return stub.fetch(request)
    }

    if (url.pathname === '/count') {
      if (!isOriginAllowed(origin)) {
        return new Response('Forbidden', { status: 403 })
      }

      return new Response(JSON.stringify({ count: 0 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      })
    }

    return new Response('OK', { status: 200 })
  },
}
