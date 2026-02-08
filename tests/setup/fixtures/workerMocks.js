/**
 * Workers 测试用 Mock D1 数据库
 * 模拟 Cloudflare D1 的基本 API，支持 Drizzle ORM
 */

import { vi } from 'vitest'

/**
 * 字段名映射：数据库字段 -> JS 字段
 */
const fieldMappings = {
  users: {
    display_name: 'displayName',
    avatar_url: 'avatarUrl',
    auth_provider: 'authProvider',
    provider_id: 'providerId'
  },
  credentials: {
    user_id: 'userId',
    public_key: 'publicKey',
    device_type: 'deviceType',
    device_name: 'deviceName',
    backed_up: 'backedUp'
  },
  token_blacklist: {
    expires_at: 'expiresAt'
  },
  user_data: {
    user_id: 'userId',
    data_type: 'dataType',
    data_format: 'dataFormat'
  }
}

/**
 * 反向映射：JS 字段 -> 数据库字段
 */
const reverseFieldMappings = {}
Object.entries(fieldMappings).forEach(([table, mapping]) => {
  reverseFieldMappings[table] = {}
  Object.entries(mapping).forEach(([dbField, jsField]) => {
    reverseFieldMappings[table][jsField] = dbField
  })
})

/**
 * 将行数据从数据库格式转换为 JS 格式
 */
const convertRowToJs = (table, row) => {
  if (!row) return null
  const mapping = fieldMappings[table] || {}
  const result = {}
  Object.entries(row).forEach(([key, value]) => {
    const jsKey = mapping[key] || key
    // 对于 BLOB 字段（如 public_key），确保返回 Buffer
    // Drizzle 期望 BLOB 是 Buffer 类型
    if (table === 'credentials' && key === 'public_key' && value instanceof Uint8Array) {
      result[jsKey] = Buffer.from(value)
    } else {
      result[jsKey] = value
    }
  })
  return result
}

/**
 * 将行数据从 JS 格式转换为数据库格式
 */
