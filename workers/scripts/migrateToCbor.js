/**
 * @module workers/scripts/migrateToCbor
 * @description 批量迁移脚本 - 将 JSON 格式数据转换为 CBOR 格式
 *
 * 使用方法:
 * 1. 在 wrangler.toml 中配置 D1 数据库绑定
 * 2. 运行: wrangler d1 execute <database_name> --file=./workers/scripts/migrateToCbor.js
 *
 * 或者通过 API 调用（需要管理员权限）
 */

import { encode } from 'cbor-x'
import { compressData } from '../../shared/cbor/index.js'

/** 批量处理大小 */
const BATCH_SIZE = 100

/**
 * 迁移单条记录
 * @param {Object} db - D1 数据库实例
 * @param {Object} row - 数据行
 * @returns {Promise<boolean>} 是否成功
 */
async function migrateRow(db, row) {
  try {
    // 解析 JSON 数据
    const jsonData = JSON.parse(row.data.toString())

    // 压缩并编码为 CBOR
    const compressed = compressData(row.data_type, jsonData)
    const cborData = encode(compressed)

    // 更新数据库
    await db
      .prepare(
        `UPDATE user_data
         SET data = ?, data_format = 'cbor'
         WHERE user_id = ? AND data_type = ?`
      )
      .bind(cborData, row.user_id, row.data_type)
      .run()

    return true
  } catch (error) {
    console.error(`迁移失败: user_id=${row.user_id}, type=${row.data_type}`, error)
    return false
  }
}

/**
 * 批量迁移所有 JSON 格式数据
 * @param {Object} db - D1 数据库实例
 * @returns {Promise<{total: number, success: number, failed: number}>}
 */
export async function migrateAllToCbor(db) {
  const stats = { total: 0, success: 0, failed: 0 }

  // 获取所有 JSON 格式的数据
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const rows = await db
      .prepare(
        `SELECT user_id, data_type, data
         FROM user_data
         WHERE data_format = 'json'
         LIMIT ? OFFSET ?`
      )
      .bind(BATCH_SIZE, offset)
      .all()

    if (!rows.results || rows.results.length === 0) {
      hasMore = false
      break
    }

    for (const row of rows.results) {
      stats.total++
      const success = await migrateRow(db, row)
      if (success) {
        stats.success++
      } else {
        stats.failed++
      }
    }

    offset += BATCH_SIZE
    console.log(`已处理 ${offset} 条记录...`)
  }

  return stats
}

/**
 * 迁移指定用户的数据
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<{total: number, success: number, failed: number}>}
 */
export async function migrateUserToCbor(db, userId) {
  const stats = { total: 0, success: 0, failed: 0 }

  const rows = await db
    .prepare(
      `SELECT user_id, data_type, data
       FROM user_data
       WHERE user_id = ? AND data_format = 'json'`
    )
    .bind(userId)
    .all()

  if (!rows.results) {
    return stats
  }

  for (const row of rows.results) {
    stats.total++
    const success = await migrateRow(db, row)
    if (success) {
      stats.success++
    } else {
      stats.failed++
    }
  }

  return stats
}

/**
 * 获取迁移状态统计
 * @param {Object} db - D1 数据库实例
 * @returns {Promise<{json: number, cbor: number, total: number}>}
 */
export async function getMigrationStats(db) {
  const result = await db
    .prepare(
      `SELECT data_format, COUNT(*) as count
       FROM user_data
       GROUP BY data_format`
    )
    .all()

  const stats = { json: 0, cbor: 0, total: 0 }

  if (result.results) {
    for (const row of result.results) {
      if (row.data_format === 'json') {
        stats.json = row.count
      } else if (row.data_format === 'cbor') {
        stats.cbor = row.count
      }
      stats.total += row.count
    }
  }

  return stats
}
