/**
 * @module shared/cbor
 * @description CBOR 编解码模块导出入口
 */

export {
  CBOR_PROTOCOL_VERSION,
  CBOR_DATA_TYPES,
  RAW_DATA_TYPES,
  // Focus Records 映射
  FOCUS_RECORD_KEYS,
  FOCUS_MODE_MAP,
  COMPLETION_TYPE_MAP,
  FOCUS_RECORD_KEYS_REV,
  FOCUS_MODE_MAP_REV,
  COMPLETION_TYPE_MAP_REV,
  // Focus Settings 映射
  FOCUS_SETTINGS_KEYS,
  FOCUS_SETTINGS_KEYS_REV,
  // Playlists 映射
  PLAYLIST_ROOT_KEYS,
  PLAYLIST_ITEM_KEYS,
  SONG_KEYS,
  PLAYLIST_MODE_MAP,
  PLAYLIST_SOURCE_MAP,
  PLAYLIST_ROOT_KEYS_REV,
  PLAYLIST_ITEM_KEYS_REV,
  SONG_KEYS_REV,
  PLAYLIST_MODE_MAP_REV,
  PLAYLIST_SOURCE_MAP_REV,
  // User Settings 映射
  USER_SETTINGS_KEYS,
  MEDIA_SETTINGS_KEYS,
  USER_SETTINGS_KEYS_REV,
  MEDIA_SETTINGS_KEYS_REV
} from './mappings.js'

export {
  compressData,
  compressFocusRecords,
  compressFocusSettings,
  compressPlaylists,
  compressUserSettings
} from './encoder.js'

export {
  decompressData,
  decompressFocusRecords,
  decompressFocusSettings,
  decompressPlaylists,
  decompressUserSettings
} from './decoder.js'
