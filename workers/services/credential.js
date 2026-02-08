/**
 * @module workers/services/credential
 * @description WebAuthn 凭证 CRUD 服务
 */

import { eq, and, count } from 'drizzle-orm'
import { createDb, credentials } from '../db/index.js'

/**
 * 保存新的 WebAuthn 凭证
 * @param {Object} d1 - D1 数据库实例
 * @param {Object} params
 * @param {string} params.credentialId - 凭证 ID (base64url 编码)
 * @param {string} params.userId - 用户 ID
 * @param {Uint8Array} params.publicKey - 公钥
 * @param {number} params.counter - 签名计数器
 * @param {string[]} [params.transports] - 传输方式
 * @param {string} [params.deviceType] - 设备类型
 * @param {string} [params.deviceName] - 设备名称
 * @param {boolean} [params.backedUp] - 是否已备份
 * @returns {Promise<void>}
 */
export const saveCredential = async (
  d1,
  { credentialId, userId, publicKey, counter, transports, deviceType, deviceName, backedUp }
) => {
  const db = createDb(d1)
  await db.insert(credentials).values({
    id: credentialId,
    userId,
    publicKey,
    counter,
    transports: transports ? JSON.stringify(transports) : null,
    deviceType: deviceType || null,
    deviceName: deviceName || null,
    backedUp: backedUp ? 1 : 0
  })
}

/**
 * 通过凭证 ID 查找凭证
 * @param {Object} d1 - D1 数据库实例
 * @param {string} credentialId - 凭证 ID
 * @returns {Promise<Object|null>}
 */
export const findCredentialById = async (d1, credentialId) => {
  const db = createDb(d1)
  const row = await db.select().from(credentials).where(eq(credentials.id, credentialId)).get()

  if (!row) return null

  return {
    ...row,
    transports: row.transports ? JSON.parse(row.transports) : [],
    backedUp: !!row.backedUp
  }
}

/**
 * 获取用户的所有凭证
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object[]>}
 */
export const findCredentialsByUserId = async (d1, userId) => {
  const db = createDb(d1)
  const results = await db.select().from(credentials).where(eq(credentials.userId, userId))

  return results.map((row) => ({
    ...row,
    transports: row.transports ? JSON.parse(row.transports) : [],
    backedUp: !!row.backedUp
  }))
}

/**
 * 更新凭证的签名计数器
 * @param {Object} d1 - D1 数据库实例
 * @param {string} credentialId - 凭证 ID
 * @param {number} newCounter - 新的计数器值
 * @returns {Promise<void>}
 */
export const updateCredentialCounter = async (d1, credentialId, newCounter) => {
  const db = createDb(d1)
  await db.update(credentials).set({ counter: newCounter }).where(eq(credentials.id, credentialId))
}

/**
 * 删除凭证
 * @param {Object} d1 - D1 数据库实例
 * @param {string} credentialId - 凭证 ID
 * @param {string} userId - 用户 ID (确保只能删除自己的凭证)
 * @returns {Promise<boolean>} 是否成功删除
 */
export const deleteCredential = async (d1, credentialId, userId) => {
  const db = createDb(d1)
  const result = await db
    .delete(credentials)
    .where(and(eq(credentials.id, credentialId), eq(credentials.userId, userId)))
    .returning({ id: credentials.id })

  return result.length > 0
}

/**
 * 获取用户凭证数量
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<number>}
 */
export const getCredentialCount = async (d1, userId) => {
  const db = createDb(d1)
  const result = await db
    .select({ count: count() })
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .get()

  return result?.count || 0
}

/**
 * 格式化凭证信息用于 API 返回 (不包含敏感数据)
 * @param {Object} credential - 数据库凭证记录
 * @returns {Object}
 */
export const formatCredentialForResponse = (credential) => {
  return {
    id: credential.id,
    deviceType: credential.deviceType,
    deviceName: credential.deviceName,
    transports: credential.transports,
    backedUp: credential.backedUp
  }
}
