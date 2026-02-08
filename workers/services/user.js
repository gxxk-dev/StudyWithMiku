/**
 * @module workers/services/user
 * @description 用户 CRUD 服务
 */

import { eq, and } from 'drizzle-orm'
import { createDb, users } from '../db/index.js'
import { AUTH_PROVIDER, USERNAME_REGEX } from '../constants.js'

/**
 * 生成用户 ID
 * @returns {string}
 */
const generateUserId = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 通过用户名查找用户
 * @param {Object} d1 - D1 数据库实例
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>}
 */
export const findUserByUsername = async (d1, username) => {
  const db = createDb(d1)
  return db.select().from(users).where(eq(users.username, username)).get()
}

/**
 * 通过 ID 查找用户
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object|null>}
 */
export const findUserById = async (d1, userId) => {
  const db = createDb(d1)
  return db.select().from(users).where(eq(users.id, userId)).get()
}

/**
 * 通过 OAuth Provider ID 查找用户
 * @param {Object} d1 - D1 数据库实例
 * @param {string} provider - OAuth provider (github/google/microsoft)
 * @param {string} providerId - Provider 用户 ID
 * @returns {Promise<Object|null>}
 */
export const findUserByProvider = async (d1, provider, providerId) => {
  const db = createDb(d1)
  return db
    .select()
    .from(users)
    .where(and(eq(users.authProvider, provider), eq(users.providerId, providerId)))
    .get()
}

/**
 * 检查用户名是否已存在
 * @param {Object} d1 - D1 数据库实例
 * @param {string} username - 用户名
 * @returns {Promise<boolean>}
 */
export const usernameExists = async (d1, username) => {
  const db = createDb(d1)
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .get()
  return !!result
}

/**
 * 验证用户名格式
 * @param {string} username - 用户名
 * @returns {boolean}
 */
export const isValidUsername = (username) => {
  return USERNAME_REGEX.test(username)
}

/**
 * 创建 WebAuthn 用户
 * @param {Object} d1 - D1 数据库实例
 * @param {Object} params
 * @param {string} params.username - 用户名
 * @param {string} [params.displayName] - 显示名称
 * @returns {Promise<Object>}
 */
export const createWebAuthnUser = async (d1, { username, displayName }) => {
  const db = createDb(d1)
  const userId = generateUserId()

  await db.insert(users).values({
    id: userId,
    username,
    displayName: displayName || username,
    authProvider: AUTH_PROVIDER.WEBAUTHN
  })

  return {
    id: userId,
    username,
    displayName: displayName || username,
    authProvider: AUTH_PROVIDER.WEBAUTHN
  }
}

/**
 * 创建或获取 OAuth 用户
 * @param {Object} d1 - D1 数据库实例
 * @param {Object} params
 * @param {string} params.provider - OAuth provider
 * @param {string} params.providerId - Provider 用户 ID
 * @param {string} params.preferredUsername - 首选用户名
 * @param {string} [params.displayName] - 显示名称
 * @param {string} [params.avatarUrl] - 头像 URL
 * @returns {Promise<{user: Object, isNew: boolean}>}
 */
export const createOrGetOAuthUser = async (
  d1,
  { provider, providerId, preferredUsername, displayName, avatarUrl }
) => {
  const db = createDb(d1)

  // 检查是否已存在
  const existingUser = await findUserByProvider(d1, provider, providerId)
  if (existingUser) {
    return { user: existingUser, isNew: false }
  }

  // 生成唯一用户名
  let username = sanitizeUsername(preferredUsername)
  let suffix = 0

  while (await usernameExists(d1, username)) {
    suffix++
    username = `${sanitizeUsername(preferredUsername)}${suffix}`
  }

  const userId = generateUserId()

  await db.insert(users).values({
    id: userId,
    username,
    displayName: displayName || username,
    avatarUrl: avatarUrl || null,
    authProvider: provider,
    providerId
  })

  const user = {
    id: userId,
    username,
    displayName: displayName || username,
    avatarUrl,
    authProvider: provider,
    providerId
  }

  return { user, isNew: true }
}

/**
 * 更新用户信息
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<void>}
 */
export const updateUser = async (d1, userId, updates) => {
  const db = createDb(d1)
  const allowedFields = ['displayName', 'avatarUrl']
  const fieldsToUpdate = {}

  for (const key of allowedFields) {
    if (key in updates) {
      fieldsToUpdate[key] = updates[key]
    }
  }

  if (Object.keys(fieldsToUpdate).length === 0) return

  await db.update(users).set(fieldsToUpdate).where(eq(users.id, userId))
}

/**
 * 删除用户
 * @param {Object} d1 - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<void>}
 */
export const deleteUser = async (d1, userId) => {
  const db = createDb(d1)
  await db.delete(users).where(eq(users.id, userId))
}

/**
 * 清理用户名，确保符合格式要求
 * @param {string} input - 输入字符串
 * @returns {string}
 */
const sanitizeUsername = (input) => {
  // 移除非法字符，保留字母数字和下划线
  let sanitized = input.replace(/[^a-zA-Z0-9_]/g, '')

  // 确保长度在 3-20 之间
  if (sanitized.length < 3) {
    sanitized = sanitized.padEnd(3, '_')
  }
  if (sanitized.length > 17) {
    // 留出空间给数字后缀
    sanitized = sanitized.slice(0, 17)
  }

  return sanitized
}

/**
 * 格式化用户信息用于 API 返回
 * @param {Object} user - 数据库用户记录
 * @returns {Object}
 */
export const formatUserForResponse = (user) => {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider
  }
}
