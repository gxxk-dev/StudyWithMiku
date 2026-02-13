/**
 * @module workers/constants
 * @description 后端常量配置 - WebAuthn/JWT/OAuth/速率限制等
 */

/**
 * WebAuthn 配置
 * @type {Object}
 */
export const WEBAUTHN_CONFIG = {
  /** 挑战有效期 (毫秒) */
  CHALLENGE_TTL: 5 * 60 * 1000,
  /** 支持的认证器类型 (undefined 允许任何类型) */
  AUTHENTICATOR_ATTACHMENT: undefined,
  /** 用户验证要求 */
  USER_VERIFICATION: 'preferred',
  /** 驻留凭证要求 */
  RESIDENT_KEY: 'preferred',
  /** 支持的算法 (ES256, RS256) */
  SUPPORTED_ALGORITHMS: [-7, -257]
}

/**
 * JWT 配置
 * @type {Object}
 */
export const JWT_CONFIG = {
  /** Access Token 有效期 (秒) */
  ACCESS_TOKEN_TTL: 15 * 60,
  /** Refresh Token 有效期 (秒) */
  REFRESH_TOKEN_TTL: 7 * 24 * 60 * 60,
  /** JWT 算法 */
  ALGORITHM: 'HS256',
  /** Token 类型 */
  TOKEN_TYPE: {
    ACCESS: 'access',
    REFRESH: 'refresh'
  }
}

/**
 * OAuth Provider 配置
 * @type {Object}
 */
export const OAUTH_CONFIG = {
  GITHUB: {
    AUTHORIZE_URL: 'https://github.com/login/oauth/authorize',
    TOKEN_URL: 'https://github.com/login/oauth/access_token',
    USER_URL: 'https://api.github.com/user',
    SCOPE: 'read:user user:email'
  },
  GOOGLE: {
    AUTHORIZE_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN_URL: 'https://oauth2.googleapis.com/token',
    USER_URL: 'https://www.googleapis.com/oauth2/v2/userinfo',
    SCOPE: 'openid email profile'
  },
  MICROSOFT: {
    AUTHORIZE_URL: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
    TOKEN_URL: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
    USER_URL: 'https://graph.microsoft.com/v1.0/me',
    SCOPE: 'openid email profile User.Read'
  },
  LINUXDO: {
    AUTHORIZE_URL: 'https://connect.linux.do/oauth2/authorize',
    TOKEN_URL: 'https://connect.linux.do/oauth2/token',
    USER_URL: 'https://connect.linux.do/api/user',
    SCOPE: 'user'
  }
}

/**
 * 速率限制配置
 * @type {Object}
 */
export const RATE_LIMIT_CONFIG = {
  /** 认证端点限制 */
  AUTH: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 10
  },
  /** 数据同步端点限制 */
  DATA: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 30
  },
  /** 通用 API 限制 */
  GENERAL: {
    WINDOW_MS: 60 * 1000,
    MAX_REQUESTS: 100
  }
}

/**
 * 数据存储配置
 * @type {Object}
 */
export const DATA_CONFIG = {
  /** 数据类型枚举 */
  TYPES: {
    FOCUS_RECORDS: 'focus_records',
    FOCUS_SETTINGS: 'focus_settings',
    PLAYLISTS: 'playlists',
    USER_SETTINGS: 'user_settings',
    SHARE_CONFIG: 'share_config'
  },
  /** 各类型数据大小限制 (字节) */
  MAX_SIZE: {
    focus_records: 2 * 1024 * 1024,
    focus_settings: 1024,
    playlists: 200 * 1024,
    user_settings: 1024,
    share_config: 10 * 1024
  },
  /** 用户总存储配额 (字节) */
  USER_QUOTA: 5 * 1024 * 1024,
  /** Focus Records 最大条数 */
  MAX_FOCUS_RECORDS: 10000,
  /** 歌单最大数量 */
  MAX_PLAYLISTS: 50,
  /** 单歌单最大歌曲数 */
  MAX_SONGS_PER_PLAYLIST: 500
}

/**
 * 认证 Provider 枚举
 * @type {Object}
 */
export const AUTH_PROVIDER = {
  WEBAUTHN: 'webauthn',
  GITHUB: 'github',
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
  LINUXDO: 'linuxdo'
}

/**
 * 错误代码
 * @type {Object}
 */
export const ERROR_CODES = {
  // Token 相关
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  // 认证相关
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
  CHALLENGE_INVALID: 'CHALLENGE_INVALID',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  // 设备相关
  LAST_CREDENTIAL: 'LAST_CREDENTIAL',
  CREDENTIAL_EXISTS: 'CREDENTIAL_EXISTS',
  // OAuth 关联相关
  OAUTH_ALREADY_LINKED: 'OAUTH_ALREADY_LINKED',
  OAUTH_ALREADY_LINKED_SELF: 'OAUTH_ALREADY_LINKED_SELF',
  LAST_AUTH_METHOD: 'LAST_AUTH_METHOD',
  OAUTH_ACCOUNT_NOT_FOUND: 'OAUTH_ACCOUNT_NOT_FOUND',
  // 数据相关
  DATA_TOO_LARGE: 'DATA_TOO_LARGE',
  TOO_MANY_ITEMS: 'TOO_MANY_ITEMS',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_JSON: 'INVALID_JSON',
  NESTED_TOO_DEEP: 'NESTED_TOO_DEEP',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  // 通用
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
}

/**
 * 用户名验证正则
 * 允许：字母、数字、下划线、连字符、中日韩文字
 * @type {RegExp}
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

/**
 * Token 黑名单清理概率 (每次登录时)
 * @type {number}
 */
export const BLACKLIST_CLEANUP_PROBABILITY = 0.1
