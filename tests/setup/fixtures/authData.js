/**
 * Workers 测试用 fixtures - 用户和认证数据
 */

/**
 * 示例用户数据（数据库存储格式 - snake_case）
 * Mock D1 会自动转换为 camelCase 返回
 */
export const sampleUsers = [
  {
    id: 'user-001',
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
    email: null,
    qq_number: null
  },
  {
    id: 'user-002',
    username: 'github_user',
    display_name: 'GitHub User',
    avatar_url: 'https://github.com/avatar.png',
    email: 'github@example.com',
    qq_number: null
  },
  {
    id: 'user-003',
    username: 'google_user',
    display_name: 'Google User',
    avatar_url: 'https://google.com/avatar.png',
    email: 'google@example.com',
    qq_number: null
  }
]

/**
 * 示例用户数据（camelCase 格式，用于 formatUserForResponse 测试）
 */
export const sampleUsersCamelCase = [
  {
    id: 'user-001',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    email: null,
    qqNumber: null
  },
  {
    id: 'user-002',
    username: 'github_user',
    displayName: 'GitHub User',
    avatarUrl: 'https://github.com/avatar.png',
    email: 'github@example.com',
    qqNumber: null
  },
  {
    id: 'user-003',
    username: 'google_user',
    displayName: 'Google User',
    avatarUrl: 'https://google.com/avatar.png',
    email: 'google@example.com',
    qqNumber: null
  }
]

/**
 * 示例 WebAuthn 凭证数据
 */
export const sampleCredentials = [
  {
    id: 'credential-001',
    user_id: 'user-001',
    public_key: new Uint8Array([1, 2, 3, 4, 5]),
    counter: 0,
    transports: '["internal"]',
    device_type: 'platform',
    device_name: 'Built-in Authenticator',
    backed_up: 0
  },
  {
    id: 'credential-002',
    user_id: 'user-001',
    public_key: new Uint8Array([6, 7, 8, 9, 10]),
    counter: 5,
    transports: '["usb"]',
    device_type: 'cross-platform',
    device_name: 'USB Security Key',
    backed_up: 1
  },
  {
    id: 'credential-003',
    user_id: 'user-002',
    public_key: new Uint8Array([11, 12, 13, 14, 15]),
    counter: 0,
    transports: '["usb"]',
    device_type: 'cross-platform',
    device_name: 'USB Security Key',
    backed_up: 0
  }
]

/**
 * 示例 Token 黑名单数据
 */
export const sampleBlacklist = [
  {
    jti: 'blacklisted-token-001',
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
  },
  {
    jti: 'expired-blacklist-001',
    expires_at: Math.floor(Date.now() / 1000) - 3600 // 已过期
  }
]

/**
 * 示例用户数据
 * 注意：data_format 字段标识数据格式，'json' 表示 JSON 字符串
 */
export const sampleUserData = [
  {
    user_id: 'user-001',
    data_type: 'focus_records',
    data: JSON.stringify([
      {
        id: 'focus-1',
        mode: 'focus',
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 2100000,
        duration: 1500,
        elapsed: 1500,
        completionType: 'completed'
      }
    ]),
    data_format: 'json',
    version: 1
  },
  {
    user_id: 'user-001',
    data_type: 'focus_settings',
    data: JSON.stringify({
      focusDuration: 1500,
      shortBreakDuration: 300,
      longBreakDuration: 900,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      notificationEnabled: true,
      notificationSound: true
    }),
    data_format: 'json',
    version: 2
  }
]

/**
 * 创建用户数据
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createUser = (overrides = {}) => ({
  id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  username: `user_${Math.random().toString(36).slice(2, 10)}`,
  display_name: 'Test User',
  avatar_url: null,
  email: null,
  qq_number: null,
  ...overrides
})

/**
 * 创建凭证数据
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createCredential = (overrides = {}) => ({
  id: `cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  user_id: 'user-001',
  public_key: new Uint8Array([1, 2, 3, 4, 5]),
  counter: 0,
  transports: '["internal"]',
  device_type: 'platform',
  device_name: 'Test Device',
  backed_up: 0,
  ...overrides
})

/**
 * 创建 OAuth 用户信息（模拟 Provider 返回）
 * @param {string} provider - OAuth provider
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createOAuthUser = (provider, overrides = {}) => {
  const defaults = {
    github: {
      provider: 'github',
      providerId: `gh-${Date.now()}`,
      username: 'github_test_user',
      displayName: 'GitHub Test User',
      avatarUrl: 'https://github.com/avatar.png',
      email: 'test@github.com'
    },
    google: {
      provider: 'google',
      providerId: `google-${Date.now()}`,
      username: 'google_test_user',
      displayName: 'Google Test User',
      avatarUrl: 'https://google.com/avatar.png',
      email: 'test@gmail.com'
    },
    microsoft: {
      provider: 'microsoft',
      providerId: `ms-${Date.now()}`,
      username: 'ms_test_user',
      displayName: 'Microsoft Test User',
      avatarUrl: null,
      email: 'test@outlook.com'
    }
  }

  return { ...defaults[provider], ...overrides }
}

/**
 * 创建 Focus 记录
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createFocusRecordData = (overrides = {}) => ({
  id: `focus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  mode: 'focus',
  startTime: Date.now() - 1500000,
  endTime: Date.now(),
  duration: 1500,
  elapsed: 1500,
  completionType: 'completed',
  ...overrides
})

/**
 * 创建 Focus 设置
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createFocusSettingsData = (overrides = {}) => ({
  focusDuration: 1500,
  shortBreakDuration: 300,
  longBreakDuration: 900,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  notificationEnabled: true,
  notificationSound: true,
  ...overrides
})

/**
 * 创建歌单数据
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createPlaylistsData = (overrides = {}) => ({
  playlists: [
    {
      id: 'playlist-1',
      name: 'My Playlist',
      cover: null,
      order: 0,
      mode: 'playlist',
      source: 'netease',
      sourceId: '12345678'
    }
  ],
  currentId: 'playlist-1',
  defaultId: 'playlist-1',
  ...overrides
})

/**
 * 创建用户设置数据
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createUserSettingsData = (overrides = {}) => ({
  video: { currentIndex: 0 },
  music: { currentSongIndex: 0 },
  ...overrides
})

/**
 * 创建分享卡片配置数据
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object}
 */
export const createShareConfigData = (overrides = {}) => ({
  theme: 'default',
  showStats: true,
  showStreak: true,
  ...overrides
})