const convertRowToDb = (table, row) => {
  if (!row) return null
  const mapping = reverseFieldMappings[table] || {}
  const result = {}
  Object.entries(row).forEach(([key, value]) => {
    const dbKey = mapping[key] || key
    result[dbKey] = value
  })
  return result
}

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

  /**
   * 提取表名和别名
   */
  const extractTableInfo = (sql) => {
    // 匹配 FROM "table" 或 FROM table
    const fromMatch = sql.match(/FROM\s+["']?(\w+)["']?/i)
    // 匹配 INTO "table" 或 INTO table
    const intoMatch = sql.match(/INTO\s+["']?(\w+)["']?/i)
    // 匹配 UPDATE "table" 或 UPDATE table
    const updateMatch = sql.match(/UPDATE\s+["']?(\w+)["']?/i)
    // 匹配 DELETE FROM "table"
    const deleteMatch = sql.match(/DELETE\s+FROM\s+["']?(\w+)["']?/i)

    return fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1] || deleteMatch?.[1] || null
  }

  /**
   * 解析 WHERE 条件 - 支持 Drizzle 生成的 SQL
   */
  const parseWhereConditions = (sql, bindings) => {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+RETURNING|\s*$)/i)
    if (!whereMatch) return null

    // 移除外层括号
    let whereClause = whereMatch[1].trim()
    if (whereClause.startsWith('(') && whereClause.endsWith(')')) {
      whereClause = whereClause.slice(1, -1)
    }

    const conditions = []
    let bindingIndex = 0

    // 分割 AND 条件
    const parts = whereClause.split(/\s+and\s+/i)

    for (const part of parts) {
      // 移除可能残留的括号
      const cleanPart = part.replace(/^\(|\)$/g, '').trim()

      // 匹配 "table"."column" = ? 或 column = ?
      const eqMatch = cleanPart.match(/["']?(?:\w+\.)?["']?["']?(\w+)["']?\s*=\s*\?/i)
      if (eqMatch) {
        conditions.push({
          column: eqMatch[1],
          operator: '=',
          value: bindings[bindingIndex++]
        })
        continue
      }

      // 匹配 column < ?
      const ltMatch = cleanPart.match(/["']?(?:\w+\.)?["']?["']?(\w+)["']?\s*<\s*\?/i)
      if (ltMatch) {
        conditions.push({
          column: ltMatch[1],
          operator: '<',
          value: bindings[bindingIndex++]
        })
      }
    }

    return conditions
  }

  /**
   * 评估 WHERE 条件
   */
  const evaluateConditions = (row, conditions, _table) => {
    if (!conditions || conditions.length === 0) return true

    const dbRow = row // row 已经是数据库格式

    return conditions.every((cond) => {
      const value = dbRow[cond.column]
      switch (cond.operator) {
        case '=':
          return value === cond.value
        case '<':
          return value < cond.value
        default:
          return true
      }
    })
  }

  /**
   * 解析 INSERT 语句
   */
  const parseInsert = (sql, bindings) => {
    // 匹配 INSERT INTO "table" ("col1", "col2") VALUES (?, ?)
    const match = sql.match(/INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i)
    if (!match) return null

    const table = match[1]
    const columnsStr = match[2]
    const columns = columnsStr.split(',').map((c) => c.trim().replace(/["']/g, ''))

    const values = {}
    columns.forEach((col, i) => {
      values[col] = bindings[i]
    })

    return { table, values }
  }

  /**
   * 解析 UPDATE SET 子句
   */
  const parseUpdateSet = (sql, bindings) => {
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
    if (!setMatch) return { updates: {}, usedBindings: 0 }

    const setPart = setMatch[1]
    const updates = {}
    let bindingIndex = 0

    // 分割多个 SET 条件
    const parts = setPart.split(',')
    for (const part of parts) {
      const colMatch = part.match(/["']?(\w+)["']?\s*=\s*\?/i)
      if (colMatch) {
        updates[colMatch[1]] = bindings[bindingIndex++]
      }
    }

    return { updates, usedBindings: bindingIndex }
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

      /**
       * Drizzle ORM 使用 raw() 来获取原始数据
       * 返回的是数据库原始格式的数组（每行是一个值数组）
       */
      raw: async () => {
        const table = extractTableInfo(sql)
        if (!table || !tables[table]) return []

        const tableData = tables[table]
        const conditions = parseWhereConditions(sql, boundValues)

        // 处理 DELETE ... RETURNING (Drizzle 使用 raw() 执行带 RETURNING 的 DELETE)
        if (sql.toLowerCase().startsWith('delete')) {
          const deleted = tableData.filter((r) => evaluateConditions(r, conditions, table))
          tables[table] = tableData.filter((r) => !evaluateConditions(r, conditions, table))

          // 提取 RETURNING 的列
          const retMatch = sql.match(/returning\s+(.+?)$/i)
          if (retMatch) {
            const retCols = retMatch[1].split(',').map((c) => c.trim().replace(/["']/g, ''))
            return deleted.map((row) => retCols.map((col) => row[col]))
          }
          return deleted.map((row) => Object.values(row))
        }

        // 处理 COUNT(*) 聚合
        if (sql.toLowerCase().includes('count(*)')) {
          const filtered = tableData.filter((r) => evaluateConditions(r, conditions, table))
          return [[filtered.length]]
        }

        // 提取列名（数据库格式，snake_case）
        const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i)
        let columns = []
        if (selectMatch) {
          const colStr = selectMatch[1]
          // 匹配 "table"."column" 格式
          const colMatches = colStr.matchAll(/"(\w+)"."(\w+)"/g)
          for (const m of colMatches) {
            columns.push(m[2]) // 数据库列名（snake_case）
          }
          // 如果没有匹配到，尝试简单列名
          if (columns.length === 0) {
            columns = colStr.split(',').map((c) => c.trim().replace(/["']/g, ''))
          }
        }

        // 获取所有匹配的行
        const rows = tableData.filter((r) => evaluateConditions(r, conditions, table))

        // 返回数组格式的数据（每行是一个数组）
        return rows.map((row) => {
          if (columns.length === 0 || columns.includes('*')) {
            return Object.values(row)
          }
          return columns.map((col) => row[col])
        })
      },

      first: async () => {
        const table = extractTableInfo(sql)
        if (!table || !tables[table]) return null

        const tableData = tables[table]

        // 处理 COUNT(*) 聚合
        if (sql.toUpperCase().includes('COUNT(*)') || sql.toLowerCase().includes('count(*)')) {
          const conditions = parseWhereConditions(sql, boundValues)
          const filtered = tableData.filter((r) => evaluateConditions(r, conditions, table))
          return { count: filtered.length }
        }

        // 处理 SUM(LENGTH(...)) 聚合
        const sumMatch = sql.match(
          /SUM\s*\(\s*LENGTH\s*\(\s*["']?(\w+)["']?\.["']?(\w+)["']?\s*\)\s*\)/i
        )
        if (sumMatch) {
          const col = sumMatch[2]
          const conditions = parseWhereConditions(sql, boundValues)
          const filtered = tableData.filter((r) => evaluateConditions(r, conditions, table))
          const total = filtered.reduce((sum, row) => {
            const val = row[col]
            return sum + (typeof val === 'string' ? val.length : 0)
          }, 0)
          return { total }
        }

        const conditions = parseWhereConditions(sql, boundValues)
        const row = tableData.find((r) => evaluateConditions(r, conditions, table))

        // 转换为 camelCase
        return convertRowToJs(table, row)
      },

      all: async () => {
        const table = extractTableInfo(sql)
        if (!table || !tables[table]) return { results: [] }

        const conditions = parseWhereConditions(sql, boundValues)
        const results = tables[table]
          .filter((r) => evaluateConditions(r, conditions, table))
          .map((r) => convertRowToJs(table, r))

        return { results }
      },

      run: async () => {
        // INSERT
        if (sql.toUpperCase().includes('INSERT')) {
          const parsed = parseInsert(sql, boundValues)
          if (parsed && tables[parsed.table]) {
            const table = tables[parsed.table]
            const isIgnore =
              sql.toUpperCase().includes('OR IGNORE') || sql.toUpperCase().includes('ON CONFLICT')

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

            // jti 主键检查
            if (parsed.table === 'token_blacklist' && parsed.values.jti) {
              const exists = table.find((r) => r.jti === parsed.values.jti)
              if (exists) {
                if (isIgnore) return { meta: { changes: 0 } }
                throw new Error('UNIQUE constraint failed: token_blacklist.jti')
              }
            }

            // 复合主键检查 (user_data)
            if (parsed.table === 'user_data') {
              const exists = table.find(
                (r) =>
                  r.user_id === parsed.values.user_id && r.data_type === parsed.values.data_type
              )
              if (exists) {
                if (isIgnore) return { meta: { changes: 0 } }
                throw new Error('UNIQUE constraint failed: user_data primary key')
              }
            }

            table.push({ ...parsed.values })
            return { meta: { changes: 1 } }
          }
        }

        // UPDATE
        if (sql.toUpperCase().includes('UPDATE')) {
          const table = extractTableInfo(sql)
          if (!table || !tables[table]) return { meta: { changes: 0 } }

          const tableData = tables[table]
          let changes = 0

          const { updates, usedBindings } = parseUpdateSet(sql, boundValues)
          const whereBindings = boundValues.slice(usedBindings)
          const conditions = parseWhereConditions(sql, whereBindings)

          tableData.forEach((row) => {
            if (evaluateConditions(row, conditions, table)) {
              Object.assign(row, updates)
              changes++
            }
          })

          return { meta: { changes } }
        }

        // DELETE
        if (sql.toUpperCase().includes('DELETE')) {
          const table = extractTableInfo(sql)
          if (!table || !tables[table]) return { meta: { changes: 0 } }

          const conditions = parseWhereConditions(sql, boundValues)
          const initialLength = tables[table].length

          // 如果有 RETURNING，需要返回删除的行
          if (sql.toUpperCase().includes('RETURNING')) {
            const deleted = tables[table].filter((r) => evaluateConditions(r, conditions, table))
            tables[table] = tables[table].filter((r) => !evaluateConditions(r, conditions, table))
            return deleted.map((r) => convertRowToJs(table, r))
          }

          tables[table] = tables[table].filter((r) => !evaluateConditions(r, conditions, table))
          return { meta: { changes: initialLength - tables[table].length } }
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
      // 将传入的数据存为数据库格式
      tables[name] = data.map((row) => {
        const result = {}
        // 如果数据已经是数据库格式（有下划线），直接使用
        const isDbFormat = Object.keys(row).some((k) => k.includes('_'))
        const processedRow = isDbFormat ? row : convertRowToDb(name, row)

        // 处理每个字段，恢复被 JSON 序列化破坏的 Uint8Array
        Object.entries(processedRow).forEach(([key, value]) => {
          // 检查是否是被 JSON.stringify 转换的 Uint8Array（变成了 {0: x, 1: y, ...}）
          if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Uint8Array)
          ) {
            const keys = Object.keys(value)
            // 检查是否所有键都是数字索引
            if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
              const arr = new Uint8Array(keys.length)
              keys.forEach((k) => {
                arr[parseInt(k)] = value[k]
              })
              result[key] = arr
              return
            }
          }
          result[key] = value
        })
        return result
      })
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
