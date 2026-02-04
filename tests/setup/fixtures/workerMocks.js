/**
 * Workers 测试用 Mock D1 数据库
 * 模拟 Cloudflare D1 的基本 API
 */

import { vi } from 'vitest'

/**
 * 创建 Mock D1 数据库
 * @returns {Object} Mock D1 实例
 */
export const createMockD1 = () => {
  // 内存表存储
  const tables = {
    users: [],
    credentials: [],
    token_blacklist: [],
    user_data: []
  }

  // SQL 解析辅助函数
  const parseInsert = (sql, bindings) => {
    const match = sql.match(
      /INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i
    )
    if (!match) return null
    const [, table, columns] = match
    const cols = columns.split(',').map((c) => c.trim())
    const values = {}
    cols.forEach((col, i) => {
      values[col] = bindings[i]
    })
    return { table, values }
  }

  const parseSelect = (sql, bindings) => {
    const match = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i)
    if (!match) return null
    const [, columns, table, where] = match
    return { columns, table, where, bindings }
  }

  const parseUpdate = (sql, bindings) => {
    const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i)
    if (!match) return null
    const [, table, setClause, where] = match
    return { table, setClause, where, bindings }
  }

  const parseDelete = (sql, bindings) => {
    const match = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i)
    if (!match) return null
    const [, table, where] = match
    return { table, where, bindings }
  }

  // 评估 WHERE 条件
  const evaluateWhere = (row, where, bindings) => {
    if (!where) return true

    // 处理 AND 条件
    const conditions = where.split(/\s+AND\s+/i)
    let bindingIndex = 0

    return conditions.every((condition) => {
      const eqMatch = condition.match(/(\w+)\s*=\s*\?/)
      if (eqMatch) {
        const [, col] = eqMatch
        const val = bindings[bindingIndex++]
        return row[col] === val
      }

      const ltMatch = condition.match(/(\w+)\s*<\s*\?/)
      if (ltMatch) {
        const [, col] = ltMatch
        const val = bindings[bindingIndex++]
        return row[col] < val
      }

      return true
    })
  }

  /**
   * 创建 prepared statement
   */
  const prepare = (sql) => {
    let boundValues = []

    const statement = {
      bind: (...values) => {
        boundValues = values
        return statement
      },

      first: async () => {
        const parsed = parseSelect(sql, boundValues)
        if (!parsed) return null

        const table = tables[parsed.table]
        if (!table) return null

        // 处理 COUNT(*) 聚合
        if (parsed.columns.toUpperCase().includes('COUNT(*)')) {
          const filtered = table.filter((r) => evaluateWhere(r, parsed.where, boundValues))
          return { count: filtered.length }
        }

        // 处理 SUM(LENGTH(...)) 聚合
        const sumMatch = parsed.columns.match(/SUM\s*\(\s*LENGTH\s*\(\s*(\w+)\s*\)\s*\)/i)
        if (sumMatch) {
          const col = sumMatch[1]
          const filtered = table.filter((r) => evaluateWhere(r, parsed.where, boundValues))
          const total = filtered.reduce((sum, row) => {
            const val = row[col]
            return sum + (typeof val === 'string' ? val.length : 0)
          }, 0)
          return { total }
        }

        const row = table.find((r) => evaluateWhere(r, parsed.where, boundValues))
        return row || null
      },

      all: async () => {
        const parsed = parseSelect(sql, boundValues)
        if (!parsed) return { results: [] }

        const table = tables[parsed.table]
        if (!table) return { results: [] }

        const results = table.filter((r) => evaluateWhere(r, parsed.where, boundValues))
        return { results }
      },

      run: async () => {
        // INSERT
        if (sql.toUpperCase().includes('INSERT')) {
          const parsed = parseInsert(sql, boundValues)
          if (parsed && tables[parsed.table]) {
            // 检查 UNIQUE 约束
            const table = tables[parsed.table]
            const isIgnore = sql.toUpperCase().includes('OR IGNORE')

            // 简单的主键检查
            if (parsed.values.id) {
              const exists = table.find((r) => r.id === parsed.values.id)
              if (exists) {
                if (isIgnore) return { meta: { changes: 0 } }
                throw new Error('UNIQUE constraint failed')
              }
            }

            // 用户名唯一性检查
            if (parsed.table === 'users' && parsed.values.username) {
              const exists = table.find((r) => r.username === parsed.values.username)
              if (exists) {
                if (isIgnore) return { meta: { changes: 0 } }
                throw new Error('UNIQUE constraint failed: users.username')
              }
            }

            table.push({ ...parsed.values })
            return { meta: { changes: 1 } }
          }
        }

        // UPDATE
        if (sql.toUpperCase().includes('UPDATE')) {
          const parsed = parseUpdate(sql, boundValues)
          if (parsed && tables[parsed.table]) {
            const table = tables[parsed.table]
            let changes = 0

            // 解析 SET 子句
            const setMatch = parsed.setClause.match(/(\w+)\s*=\s*\?/g)
            const setCols = setMatch ? setMatch.map((m) => m.match(/(\w+)/)[1]) : []

            // WHERE 条件的 binding 从 SET 之后开始
            const whereBindings = boundValues.slice(setCols.length)

            table.forEach((row) => {
              if (evaluateWhere(row, parsed.where, whereBindings)) {
                setCols.forEach((col, i) => {
                  row[col] = boundValues[i]
                })
                changes++
              }
            })

            return { meta: { changes } }
          }
        }

        // DELETE
        if (sql.toUpperCase().includes('DELETE')) {
          const parsed = parseDelete(sql, boundValues)
          if (parsed && tables[parsed.table]) {
            const table = tables[parsed.table]
            const initialLength = table.length

            tables[parsed.table] = table.filter((r) => !evaluateWhere(r, parsed.where, boundValues))

            return { meta: { changes: initialLength - tables[parsed.table].length } }
          }
        }

        return { meta: { changes: 0 } }
      }
    }

    return statement
  }

  /**
   * 批量执行
   */
  const batch = async (statements) => {
    const results = []
    for (const stmt of statements) {
      results.push(await stmt.run())
    }
    return results
  }

  return {
    prepare,
    batch,
    // 测试辅助方法
    __getTables: () => tables,
    __setTable: (name, data) => {
      tables[name] = data
    },
    __clearTables: () => {
      Object.keys(tables).forEach((key) => {
        tables[key] = []
      })
    }
  }
}

