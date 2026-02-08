/**
 * @module workers/db/schema
 * @description Drizzle ORM 表结构定义
 */

import { sqliteTable, text, integer, blob, primaryKey, index } from 'drizzle-orm/sqlite-core'

/**
 * 用户表
 * @description 不存储时间戳，由客户端数据携带
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    authProvider: text('auth_provider').notNull().default('webauthn'),
    providerId: text('provider_id')
  },
  (table) => [
    index('idx_users_username').on(table.username),
    index('idx_users_provider').on(table.authProvider, table.providerId)
  ]
)

/**
 * WebAuthn 凭证表
 * @description counter 用于安全检测，需要持久化
 */
export const credentials = sqliteTable(
  'credentials',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    publicKey: blob('public_key', { mode: 'buffer' }).notNull(),
    counter: integer('counter').notNull().default(0),
    transports: text('transports'),
    deviceType: text('device_type'),
    deviceName: text('device_name'),
    backedUp: integer('backed_up').notNull().default(0)
  },
  (table) => [index('idx_credentials_user_id').on(table.userId)]
)

/**
 * Token 黑名单表
 * @description expires_at 用于自动清理
 */
export const tokenBlacklist = sqliteTable(
  'token_blacklist',
  {
    jti: text('jti').primaryKey(),
    expiresAt: integer('expires_at').notNull()
  },
  (table) => [index('idx_token_blacklist_expires').on(table.expiresAt)]
)

/**
 * 用户数据表
 * @description version 用于冲突检测，复合主键
 */
export const userData = sqliteTable(
  'user_data',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dataType: text('data_type').notNull(),
    data: text('data').notNull(),
    version: integer('version').notNull().default(1)
  },
  (table) => [primaryKey({ columns: [table.userId, table.dataType] })]
)
