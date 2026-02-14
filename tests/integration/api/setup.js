/**
 * @module tests/integration/api/setup
 * @description API 集成测试的 Worker 生命周期管理、DB 初始化、JWT 生成、fetch 补丁
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sign } from 'hono/jwt'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../..')

const TEST_JWT_SECRET = 'test-jwt-secret-for-integration-tests'
const TEST_USER_ID = 'test-user-001'
const TEST_USERNAME = 'testuser'

let worker = null
let originalFetch = null

/**
 * 启动 Worker
 */
export async function startWorker() {
  const { unstable_dev } = await import('wrangler')

  worker = await unstable_dev(resolve(__dirname, 'test-worker.js'), {
    experimental: { disableExperimentalWarning: true },
    local: true,
    persist: false,
    vars: { JWT_SECRET: TEST_JWT_SECRET },
    config: resolve(ROOT, 'wrangler.toml')
  })

  // 补丁 fetch：将相对路径转为 worker 地址
  originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = `http://${worker.address}:${worker.port}${input}`
    }
    return originalFetch(input, init)
  }
}

/**
 * 停止 Worker 并恢复 fetch
 */
export async function stopWorker() {
  if (originalFetch) {
    globalThis.fetch = originalFetch
    originalFetch = null
  }
  if (worker) {
    await worker.stop()
    worker = null
  }
}

/**
 * 初始化数据库 schema
 */
export async function initDatabase() {
  // 先删除所有表，确保 schema 与迁移一致（子表在前，父表在后）
  const dropStatements = [
    'DROP TABLE IF EXISTS user_data',
    'DROP TABLE IF EXISTS token_blacklist',
    'DROP TABLE IF EXISTS credentials',
    'DROP TABLE IF EXISTS oauth_accounts',
    'DROP TABLE IF EXISTS users'
  ]

  await workerFetch('/__test/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: dropStatements })
  })

  const migrationFiles = [
    'migrations/0000_busy_galactus.sql',
    'migrations/0001_awesome_susan_delgado.sql'
  ]

  const statements = migrationFiles.flatMap((file) => {
    const sql = readFileSync(resolve(ROOT, file), 'utf-8')
    return sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)
  })

  // 对于全新数据库，DROP INDEX 会失败，过滤掉
  const filtered = statements.filter((s) => !s.startsWith('DROP INDEX'))

  const res = await workerFetch('/__test/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: filtered })
  })

  const data = await res.json()
  const failed = data.results.filter((r) => !r.success)
  if (failed.length > 0) {
    const realErrors = failed.filter((f) => !f.error?.includes('already exists'))
    if (realErrors.length > 0) {
      throw new Error(`DB init failed: ${JSON.stringify(realErrors)}`)
    }
  }
}

/**
 * 插入测试用户
 */
export async function seedTestUser() {
  const statements = [
    `INSERT OR IGNORE INTO users (id, username, display_name) VALUES ('${TEST_USER_ID}', '${TEST_USERNAME}', 'Test User')`
  ]

  await workerFetch('/__test/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements })
  })
}

/**
 * 重置数据库（清空所有表数据）
 */
export async function resetDatabase() {
  await workerFetch('/__test/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * 生成有效的 Access Token
 */
export async function generateAccessToken(userId = TEST_USER_ID, username = TEST_USERNAME) {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    {
      sub: userId,
      username,
      type: 'access',
      iat: now,
      exp: now + 900,
      jti: crypto.randomUUID()
    },
    TEST_JWT_SECRET,
    'HS256'
  )
}

/**
 * 生成有效的 Refresh Token
 */
export async function generateRefreshToken(userId = TEST_USER_ID) {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    {
      sub: userId,
      type: 'refresh',
      iat: now,
      exp: now + 7 * 24 * 3600,
      jti: crypto.randomUUID()
    },
    TEST_JWT_SECRET,
    'HS256'
  )
}

/**
 * 生成已过期的 Access Token
 */
export async function generateExpiredToken(userId = TEST_USER_ID, username = TEST_USERNAME) {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    {
      sub: userId,
      username,
      type: 'access',
      iat: now - 1800,
      exp: now - 900,
      jti: crypto.randomUUID()
    },
    TEST_JWT_SECRET,
    'HS256'
  )
}

/**
 * 直接向 worker 发送请求（绕过 fetch 补丁）
 */
function workerFetch(path, init) {
  const url = `http://${worker.address}:${worker.port}${path}`
  return originalFetch(url, init)
}

export { TEST_USER_ID, TEST_USERNAME, TEST_JWT_SECRET }