/**
 * 创建 Mock Durable Object Stub
 * @returns {Object} Mock DO Stub
 */
export const createMockDOStub = () => {
  const storage = new Map()

  return {
    fetch: vi.fn(async (url, options = {}) => {
      const parsedUrl = new URL(url)
      const method = options.method || 'GET'

      if (method === 'PUT') {
        const body = JSON.parse(options.body)
        storage.set(body.challengeId, {
          challenge: body.challenge,
          userId: body.userId,
          type: body.type,
          username: body.username,
          displayName: body.displayName,
          createdAt: Date.now()
        })
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (method === 'GET') {
        const id = parsedUrl.searchParams.get('id')
        const data = storage.get(id)
        if (!data) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (method === 'DELETE') {
        const id = parsedUrl.searchParams.get('id')
        storage.delete(id)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response('Method not allowed', { status: 405 })
    }),
    // 测试辅助
    __getStorage: () => storage,
    __clearStorage: () => storage.clear()
  }
}

/**
 * 创建 Mock Cloudflare Workers 环境
 * @param {Object} overrides - 环境变量覆盖
 * @returns {Object} Mock env 对象
 */
export const createMockEnv = (overrides = {}) => {
  const db = createMockD1()
  const challengeStub = createMockDOStub()

  return {
    DB: db,
    AUTH_CHALLENGE: {
      idFromName: vi.fn(() => 'mock-id'),
      get: vi.fn(() => challengeStub)
    },
    JWT_SECRET: 'test-jwt-secret-32-characters-long',
    WEBAUTHN_RP_ID: 'localhost',
    WEBAUTHN_RP_NAME: 'Test App',
    OAUTH_CALLBACK_BASE: 'http://localhost:3000',
    GITHUB_CLIENT_ID: 'test-github-client-id',
    GITHUB_CLIENT_SECRET: 'test-github-client-secret',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    MICROSOFT_CLIENT_ID: 'test-microsoft-client-id',
    MICROSOFT_CLIENT_SECRET: 'test-microsoft-client-secret',
    MICROSOFT_TENANT_ID: 'common',
    ...overrides,
    // 测试辅助
    __getDB: () => db,
    __getChallengeStub: () => challengeStub
  }
}

/**
 * 创建 Mock Hono Context
 * @param {Object} options - 配置选项
 * @returns {Object} Mock Context
 */
export const createMockContext = (options = {}) => {
  const { env = createMockEnv(), body = {}, headers = {}, params = {}, query = {} } = options

  const contextData = new Map()
  let responseStatus = 200
  let responseBody = null
  let responseHeaders = new Headers()

  return {
    env,
    req: {
      json: vi.fn(async () => body),
      header: vi.fn((name) => headers[name]),
      param: vi.fn((name) => params[name]),
      query: vi.fn((name) => query[name]),
      valid: vi.fn((type) => {
        if (type === 'json') return body
        if (type === 'param') return params
        return {}
      }),
      raw: {
        headers: new Headers(headers)
      }
    },
    json: vi.fn((data, status = 200, resHeaders = {}) => {
      responseBody = data
      responseStatus = status
      Object.entries(resHeaders).forEach(([k, v]) => responseHeaders.set(k, v))
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...resHeaders }
      })
    }),
    text: vi.fn((text, status = 200) => {
      responseBody = text
      responseStatus = status
      return new Response(text, { status })
    }),
    redirect: vi.fn((url) => {
      return new Response(null, {
        status: 302,
        headers: { Location: url }
      })
    }),
    set: vi.fn((key, value) => contextData.set(key, value)),
    get: vi.fn((key) => contextData.get(key)),
    res: {
      headers: responseHeaders
    },
    // 测试辅助
    __getResponseBody: () => responseBody,
    __getResponseStatus: () => responseStatus,
    __getContextData: () => contextData
  }
}

/**
 * 重置所有 mock
 */
export const resetWorkerMocks = () => {
  vi.clearAllMocks()
}
