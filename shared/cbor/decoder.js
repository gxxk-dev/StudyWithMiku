/**
 * @module shared/cbor/decoder
 * @description CBOR 解压解码器 - 将数字键格式还原为原始数据
 */

import {
  CBOR_DATA_TYPES,
  RAW_DATA_TYPES,
  FOCUS_RECORD_KEYS_REV,
  FOCUS_MODE_MAP_REV,
  COMPLETION_TYPE_MAP_REV,
  FOCUS_SETTINGS_KEYS_REV,
  PLAYLIST_ROOT_KEYS_REV,
  PLAYLIST_ITEM_KEYS_REV,
  SONG_KEYS_REV,
  PLAYLIST_MODE_MAP_REV,
  PLAYLIST_SOURCE_MAP_REV,
  USER_SETTINGS_KEYS_REV,
  MEDIA_SETTINGS_KEYS_REV,
  FOCUS_RECORD_KEYS,
  PLAYLIST_ROOT_KEYS,
  PLAYLIST_ITEM_KEYS,
  USER_SETTINGS_KEYS
} from './mappings.js'

/**
 * 解压对象键名
 * @param {Object} obj - 压缩对象
 * @param {Object} keyMapRev - 反向键名映射表
 * @returns {Object} 解压后的对象
 */
const decompressKeys = (obj, keyMapRev) => {
  if (!obj || typeof obj !== 'object') return obj
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = keyMapRev[key] ?? key
    result[mappedKey] = value
  }
  return result
}

/**
 * 解压单条 Focus Record
 * @param {Object} record - 压缩记录
 * @returns {Object} 解压后的记录
 */
const decompressFocusRecord = (record) => {
  if (!record) return record
  // 先解压枚举值
  if (record[FOCUS_RECORD_KEYS.mode]) {
    record[FOCUS_RECORD_KEYS.mode] =
      FOCUS_MODE_MAP_REV[record[FOCUS_RECORD_KEYS.mode]] ?? record[FOCUS_RECORD_KEYS.mode]
  }
  if (record[FOCUS_RECORD_KEYS.completionType]) {
    record[FOCUS_RECORD_KEYS.completionType] =
      COMPLETION_TYPE_MAP_REV[record[FOCUS_RECORD_KEYS.completionType]] ??
      record[FOCUS_RECORD_KEYS.completionType]
  }
  return decompressKeys(record, FOCUS_RECORD_KEYS_REV)
}

/**
 * 解压 Focus Records 数组
 * @param {Array} records - 压缩记录数组
 * @returns {Array} 解压后的数组
 */
export const decompressFocusRecords = (records) => {
  if (!Array.isArray(records)) return records
  return records.map(decompressFocusRecord)
}

/**
 * 解压 Focus Settings
 * @param {Object} settings - 压缩设置
 * @returns {Object} 解压后的设置
 */
export const decompressFocusSettings = (settings) => {
  if (!settings) return settings
  return decompressKeys(settings, FOCUS_SETTINGS_KEYS_REV)
}

/**
 * 解压单首歌曲
 * @param {Object} song - 压缩歌曲
 * @returns {Object} 解压后的歌曲
 */
const decompressSong = (song) => {
  if (!song) return song
  return decompressKeys(song, SONG_KEYS_REV)
}

/**
 * 解压单个歌单项
 * @param {Object} playlist - 压缩歌单
 * @returns {Object} 解压后的歌单
 */
const decompressPlaylistItem = (playlist) => {
  if (!playlist) return playlist
  // 先解压枚举值
  if (playlist[PLAYLIST_ITEM_KEYS.mode]) {
    playlist[PLAYLIST_ITEM_KEYS.mode] =
      PLAYLIST_MODE_MAP_REV[playlist[PLAYLIST_ITEM_KEYS.mode]] ?? playlist[PLAYLIST_ITEM_KEYS.mode]
  }
  if (playlist[PLAYLIST_ITEM_KEYS.source]) {
    playlist[PLAYLIST_ITEM_KEYS.source] =
      PLAYLIST_SOURCE_MAP_REV[playlist[PLAYLIST_ITEM_KEYS.source]] ??
      playlist[PLAYLIST_ITEM_KEYS.source]
  }
  // 解压歌曲数组
  if (Array.isArray(playlist[PLAYLIST_ITEM_KEYS.songs])) {
    playlist[PLAYLIST_ITEM_KEYS.songs] = playlist[PLAYLIST_ITEM_KEYS.songs].map(decompressSong)
  }
  const decompressed = decompressKeys(playlist, PLAYLIST_ITEM_KEYS_REV)
  return decompressed
}

/**
 * 解压 Playlists 数据
 * @param {Object} data - 压缩歌单数据
 * @returns {Object} 解压后的数据
 */
export const decompressPlaylists = (data) => {
  if (!data) return data
  // 解压歌单数组
  if (Array.isArray(data[PLAYLIST_ROOT_KEYS.playlists])) {
    data[PLAYLIST_ROOT_KEYS.playlists] =
      data[PLAYLIST_ROOT_KEYS.playlists].map(decompressPlaylistItem)
  }
  return decompressKeys(data, PLAYLIST_ROOT_KEYS_REV)
}

/**
 * 解压 User Settings
 * @param {Object} settings - 压缩设置
 * @returns {Object} 解压后的设置
 */
export const decompressUserSettings = (settings) => {
  if (!settings) return settings
  // 解压子对象
  if (settings[USER_SETTINGS_KEYS.video]) {
    settings[USER_SETTINGS_KEYS.video] = decompressKeys(
      settings[USER_SETTINGS_KEYS.video],
      MEDIA_SETTINGS_KEYS_REV
    )
  }
  if (settings[USER_SETTINGS_KEYS.music]) {
    settings[USER_SETTINGS_KEYS.music] = decompressKeys(
      settings[USER_SETTINGS_KEYS.music],
      MEDIA_SETTINGS_KEYS_REV
    )
  }
  return decompressKeys(settings, USER_SETTINGS_KEYS_REV)
}

/**
 * 根据数据类型解压数据
 * @param {string} dataType - 数据类型
 * @param {*} data - 压缩数据
 * @returns {*} 解压后的数据
 */
export const decompressData = (dataType, data) => {
  // share_config 不压缩
  if (dataType === RAW_DATA_TYPES.SHARE_CONFIG) {
    return data
  }

  switch (dataType) {
    case CBOR_DATA_TYPES.FOCUS_RECORDS:
      return decompressFocusRecords(data)
    case CBOR_DATA_TYPES.FOCUS_SETTINGS:
      return decompressFocusSettings(data)
    case CBOR_DATA_TYPES.PLAYLISTS:
      return decompressPlaylists(data)
    case CBOR_DATA_TYPES.USER_SETTINGS:
      return decompressUserSettings(data)
    default:
      return data
  }
}
