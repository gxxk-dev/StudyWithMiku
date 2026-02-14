/**
 * @module workers/services/merge
 * @description 账号合并数据服务
 */

import { getUserData, updateUserData } from './userData.js'
import { deleteUser, getTotalAuthMethodCount } from './user.js'
import { DATA_CONFIG } from '../constants.js'

/**
 * 数据类别到 dataType 的映射
 */
const CATEGORY_MAP = {
  records: [DATA_CONFIG.TYPES.FOCUS_RECORDS],
  settings: [
    DATA_CONFIG.TYPES.FOCUS_SETTINGS,
    DATA_CONFIG.TYPES.USER_SETTINGS,
    DATA_CONFIG.TYPES.SHARE_CONFIG
  ],
  playlists: [DATA_CONFIG.TYPES.PLAYLISTS]
}

/**
 * 合并专注记录（按 id 去重，LWW 基于 updatedAt，按 startTime 降序排列）
 * @param {Array} targetRecords - 目标用户记录
 * @param {Array} sourceRecords - 源用户记录
 * @returns {Array} 合并后的记录（已截断至 MAX_FOCUS_RECORDS）
 */
const mergeFocusRecords = (targetRecords, sourceRecords) => {
  if (!Array.isArray(targetRecords)) targetRecords = []
  if (!Array.isArray(sourceRecords)) sourceRecords = []

  const recordMap = new Map()

  for (const record of [...sourceRecords, ...targetRecords]) {
    if (!record || !record.id) continue

    const existing = recordMap.get(record.id)
    if (!existing) {
      recordMap.set(record.id, record)
    } else {
      const existingTime = existing.updatedAt || existing.startTime || 0
      const recordTime = record.updatedAt || record.startTime || 0
      if (recordTime > existingTime) {
        recordMap.set(record.id, record)
      }
    }
  }

  const merged = Array.from(recordMap.values()).sort((a, b) => {
    return (b.startTime || 0) - (a.startTime || 0)
  })

  return merged.slice(0, DATA_CONFIG.MAX_FOCUS_RECORDS)
}

/**
 * 合并歌单数据（按 id 去重，target 侧优先）
 * @param {Object} targetData - 目标用户歌单数据 { playlists, currentId, defaultId }
 * @param {Object} sourceData - 源用户歌单数据 { playlists, currentId, defaultId }
 * @returns {Object} 合并后的歌单数据
 */
const mergePlaylistsData = (targetData, sourceData) => {
  const targetPlaylists = Array.isArray(targetData?.playlists) ? targetData.playlists : []
  const sourcePlaylists = Array.isArray(sourceData?.playlists) ? sourceData.playlists : []

  const playlistMap = new Map()

  // 先添加 target 侧
  for (const playlist of targetPlaylists) {
    if (playlist && playlist.id) {
      playlistMap.set(playlist.id, playlist)
    }
  }

  // 再添加 source 侧（不覆盖 target 已有的）
  for (const playlist of sourcePlaylists) {
    if (playlist && playlist.id && !playlistMap.has(playlist.id)) {
      playlistMap.set(playlist.id, playlist)
    }
  }

  // 截断：保留 target 侧优先的歌单
  let merged = Array.from(playlistMap.values())
  if (merged.length > DATA_CONFIG.MAX_PLAYLISTS) {
    // target 的在前，source 独有的在后，截断时优先保留 target
    const targetIds = new Set(targetPlaylists.filter((p) => p?.id).map((p) => p.id))
    const fromTarget = merged.filter((p) => targetIds.has(p.id))
    const fromSource = merged.filter((p) => !targetIds.has(p.id))
    merged = [...fromTarget, ...fromSource].slice(0, DATA_CONFIG.MAX_PLAYLISTS)
  }

  return {
    playlists: merged,
    currentId: targetData?.currentId ?? sourceData?.currentId ?? null,
    defaultId: targetData?.defaultId ?? sourceData?.defaultId ?? null
  }
}

/**
 * 合并两个用户的数据
 * @param {Object} d1 - D1 数据库实例
 * @param {string} targetUserId - 目标用户 ID（当前登录用户）
 * @param {string} sourceUserId - 源用户 ID（被合并的用户）
 * @param {Object} dataChoices - 每个类别选择保留哪边
 *   { records: 'target'|'source'|'merge', settings: 'target'|'source', playlists: 'target'|'source'|'merge' }
 */
export const mergeUserData = async (d1, targetUserId, sourceUserId, dataChoices) => {
  for (const [category, choice] of Object.entries(dataChoices)) {
    const dataTypes = CATEGORY_MAP[category]
    if (!dataTypes) continue

    if (choice === 'source') {
      for (const dataType of dataTypes) {
        const sourceData = await getUserData(d1, sourceUserId, dataType)
        if (sourceData.data !== null) {
          // 强制写入（clientVersion = null 跳过冲突检测）
          await updateUserData(d1, targetUserId, dataType, sourceData.data, null)
        }
      }
    } else if (choice === 'merge') {
      for (const dataType of dataTypes) {
        const [targetResult, sourceResult] = await Promise.all([
          getUserData(d1, targetUserId, dataType),
          getUserData(d1, sourceUserId, dataType)
        ])

        // 双方都没数据则跳过
        if (targetResult.data === null && sourceResult.data === null) continue

        // 一方没数据则使用另一方
        if (targetResult.data === null) {
          await updateUserData(d1, targetUserId, dataType, sourceResult.data, null)
          continue
        }
        if (sourceResult.data === null) continue

        let mergedData
        if (dataType === DATA_CONFIG.TYPES.FOCUS_RECORDS) {
          mergedData = mergeFocusRecords(targetResult.data, sourceResult.data)
        } else if (dataType === DATA_CONFIG.TYPES.PLAYLISTS) {
          mergedData = mergePlaylistsData(targetResult.data, sourceResult.data)
        } else {
          continue
        }

        await updateUserData(d1, targetUserId, dataType, mergedData, null)
      }
    }
    // choice === 'target' 时不做任何操作，保留目标用户数据
  }
}

/**
 * 合并后清理源用户（如果没有剩余认证方式则删除）
 * @param {Object} d1 - D1 数据库实例
 * @param {string} sourceUserId - 源用户 ID
 * @returns {Promise<boolean>} 是否删除了源用户
 */
export const cleanupSourceUser = async (d1, sourceUserId) => {
  const remaining = await getTotalAuthMethodCount(d1, sourceUserId)
  if (remaining === 0) {
    await deleteUser(d1, sourceUserId)
    return true
  }
  return false
}
