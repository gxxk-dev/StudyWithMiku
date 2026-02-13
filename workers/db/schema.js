/**
 * @module workers/db/schema
 * @description Drizzle ORM 表结构定义
 */

import {
  sqliteTable,
  text,
  integer,
  blob,
  primaryKey,
  index,
  uniqueIndex
} from 'drizzle-orm/sqlite-core'

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
    email: text('email'),
    qqNumber: text('qq_number')
  },
  (table) => [index('idx_users_username').on(table.username)]
)

/**
 * OAuth 账号表
 * @description 多对一关联用户，支持一个用户绑定多个 OAuth 账号
 */
export const oauthAccounts = sqliteTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerId: text('provider_id').notNull(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    email: text('email'),
    linkedAt: integer('linked_at').notNull()
  },
  (table) => [
    index('idx_oauth_accounts_user_id').on(table.userId),
    uniqueIndex('idx_oauth_accounts_provider').on(table.provider, table.providerId)
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
    publicKey: blob('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    transports: text('transports'),
    deviceType: text('device_type'),
    deviceName: text('device_name'),
    backedUp: integer('backed_up').notNull().default(0),
    lastUsedAt: integer('last_used_at')
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
 * data 字段存储 CBOR 二进制数据，dataFormat 标识格式（用于迁移期间兼容）
 */
export const userData = sqliteTable(
  'user_data',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dataType: text('data_type').notNull(),
    data: blob('data').notNull(),
    dataFormat: text('data_format').notNull().default('cbor'),
    version: integer('version').notNull().default(1)
  },
  (table) => [primaryKey({ columns: [table.userId, table.dataType] })]
)
