/* global WebSocketPair */
export class OnlineCounter {
  constructor(state, env) {
    this.state = state
    this.env = env
  }

  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/count') {
      return this.createCountResponse()
    }

    const upgrade = request.headers.get('Upgrade')
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.state.acceptWebSocket(server)
    this.broadcast()

    return new Response(null, {
      status: 101,
      webSocket: client
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
      try {
        ws.close(1003, 'Invalid message format')
      } catch (closeErr) {
        console.warn('Failed to close invalid websocket:', closeErr.message)
      }
    }
  }

  async webSocketClose(ws) {
    try {
      ws.close(1000, 'Goodbye')
    } catch (err) {
      console.warn('WebSocket close error:', err.message)
    }
    this.broadcast()
  }

  async webSocketError() {
    this.broadcast()
  }

  broadcast() {
    const sessions = this.state.getWebSockets()
    const count = sessions.length
    const message = JSON.stringify({ type: 'count', count })

    for (const session of sessions) {
      try {
        session.send(message)
      } catch (err) {
        console.warn('Broadcast to session failed:', err.message)
      }
    }
  }

  createCountResponse() {
    const count = this.state.getWebSockets().length
    return new Response(JSON.stringify({ count }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    })
  }
}
