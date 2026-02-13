/**
 * @module workers/schemas/auth
 * @description Zod 验证 Schema - 认证和数据同步
 */

import { z } from 'zod'
import { DATA_CONFIG } from '../constants.js'

// ============================================================
// 认证相关 Schema
// ============================================================

/**
 * 用户名验证
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')

/**
 * 注册选项请求
 */
export const registerOptionsSchema = z.object({
  username: usernameSchema,
  displayName: z.string().max(50).optional()
})

/**
 * 注册验证请求
 */
export const registerVerifySchema = z.object({
  challengeId: z.string(),
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
      transports: z.array(z.string()).optional(),
      publicKeyAlgorithm: z.number().optional(),
      publicKey: z.string().optional(),
      authenticatorData: z.string().optional()
    }),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.unknown()).optional(),
    type: z.literal('public-key')
  }),
  deviceName: z.string().max(50).optional()
})

/**
 * 登录选项请求
 */
export const loginOptionsSchema = z.object({
  username: usernameSchema
})

/**
 * 登录验证请求
 */
export const loginVerifySchema = z.object({
  challengeId: z.string(),
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional()
    }),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.unknown()).optional(),
    type: z.literal('public-key')
  })
})

/**
 * Token 刷新请求
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
})

/**
 * 设备添加验证请求
 */
export const addDeviceVerifySchema = z.object({
  challengeId: z.string(),
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
      transports: z.array(z.string()).optional(),
      publicKeyAlgorithm: z.number().optional(),
      publicKey: z.string().optional(),
      authenticatorData: z.string().optional()
    }),
    authenticatorAttachment: z.string().optional(),
    clientExtensionResults: z.record(z.unknown()).optional(),
    type: z.literal('public-key')
  }),
  deviceName: z.string().max(50).optional()
})

/**
 * 用户资料更新
 */
export const updateProfileSchema = z.object({
  email: z.string().email().max(254).optional().nullable(),
  qqNumber: z
    .string()
    .regex(/^\d{5,11}$/)
    .optional()
    .nullable(),
  avatarUrl: z.string().url().max(2000).optional().nullable(),
  displayName: z.string().max(50).optional()
})

// ============================================================
// 数据同步相关 Schema
// ============================================================

/**
 * Focus 记录验证
 */
const focusRecordSchema = z
  .object({
    id: z.string().max(50),
    mode: z.enum(['focus', 'shortBreak', 'longBreak']),
    startTime: z.number().int().positive(),
    endTime: z.number().int().positive(),
    duration: z.number().int().min(0).max(7200),
    elapsed: z.number().int().min(0).max(7200),
    completionType: z.enum(['completed', 'cancelled', 'skipped', 'interrupted', 'disabled']),
    updatedAt: z.number().int().min(0).optional()
  })
  .refine((data) => data.endTime >= data.startTime, {
    message: 'endTime must be >= startTime'
  })
  .refine((data) => data.elapsed <= data.duration, {
    message: 'elapsed cannot exceed duration'
  })

/**
 * Focus 记录数组验证
 */
export const focusRecordsSchema = z.array(focusRecordSchema).max(DATA_CONFIG.MAX_FOCUS_RECORDS)

/**
 * Focus 设置验证
 */
export const focusSettingsSchema = z.object({
  focusDuration: z.number().int().min(60).max(7200),
  shortBreakDuration: z.number().int().min(0).max(3600),
  longBreakDuration: z.number().int().min(0).max(3600),
  longBreakInterval: z.number().int().min(1).max(10),
  autoStartBreaks: z.boolean(),
  autoStartFocus: z.boolean(),
  notificationEnabled: z.boolean(),
  notificationSound: z.boolean()
})

/**
 * 歌曲验证
 */
const songSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().max(200),
    artist: z.string().max(200).optional(),
    url: z.string().max(2000).optional(),
    cover: z.string().max(2000).optional()
  })
  .passthrough()

/**
 * 歌单验证
 */
const playlistSchema = z.object({
  id: z.string().max(50),
  name: z.string().max(100),
  cover: z.string().max(2000).optional().nullable(),
  order: z.number().int().min(0).max(100),
  mode: z.enum(['playlist', 'collection']),
  source: z.enum(['netease', 'tencent', 'spotify', 'local']).optional(),
  sourceId: z.string().max(50).optional(),
  songs: z.array(songSchema).max(DATA_CONFIG.MAX_SONGS_PER_PLAYLIST).optional()
})

/**
 * 歌单数据验证
 */
export const playlistsDataSchema = z.object({
  playlists: z.array(playlistSchema).max(DATA_CONFIG.MAX_PLAYLISTS),
  currentId: z.string().max(50).nullable(),
  defaultId: z.string().max(50).nullable()
})

/**
 * 用户设置验证
 */
export const userSettingsSchema = z.object({
  video: z.object({ currentIndex: z.number().int().min(0).max(100) }),
  music: z.object({ currentSongIndex: z.number().int().min(0).max(1000) })
})

/**
 * 分享卡片配置验证
 */
export const shareConfigSchema = z
  .object({})
  .passthrough()
  .refine((obj) => JSON.stringify(obj).length < 10000, {
    message: 'Config too large'
  })

/**
 * 各数据类型对应的 Schema 映射
 * @type {Object<string, z.ZodSchema>}
 */
export const dataTypeSchemas = {
  [DATA_CONFIG.TYPES.FOCUS_RECORDS]: focusRecordsSchema,
  [DATA_CONFIG.TYPES.FOCUS_SETTINGS]: focusSettingsSchema,
  [DATA_CONFIG.TYPES.PLAYLISTS]: playlistsDataSchema,
  [DATA_CONFIG.TYPES.USER_SETTINGS]: userSettingsSchema,
  [DATA_CONFIG.TYPES.SHARE_CONFIG]: shareConfigSchema
}

/**
 * 数据类型路径参数验证
 */
export const dataTypeParamSchema = z.object({
  type: z.enum([
    DATA_CONFIG.TYPES.FOCUS_RECORDS,
    DATA_CONFIG.TYPES.FOCUS_SETTINGS,
    DATA_CONFIG.TYPES.PLAYLISTS,
    DATA_CONFIG.TYPES.USER_SETTINGS,
    DATA_CONFIG.TYPES.SHARE_CONFIG
  ])
})
