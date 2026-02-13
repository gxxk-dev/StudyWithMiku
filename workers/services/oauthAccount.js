/**
 * @module workers/services/oauthAccount
 * @description OAuth 账号 CRUD 服务
 */

import { eq, and, count } from 'drizzle-orm'
import { createDb, oauthAccounts } from '../db/index.js'

/**
 * 生成 OAuth 账号 ID
 * @returns {string}
 */
const generateOAuthAccountId = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 通过 provider + providerId 查找 OAuth 账号
 * @param {Object} d1 - D1 数据库实例
 * @param {string} provider - OAuth provider
 * @param {string} providerId - Provider 用户 ID
 * @returns {Promise<Object|null>}
 */
export const findOAuthAccount = async (d1, provider, providerId) => {
  const db = createDb(d1)
  return db
    .select()
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerId, providerId)))
    .get()
}

/**
 * 获取用户所有 OAuth 账号
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object[]>}
 */
export const findOAuthAccountsByUserId = async (d1, userId) => {
  const db = createDb(d1)
  return db.select().from(oauthAccounts).where(eq(oauthAccounts.userId, userId))
}

/**
 * 创建 OAuth 账号关联
 * @param {Object} d1 - D1 数据库实例
 * @param {Object} params
 * @param {string} params.userId - 用户 ID
 * @param {string} params.provider - OAuth provider
 * @param {string} params.providerId - Provider 用户 ID
 * @param {string} [params.displayName] - 显示名称
 * @param {string} [params.avatarUrl] - 头像 URL
 * @param {string} [params.email] - 邮箱
 * @returns {Promise<Object>}
 */
export const linkOAuthAccount = async (
  d1,
  { userId, provider, providerId, displayName, avatarUrl, email }
) => {
  const db = createDb(d1)
  const id = generateOAuthAccountId()

  const account = {
    id,
    userId,
    provider,
    providerId,
    displayName: displayName || null,
    avatarUrl: avatarUrl || null,
    email: email || null,
    linkedAt: Date.now()
  }

  await db.insert(oauthAccounts).values(account)
  return account
}

/**
 * 解除 OAuth 账号关联
 * @param {Object} d1 - D1 数据库实例
 * @param {string} accountId - OAuth 账号 ID
 * @param {string} userId - 用户 ID (确保只能解绑自己的)
 * @returns {Promise<boolean>} 是否成功删除
 */
export const unlinkOAuthAccount = async (d1, accountId, userId) => {
  const db = createDb(d1)
  const result = await db
    .delete(oauthAccounts)
    .where(and(eq(oauthAccounts.id, accountId), eq(oauthAccounts.userId, userId)))
    .returning({ id: oauthAccounts.id })

  return result.length > 0
}

/**
 * 获取用户 OAuth 账号数量
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<number>}
 */
export const getOAuthAccountCount = async (d1, userId) => {
  const db = createDb(d1)
  const result = await db
    .select({ count: count() })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId))
    .get()

  return result?.count || 0
}

/**
 * 格式化 OAuth 账号用于 API 返回
 * @param {Object} account - 数据库 OAuth 账号记录
 * @returns {Object}
 */
export const formatOAuthAccountForResponse = (account) => {
  return {
    id: account.id,
    type: 'oauth',
    provider: account.provider,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    email: account.email,
    linkedAt: account.linkedAt
  }
}

/**
 * 转移 OAuth 账号到另一个用户
 * @param {Object} d1 - D1 数据库实例
 * @param {string} accountId - OAuth 账号 ID
 * @param {string} newUserId - 新用户 ID
 * @returns {Promise<void>}
 */
export const transferOAuthAccount = async (d1, accountId, newUserId) => {
  const db = createDb(d1)
  await db.update(oauthAccounts).set({ userId: newUserId }).where(eq(oauthAccounts.id, accountId))
}
