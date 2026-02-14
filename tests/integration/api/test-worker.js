/**
 * @module tests/integration/api/test-worker
 * @description 测试专用 Worker 入口
 *
 * 导入生产 Hono app，添加测试辅助端点（seed/reset），
 * 生产代码零修改。
 */

import app from '../../../workers/index.js'

// 添加测试辅助端点
app.post('/__test/seed', async (c) => {
  const { statements } = await c.req.json()
  const db = c.env.DB

  const results = []
  for (const sql of statements) {
    try {
      const result = await db.prepare(sql).run()
      results.push({ success: true, meta: result.meta })
    } catch (error) {
      results.push({ success: false, error: error.message, sql })
    }
  }

  return c.json({ results })
})

app.post('/__test/reset', async (c) => {
  const db = c.env.DB
  const tables = ['user_data', 'token_blacklist', 'credentials', 'oauth_accounts', 'users']

  for (const table of tables) {
    await db.prepare(`DELETE FROM ${table}`).run()
  }

  return c.json({ ok: true })
})

export default app
export { OnlineCounter } from '../../../workers/online-counter.js'
export { AuthChallenge } from '../../../workers/auth-challenge.js'
