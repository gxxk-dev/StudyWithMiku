/**
 * @module shared/cbor/mappings
 * @description CBOR 键名和枚举值映射表
 *
 * 映射规则：
 * - 键名映射：原始字符串键 → 数字
 * - 枚举映射：原始枚举值 → 数字
 * - share_config 不压缩，保持原始结构
 */

/** CBOR 协议版本 */
export const CBOR_PROTOCOL_VERSION = 1

// ============================================================================
// Focus Records 映射（最大数据类型，约 2MB）
// ============================================================================

/** Focus Record 字段映射 */
export const FOCUS_RECORD_KEYS = {
  id: 1,
  mode: 2,
  startTime: 3,
  endTime: 4,
  duration: 5,
  elapsed: 6,
  completionType: 7
}

/** FocusMode 枚举映射 */
export const FOCUS_MODE_MAP = {
  focus: 1,
  shortBreak: 2,
  longBreak: 3
}

/** CompletionType 枚举映射 */
export const COMPLETION_TYPE_MAP = {
  completed: 1,
  cancelled: 2,
  skipped: 3,
  interrupted: 4,
  disabled: 5
}

// ============================================================================
// Focus Settings 映射
// ============================================================================

/** Focus Settings 字段映射 */
export const FOCUS_SETTINGS_KEYS = {
  focusDuration: 1,
  shortBreakDuration: 2,
  longBreakDuration: 3,
  longBreakInterval: 4,
  autoStartBreaks: 5,
  autoStartFocus: 6,
  notificationEnabled: 7,
  notificationSound: 8
}

// ============================================================================
// Playlists 映射
// ============================================================================

/** Playlist 顶层字段映射 */
export const PLAYLIST_ROOT_KEYS = {
  playlists: 1,
  currentId: 2,
  defaultId: 3
}

/** Playlist 项字段映射 */
export const PLAYLIST_ITEM_KEYS = {
  id: 1,
  name: 2,
  cover: 3,
  order: 4,
  mode: 5,
  source: 6,
  sourceId: 7,
  songs: 8
}

/** Song 字段映射 */
export const SONG_KEYS = {
  id: 1,
  name: 2,
  artist: 3,
  url: 4,
  cover: 5,
  lrc: 6
}

/** PlaylistMode 枚举映射 */
export const PLAYLIST_MODE_MAP = {
  playlist: 1,
  collection: 2
}

/** PlaylistSource 枚举映射 */
export const PLAYLIST_SOURCE_MAP = {
  netease: 1,
  tencent: 2,
  spotify: 3,
  local: 4
}

// ============================================================================
// User Settings 映射
// ============================================================================

/** User Settings 字段映射 */
export const USER_SETTINGS_KEYS = {
  video: 1,
  music: 2
}

/** Video/Music 子对象字段映射 */
export const MEDIA_SETTINGS_KEYS = {
  currentIndex: 1,
  currentSongIndex: 2
}

// ============================================================================
// 反向映射（数字 → 字符串，用于解码）
// ============================================================================

/** 创建反向映射 */
const createReverseMap = (map) => {
  const reverse = {}
  for (const [key, value] of Object.entries(map)) {
    reverse[value] = key
  }
  return reverse
}

// Focus Records 反向映射
export const FOCUS_RECORD_KEYS_REV = createReverseMap(FOCUS_RECORD_KEYS)
export const FOCUS_MODE_MAP_REV = createReverseMap(FOCUS_MODE_MAP)
export const COMPLETION_TYPE_MAP_REV = createReverseMap(COMPLETION_TYPE_MAP)

// Focus Settings 反向映射
export const FOCUS_SETTINGS_KEYS_REV = createReverseMap(FOCUS_SETTINGS_KEYS)

// Playlists 反向映射
export const PLAYLIST_ROOT_KEYS_REV = createReverseMap(PLAYLIST_ROOT_KEYS)
export const PLAYLIST_ITEM_KEYS_REV = createReverseMap(PLAYLIST_ITEM_KEYS)
export const SONG_KEYS_REV = createReverseMap(SONG_KEYS)
export const PLAYLIST_MODE_MAP_REV = createReverseMap(PLAYLIST_MODE_MAP)
export const PLAYLIST_SOURCE_MAP_REV = createReverseMap(PLAYLIST_SOURCE_MAP)

// User Settings 反向映射
export const USER_SETTINGS_KEYS_REV = createReverseMap(USER_SETTINGS_KEYS)
export const MEDIA_SETTINGS_KEYS_REV = createReverseMap(MEDIA_SETTINGS_KEYS)

// ============================================================================
// 数据类型标识
// ============================================================================

/** 支持 CBOR 压缩的数据类型 */
export const CBOR_DATA_TYPES = {
  FOCUS_RECORDS: 'focus_records',
  FOCUS_SETTINGS: 'focus_settings',
  PLAYLISTS: 'playlists',
  USER_SETTINGS: 'user_settings'
}

/** 不压缩的数据类型（保持原始结构） */
export const RAW_DATA_TYPES = {
  SHARE_CONFIG: 'share_config'
}
