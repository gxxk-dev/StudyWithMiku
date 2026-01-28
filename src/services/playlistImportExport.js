/**
 * 歌单导入/导出服务
 * 支持 JSON 格式的歌单数据导入导出
 */

import { PLAYLIST_CONFIG } from '../config/constants.js'
import { ErrorTypes } from '../types/playlist.js'

// ============ 导出 ============

/**
 * 导出歌单数据
 * @param {import('../types/playlist.js').Playlist[]} playlists - 要导出的歌单
 * @param {Object} [options]
 * @param {boolean} [options.includeLocalSongs=false] - 是否包含本地歌曲元数据（不含音频数据）
 * @returns {{success: boolean, data?: import('../types/playlist.js').ExportData, error?: string}}
 */
export const exportPlaylists = (playlists, options = {}) => {
  const { includeLocalSongs = false } = options

  try {
    // 处理歌单数据
    const processedPlaylists = playlists.map((playlist) => {
      if (playlist.mode === 'playlist') {
        // playlist 模式直接导出
        return { ...playlist }
      }

      // collection 模式需要处理歌曲
      const songs = includeLocalSongs
        ? playlist.songs
        : playlist.songs.filter((song) => song.type === 'online')

      return {
        ...playlist,
        songs
      }
    })

    /** @type {import('../types/playlist.js').ExportData} */
    const exportData = {
      version: PLAYLIST_CONFIG.EXPORT_VERSION,
      exportedAt: Date.now(),
      playlists: processedPlaylists
    }

    return { success: true, data: exportData }
  } catch (err) {
    console.error('[Export] 导出失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 将歌单导出为 JSON 文件并下载
 * @param {import('../types/playlist.js').Playlist[]} playlists - 要导出的歌单
 * @param {string} [filename] - 文件名，默认使用时间戳
 * @param {Object} [options] - 导出选项
 * @returns {{success: boolean, error?: string}}
 */
export const downloadPlaylistsAsFile = (playlists, filename, options = {}) => {
  const result = exportPlaylists(playlists, options)

  if (!result.success) {
    return result
  }

  try {
    const json = JSON.stringify(result.data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const defaultFilename = `swm-playlists-${new Date().toISOString().slice(0, 10)}.json`
    const link = document.createElement('a')
    link.href = url
    link.download = filename || defaultFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    return { success: true }
  } catch (err) {
    console.error('[Export] 下载失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

// ============ 导入 ============

/**
 * 验证导入数据的基本结构
 * @param {any} data
 * @returns {boolean}
 */
const isValidExportData = (data) => {
  if (!data || typeof data !== 'object') return false
  if (typeof data.version !== 'number') return false
  if (!Array.isArray(data.playlists)) return false
  return true
}

/**
 * 验证歌单数据结构
 * @param {any} playlist
 * @returns {boolean}
 */
const isValidPlaylist = (playlist) => {
  if (!playlist || typeof playlist !== 'object') return false
  if (typeof playlist.name !== 'string') return false
  if (!['playlist', 'collection'].includes(playlist.mode)) return false

  if (playlist.mode === 'playlist') {
    if (typeof playlist.source !== 'string') return false
    if (typeof playlist.sourceId !== 'string') return false
  } else if (playlist.mode === 'collection') {
    if (!Array.isArray(playlist.songs)) return false
  }

  return true
}

/**
 * 解析导入的 JSON 数据
 * @param {string} json - JSON 字符串
 * @returns {{success: boolean, data?: import('../types/playlist.js').ExportData, error?: string}}
 */
export const parseImportJSON = (json) => {
  try {
    const data = JSON.parse(json)

    if (!isValidExportData(data)) {
      return { success: false, error: ErrorTypes.INVALID_DATA }
    }

    // 验证版本
    if (data.version > PLAYLIST_CONFIG.EXPORT_VERSION) {
      return { success: false, error: ErrorTypes.IMPORT_VERSION_MISMATCH }
    }

    // 验证每个歌单
    for (const playlist of data.playlists) {
      if (!isValidPlaylist(playlist)) {
        return { success: false, error: ErrorTypes.INVALID_DATA }
      }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[Import] JSON 解析失败:', err)
    return { success: false, error: ErrorTypes.PARSE_ERROR }
  }
}

/**
 * 从文件导入歌单
 * @param {File} file - JSON 文件
 * @returns {Promise<{success: boolean, data?: import('../types/playlist.js').ExportData, error?: string}>}
 */
export const importFromFile = async (file) => {
  try {
    const text = await file.text()
    return parseImportJSON(text)
  } catch (err) {
    console.error('[Import] 读取文件失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

// ============ 合并 ============

/**
 * 生成新的歌单 ID
 * @returns {string}
 */
const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 检查歌单是否重复
 * 通过 mode + source + sourceId（playlist模式）或 name（collection模式）判断
 * @param {import('../types/playlist.js').Playlist} existing
 * @param {import('../types/playlist.js').Playlist} imported
 * @returns {boolean}
 */
const isDuplicatePlaylist = (existing, imported) => {
  if (existing.mode !== imported.mode) return false

  if (existing.mode === 'playlist' && imported.mode === 'playlist') {
    return existing.source === imported.source && existing.sourceId === imported.sourceId
  }

  // collection 模式通过名称判断
  return existing.name === imported.name
}

/**
 * 合并导入的歌单到现有歌单列表
 * @param {import('../types/playlist.js').Playlist[]} existing - 现有歌单
 * @param {import('../types/playlist.js').Playlist[]} imported - 导入的歌单
 * @param {import('../types/playlist.js').ImportOptions} [options]
 * @returns {{success: boolean, playlists?: import('../types/playlist.js').Playlist[], stats?: import('../types/playlist.js').MergeStats}}
 */
export const mergePlaylists = (existing, imported, options = {}) => {
  const { mode = 'merge', skipDuplicates = true } = options

  /** @type {import('../types/playlist.js').MergeStats} */
  const stats = { added: 0, skipped: 0, replaced: 0 }

  if (mode === 'replace') {
    // 替换模式：直接使用导入的歌单
    const processedPlaylists = imported.map((playlist, index) => ({
      ...playlist,
      id: generateId(),
      order: index,
      createdAt: playlist.createdAt || Date.now(),
      updatedAt: Date.now()
    }))

    stats.replaced = existing.length
    stats.added = imported.length

    return { success: true, playlists: processedPlaylists, stats }
  }

  // 合并模式
  const result = [...existing]
  const maxOrder = result.reduce((max, p) => Math.max(max, p.order), -1)
  let nextOrder = maxOrder + 1

  for (const importedPlaylist of imported) {
    // 检查是否重复
    const duplicate = skipDuplicates
      ? result.find((p) => isDuplicatePlaylist(p, importedPlaylist))
      : null

    if (duplicate) {
      stats.skipped++
      continue
    }

    // 检查数量限制
    if (result.length >= PLAYLIST_CONFIG.MAX_PLAYLISTS) {
      stats.skipped++
      continue
    }

    // 添加新歌单
    result.push({
      ...importedPlaylist,
      id: generateId(),
      order: nextOrder++,
      createdAt: importedPlaylist.createdAt || Date.now(),
      updatedAt: Date.now()
    })
    stats.added++
  }

  return { success: true, playlists: result, stats }
}

/**
 * 创建文件选择器并导入
 * @returns {Promise<{success: boolean, data?: import('../types/playlist.js').ExportData, error?: string}>}
 */
export const selectAndImportFile = () => {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    input.onchange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) {
        resolve({ success: false, error: ErrorTypes.FILE_NOT_FOUND })
        return
      }
      const result = await importFromFile(file)
      resolve(result)
    }

    input.oncancel = () => {
      resolve({ success: false, error: 'CANCELLED' })
    }

    input.click()
  })
}
