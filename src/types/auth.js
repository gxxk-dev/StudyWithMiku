/**
 * @fileoverview 认证系统类型定义
 * @module types/auth
 */

/**
 * 用户信息
 * @typedef {Object} User
 * @property {string} id - 用户唯一标识
 * @property {string} username - 用户名
 * @property {string} displayName - 显示名称
 * @property {string} avatarUrl - 头像 URL
 * @property {string} authProvider - 认证提供商 (webauthn|github|google|microsoft)
 * @property {number} createdAt - 创建时间戳
 * @property {number} lastLoginAt - 最后登录时间戳
 */

/**
 * 认证令牌
 * @typedef {Object} AuthTokens
 * @property {string} accessToken - 访问令牌
 * @property {string} refreshToken - 刷新令牌
 * @property {number} expiresAt - 过期时间戳 (毫秒)
 * @property {string} tokenType - 令牌类型 (通常为 'Bearer')
 */

/**
 * WebAuthn 注册选项
 * @typedef {Object} WebAuthnRegisterOptions
 * @property {Object} publicKey - 公钥凭据创建选项
 * @property {string} challenge - 挑战字符串 (Base64URL)
 * @property {Object} rp - 依赖方信息
 * @property {Object} user - 用户信息
 * @property {Array} pubKeyCredParams - 支持的公钥算法
 * @property {number} timeout - 超时时间 (毫秒)
 * @property {string} attestation - 证明偏好
 * @property {Object} authenticatorSelection - 认证器选择标准
 */

/**
 * WebAuthn 登录选项
 * @typedef {Object} WebAuthnLoginOptions
 * @property {Object} publicKey - 公钥凭据请求选项
 * @property {string} challenge - 挑战字符串 (Base64URL)
 * @property {number} timeout - 超时时间 (毫秒)
 * @property {string} rpId - 依赖方标识符
 * @property {Array} allowCredentials - 允许的凭据列表
 * @property {string} userVerification - 用户验证要求
 */

/**
 * WebAuthn 凭据
 * @typedef {Object} WebAuthnCredential
 * @property {string} id - 凭据 ID (Base64URL)
 * @property {string} rawId - 原始凭据 ID (Base64URL)
 * @property {string} type - 凭据类型 (通常为 'public-key')
 * @property {Object} response - 认证器响应
 * @property {string} response.clientDataJSON - 客户端数据 JSON (Base64URL)
 * @property {string} response.attestationObject - 证明对象 (Base64URL, 仅注册时)
 * @property {string} response.authenticatorData - 认证器数据 (Base64URL, 仅登录时)
 * @property {string} response.signature - 签名 (Base64URL, 仅登录时)
 */

/**
 * 设备信息
 * @typedef {Object} Device
 * @property {string} credentialId - 凭据 ID
 * @property {string} name - 设备名称
 * @property {string} type - 设备类型 (platform|cross-platform)
 * @property {number} createdAt - 创建时间戳
 * @property {number} lastUsedAt - 最后使用时间戳
 * @property {boolean} isCurrentDevice - 是否为当前设备
 */

/**
 * 同步状态
 * @typedef {Object} SyncStatus
 * @property {boolean} synced - 是否已同步
 * @property {number} version - 数据版本号
 * @property {number} lastSyncTime - 最后同步时间戳
 * @property {string|null} error - 错误信息
 * @property {boolean} hasLocalChanges - 是否有本地未同步变更
 */

/**
 * 同步变更记录
 * @typedef {Object} SyncChange
 * @property {string} id - 变更 ID
 * @property {string} dataType - 数据类型
 * @property {any} data - 变更数据
 * @property {number} version - 数据版本号
 * @property {number} timestamp - 变更时间戳
 * @property {string} operation - 操作类型 (create|update|delete)
 */

/**
 * 数据同步响应
 * @typedef {Object} SyncResponse
 * @property {boolean} success - 是否成功
 * @property {any} data - 同步后的数据
 * @property {number} version - 新版本号
 * @property {number} timestamp - 服务器时间戳
 * @property {Object|null} conflict - 冲突信息
 * @property {any} conflict.localData - 本地数据
 * @property {any} conflict.serverData - 服务器数据
 * @property {number} conflict.localVersion - 本地版本
 * @property {number} conflict.serverVersion - 服务器版本
 */

/**
 * 批量同步请求
 * @typedef {Object} BatchSyncRequest
 * @property {Array<SyncChange>} changes - 变更列表
 * @property {Object<string, number>} versions - 各数据类型的本地版本
 */

/**
 * 批量同步响应
 * @typedef {Object} BatchSyncResponse
 * @property {boolean} success - 是否成功
 * @property {Object<string, SyncResponse>} results - 各数据类型的同步结果
 * @property {Array<string>} conflicts - 有冲突的数据类型列表
 */

/**
 * OAuth 提供商配置
 * @typedef {Object} OAuthProvider
 * @property {string} name - 提供商名称
 * @property {string} displayName - 显示名称
 * @property {string} icon - 图标名称
 * @property {string} color - 主题色
 * @property {string} authUrl - 认证 URL
 */

/**
 * 认证错误
 * @typedef {Object} AuthError
 * @property {string} code - 错误代码
 * @property {string} message - 错误消息
 * @property {string} type - 错误类型
 * @property {any} details - 错误详情
 */

/**
 * 冲突解决策略
 * @typedef {'merge'|'local'|'server'|'manual'} ConflictResolutionStrategy
 */

/**
 * 冲突解决结果
 * @typedef {Object} ConflictResolution
 * @property {ConflictResolutionStrategy} strategy - 解决策略
 * @property {any} resolvedData - 解决后的数据
 * @property {boolean} userConfirmed - 是否经用户确认
 */

export {}
