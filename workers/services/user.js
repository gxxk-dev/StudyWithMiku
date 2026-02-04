/**
 * @module workers/services/user
 * @description 用户 CRUD 服务
 */

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
 * @param {Object} db - D1 数据库实例
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>}
 */
export const findUserByUsername = async (db, username) => {
  return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first()
}

/**
 * 通过 ID 查找用户
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object|null>}
 */
export const findUserById = async (db, userId) => {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
}

/**
 * 通过 OAuth Provider ID 查找用户
 * @param {Object} db - D1 数据库实例
 * @param {string} provider - OAuth provider (github/google/microsoft)
 * @param {string} providerId - Provider 用户 ID
 * @returns {Promise<Object|null>}
 */
export const findUserByProvider = async (db, provider, providerId) => {
  return db
    .prepare('SELECT * FROM users WHERE auth_provider = ? AND provider_id = ?')
    .bind(provider, providerId)
    .first()
}

/**
 * 检查用户名是否已存在
 * @param {Object} db - D1 数据库实例
 * @param {string} username - 用户名
 * @returns {Promise<boolean>}
 */
export const usernameExists = async (db, username) => {
  const result = await db.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first()
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
 * @param {Object} db - D1 数据库实例
 * @param {Object} params
 * @param {string} params.username - 用户名
 * @param {string} [params.displayName] - 显示名称
 * @returns {Promise<Object>}
 */
export const createWebAuthnUser = async (db, { username, displayName }) => {
  const userId = generateUserId()

  await db
    .prepare(
      `INSERT INTO users (id, username, display_name, auth_provider)
       VALUES (?, ?, ?, ?)`
    )
    .bind(userId, username, displayName || username, AUTH_PROVIDER.WEBAUTHN)
    .run()

  return {
    id: userId,
    username,
    displayName: displayName || username,
    authProvider: AUTH_PROVIDER.WEBAUTHN
  }
}

/**
 * 创建或获取 OAuth 用户
 * @param {Object} db - D1 数据库实例
 * @param {Object} params
 * @param {string} params.provider - OAuth provider
 * @param {string} params.providerId - Provider 用户 ID
 * @param {string} params.preferredUsername - 首选用户名
 * @param {string} [params.displayName] - 显示名称
 * @param {string} [params.avatarUrl] - 头像 URL
 * @returns {Promise<{user: Object, isNew: boolean}>}
 */
export const createOrGetOAuthUser = async (
  db,
  { provider, providerId, preferredUsername, displayName, avatarUrl }
) => {
  // 检查是否已存在
  const existingUser = await findUserByProvider(db, provider, providerId)
  if (existingUser) {
    return { user: existingUser, isNew: false }
  }

  // 生成唯一用户名
  let username = sanitizeUsername(preferredUsername)
  let suffix = 0

  while (await usernameExists(db, username)) {
    suffix++
    username = `${sanitizeUsername(preferredUsername)}${suffix}`
  }

  const userId = generateUserId()

  await db
    .prepare(
      `INSERT INTO users (id, username, display_name, avatar_url, auth_provider, provider_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(userId, username, displayName || username, avatarUrl || null, provider, providerId)
    .run()

  const user = {
    id: userId,
    username,
    display_name: displayName || username,
    avatar_url: avatarUrl,
    auth_provider: provider,
    provider_id: providerId
  }

  return { user, isNew: true }
}

/**
 * 更新用户信息
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<void>}
 */
export const updateUser = async (db, userId, updates) => {
  const allowedFields = ['display_name', 'avatar_url']
  const fieldsToUpdate = Object.keys(updates).filter((k) => allowedFields.includes(k))

  if (fieldsToUpdate.length === 0) return

  const setClause = fieldsToUpdate.map((f) => `${f} = ?`).join(', ')
  const values = fieldsToUpdate.map((f) => updates[f])

  await db
    .prepare(`UPDATE users SET ${setClause} WHERE id = ?`)
    .bind(...values, userId)
    .run()
}

/**
 * 删除用户
 * @param {Object} db - D1 数据库实例
 * @param {string} userId - 用户 ID
 * @returns {Promise<void>}
 */
export const deleteUser = async (db, userId) => {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
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
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    authProvider: user.auth_provider
  }
}
