/**
 * @module workers/db
 * @description Drizzle ORM 客户端导出
 */

import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema.js'

// 导出所有表结构
export * from './schema.js'

/**
 * 创建 Drizzle 数据库客户端
 * @param {D1Database} d1 - Cloudflare D1 数据库实例
 * @returns {import('drizzle-orm/d1').DrizzleD1Database<typeof schema>}
 */
export const createDb = (d1) => {
  return drizzle(d1, { schema })
}
