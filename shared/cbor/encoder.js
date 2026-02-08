/**
 * @module shared/cbor/encoder
 * @description CBOR 压缩编码器 - 将原始数据压缩为数字键格式
 */

import {
  CBOR_DATA_TYPES,
  RAW_DATA_TYPES,
  FOCUS_RECORD_KEYS,
  FOCUS_MODE_MAP,
  COMPLETION_TYPE_MAP,
  FOCUS_SETTINGS_KEYS,
  PLAYLIST_ROOT_KEYS,
  PLAYLIST_ITEM_KEYS,
  SONG_KEYS,
  PLAYLIST_MODE_MAP,
  PLAYLIST_SOURCE_MAP,
  USER_SETTINGS_KEYS,
  MEDIA_SETTINGS_KEYS
} from './mappings.js'

/**
 * 压缩对象键名
 * @param {Object} obj - 原始对象
 * @param {Object} keyMap - 键名映射表
 * @returns {Object} 压缩后的对象
 */
const compressKeys = (obj, keyMap) => {
  if (!obj || typeof obj !== 'object') return obj
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = keyMap[key] ?? key
    result[mappedKey] = value
  }
  return result
}

/**
 * 压缩单条 Focus Record
 * @param {Object} record - 原始记录
 * @returns {Object} 压缩后的记录
 */
const compressFocusRecord = (record) => {
  if (!record) return record
  const compressed = compressKeys(record, FOCUS_RECORD_KEYS)
  // 压缩枚举值
  if (compressed[FOCUS_RECORD_KEYS.mode]) {
    compressed[FOCUS_RECORD_KEYS.mode] =
      FOCUS_MODE_MAP[compressed[FOCUS_RECORD_KEYS.mode]] ?? compressed[FOCUS_RECORD_KEYS.mode]
  }
  if (compressed[FOCUS_RECORD_KEYS.completionType]) {
    compressed[FOCUS_RECORD_KEYS.completionType] =
      COMPLETION_TYPE_MAP[compressed[FOCUS_RECORD_KEYS.completionType]] ??
      compressed[FOCUS_RECORD_KEYS.completionType]
  }
  return compressed
}

/**
 * 压缩 Focus Records 数组
 * @param {Array} records - 原始记录数组
 * @returns {Array} 压缩后的数组
 */
export const compressFocusRecords = (records) => {
  if (!Array.isArray(records)) return records
  return records.map(compressFocusRecord)
}

/**
 * 压缩 Focus Settings
 * @param {Object} settings - 原始设置
 * @returns {Object} 压缩后的设置
 */
export const compressFocusSettings = (settings) => {
  if (!settings) return settings
  return compressKeys(settings, FOCUS_SETTINGS_KEYS)
}

/**
 * 压缩单首歌曲
 * @param {Object} song - 原始歌曲
 * @returns {Object} 压缩后的歌曲
 */
const compressSong = (song) => {
  if (!song) return song
  return compressKeys(song, SONG_KEYS)
}

/**
 * 压缩单个歌单项
 * @param {Object} playlist - 原始歌单
 * @returns {Object} 压缩后的歌单
 */
const compressPlaylistItem = (playlist) => {
  if (!playlist) return playlist
  const compressed = compressKeys(playlist, PLAYLIST_ITEM_KEYS)
  // 压缩枚举值
  if (compressed[PLAYLIST_ITEM_KEYS.mode]) {
    compressed[PLAYLIST_ITEM_KEYS.mode] =
      PLAYLIST_MODE_MAP[compressed[PLAYLIST_ITEM_KEYS.mode]] ?? compressed[PLAYLIST_ITEM_KEYS.mode]
  }
  if (compressed[PLAYLIST_ITEM_KEYS.source]) {
    compressed[PLAYLIST_ITEM_KEYS.source] =
      PLAYLIST_SOURCE_MAP[compressed[PLAYLIST_ITEM_KEYS.source]] ??
      compressed[PLAYLIST_ITEM_KEYS.source]
  }
  // 压缩歌曲数组
  if (Array.isArray(compressed[PLAYLIST_ITEM_KEYS.songs])) {
    compressed[PLAYLIST_ITEM_KEYS.songs] = compressed[PLAYLIST_ITEM_KEYS.songs].map(compressSong)
  }
  return compressed
}

/**
 * 压缩 Playlists 数据
 * @param {Object} data - 原始歌单数据
 * @returns {Object} 压缩后的数据
 */
export const compressPlaylists = (data) => {
  if (!data) return data
  const compressed = compressKeys(data, PLAYLIST_ROOT_KEYS)
  // 压缩歌单数组
  if (Array.isArray(compressed[PLAYLIST_ROOT_KEYS.playlists])) {
    compressed[PLAYLIST_ROOT_KEYS.playlists] =
      compressed[PLAYLIST_ROOT_KEYS.playlists].map(compressPlaylistItem)
  }
  return compressed
}

/**
 * 压缩 User Settings
 * @param {Object} settings - 原始设置
 * @returns {Object} 压缩后的设置
 */
export const compressUserSettings = (settings) => {
  if (!settings) return settings
  const compressed = compressKeys(settings, USER_SETTINGS_KEYS)
  // 压缩子对象
  if (compressed[USER_SETTINGS_KEYS.video]) {
    compressed[USER_SETTINGS_KEYS.video] = compressKeys(
      compressed[USER_SETTINGS_KEYS.video],
      MEDIA_SETTINGS_KEYS
    )
  }
  if (compressed[USER_SETTINGS_KEYS.music]) {
    compressed[USER_SETTINGS_KEYS.music] = compressKeys(
      compressed[USER_SETTINGS_KEYS.music],
      MEDIA_SETTINGS_KEYS
    )
  }
  return compressed
}

/**
 * 根据数据类型压缩数据
 * @param {string} dataType - 数据类型
 * @param {*} data - 原始数据
 * @returns {*} 压缩后的数据
 */
export const compressData = (dataType, data) => {
  // share_config 不压缩
  if (dataType === RAW_DATA_TYPES.SHARE_CONFIG) {
    return data
  }

  switch (dataType) {
    case CBOR_DATA_TYPES.FOCUS_RECORDS:
      return compressFocusRecords(data)
    case CBOR_DATA_TYPES.FOCUS_SETTINGS:
      return compressFocusSettings(data)
    case CBOR_DATA_TYPES.PLAYLISTS:
      return compressPlaylists(data)
    case CBOR_DATA_TYPES.USER_SETTINGS:
      return compressUserSettings(data)
    default:
      return data
  }
}
