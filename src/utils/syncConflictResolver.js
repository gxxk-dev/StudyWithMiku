/**
 * @fileoverview 数据同步冲突解决工具
 * @module utils/syncConflictResolver
 */

/**
 * 合并 Focus 记录（按 id 去重）
 * @param {Array} localRecords - 本地记录
 * @param {Array} serverRecords - 服务器记录
 * @returns {Array} 合并后的记录
 */
export const mergeFocusRecords = (localRecords, serverRecords) => {
  if (!Array.isArray(localRecords)) localRecords = []
  if (!Array.isArray(serverRecords)) serverRecords = []

  // 使用 Map 按 id 去重
  const recordMap = new Map()

  // 先添加服务器记录
  serverRecords.forEach((record) => {
    if (record && record.id) {
      recordMap.set(record.id, record)
    }
  })

  // 再添加本地记录（覆盖同 id 的服务器记录）
  localRecords.forEach((record) => {
    if (record && record.id) {
      // 如果本地记录更新，使用本地版本
      const existing = recordMap.get(record.id)
      if (
        !existing ||
        (record.updatedAt && existing.updatedAt && record.updatedAt > existing.updatedAt)
      ) {
        recordMap.set(record.id, record)
      }
    }
  })

  // 转换为数组并按时间排序
  return Array.from(recordMap.values()).sort((a, b) => {
    const timeA = a.startTime || a.createdAt || 0
    const timeB = b.startTime || b.createdAt || 0
    return timeB - timeA // 降序
  })
}

/**
 * 合并歌单（按 id 去重）
 * @param {Array} localPlaylists - 本地歌单
 * @param {Array} serverPlaylists - 服务器歌单
 * @returns {Array} 合并后的歌单
 */
export const mergePlaylists = (localPlaylists, serverPlaylists) => {
  if (!Array.isArray(localPlaylists)) localPlaylists = []
  if (!Array.isArray(serverPlaylists)) serverPlaylists = []

  // 使用 Map 按 id 去重
  const playlistMap = new Map()

  // 先添加服务器歌单
  serverPlaylists.forEach((playlist) => {
    if (playlist && playlist.id) {
      playlistMap.set(playlist.id, playlist)
    }
  })

  // 再添加本地歌单（覆盖同 id 的服务器歌单）
  localPlaylists.forEach((playlist) => {
    if (playlist && playlist.id) {
      // 如果本地歌单更新，使用本地版本
      const existing = playlistMap.get(playlist.id)
      if (
        !existing ||
        (playlist.updatedAt && existing.updatedAt && playlist.updatedAt > existing.updatedAt)
      ) {
        playlistMap.set(playlist.id, playlist)
      }
    }
  })

  // 转换为数组并按创建时间排序
  return Array.from(playlistMap.values()).sort((a, b) => {
    const timeA = a.createdAt || 0
    const timeB = b.createdAt || 0
    return timeA - timeB // 升序
  })
}

/**
 * Last-Write-Wins 策略（基于版本号或时间戳）
 * @param {any} localData - 本地数据
 * @param {any} serverData - 服务器数据
 * @param {number} localVersion - 本地版本号
 * @param {number} serverVersion - 服务器版本号
 * @returns {Object} 解决结果
 * @returns {any} result.data - 选中的数据
 * @returns {string} result.source - 数据来源 ('local'|'server')
 * @returns {boolean} result.hasConflict - 是否存在冲突
 */
export const lastWriteWins = (localData, serverData, localVersion, serverVersion) => {
  // 如果版本号相同，认为数据一致
  if (localVersion === serverVersion) {
    return {
      data: serverData,
      source: 'server',
      hasConflict: false
    }
  }

  // 如果本地版本更新，使用本地数据
  if (localVersion > serverVersion) {
    return {
      data: localData,
      source: 'local',
      hasConflict: true
    }
  }

  // 否则使用服务器数据
  return {
    data: serverData,
    source: 'server',
    hasConflict: true
  }
}

/**
 * 深度合并对象（服务器优先，但保留本地独有字段）
 * @param {Object} localData - 本地数据
 * @param {Object} serverData - 服务器数据
 * @returns {Object} 合并后的数据
 */
export const deepMergeObjects = (localData, serverData) => {
  if (!localData || typeof localData !== 'object') return serverData
  if (!serverData || typeof serverData !== 'object') return localData

  const merged = { ...localData }

  for (const key in serverData) {
    if (Object.prototype.hasOwnProperty.call(serverData, key)) {
      const serverValue = serverData[key]
      const localValue = localData[key]

      // 如果服务器值是对象，递归合并
      if (serverValue && typeof serverValue === 'object' && !Array.isArray(serverValue)) {
        merged[key] = deepMergeObjects(localValue, serverValue)
      } else {
        // 否则使用服务器值
        merged[key] = serverValue
      }
    }
  }

  return merged
}

/**
 * 合并 Focus 设置
 * @param {Object} localSettings - 本地设置
 * @param {Object} serverSettings - 服务器设置
 * @param {number} localVersion - 本地版本号
 * @param {number} serverVersion - 服务器版本号
 * @returns {Object} 合并后的设置
 */
export const mergeFocusSettings = (localSettings, serverSettings, localVersion, serverVersion) => {
  // 使用 Last-Write-Wins，但保留本地独有字段
  const lwwResult = lastWriteWins(localSettings, serverSettings, localVersion, serverVersion)

  if (!lwwResult.hasConflict) {
    return lwwResult.data
  }

  // 如果有冲突，深度合并
  return deepMergeObjects(localSettings, serverSettings)
}

/**
 * 合并用户设置
 * @param {Object} localSettings - 本地设置
 * @param {Object} serverSettings - 服务器设置
 * @param {number} localVersion - 本地版本号
 * @param {number} serverVersion - 服务器版本号
 * @returns {Object} 合并后的设置
 */
export const mergeUserSettings = (localSettings, serverSettings, localVersion, serverVersion) => {
  // 使用 Last-Write-Wins，但保留本地独有字段
  const lwwResult = lastWriteWins(localSettings, serverSettings, localVersion, serverVersion)

  if (!lwwResult.hasConflict) {
    return lwwResult.data
  }

  // 如果有冲突，深度合并
  return deepMergeObjects(localSettings, serverSettings)
}

/**
 * 合并分享卡片配置
 * @param {Object} localConfig - 本地配置
 * @param {Object} serverConfig - 服务器配置
 * @param {number} localVersion - 本地版本号
 * @param {number} serverVersion - 服务器版本号
 * @returns {Object} 合并后的配置
 */
export const mergeShareConfig = (localConfig, serverConfig, localVersion, serverVersion) => {
  // 使用 Last-Write-Wins
  const lwwResult = lastWriteWins(localConfig, serverConfig, localVersion, serverVersion)
  return lwwResult.data
}

/**
 * 根据数据类型选择合并策略
 * @param {string} dataType - 数据类型
 * @param {any} localData - 本地数据
 * @param {any} serverData - 服务器数据
 * @param {number} localVersion - 本地版本号
 * @param {number} serverVersion - 服务器版本号
 * @returns {any} 合并后的数据
 */
export const resolveConflict = (dataType, localData, serverData, localVersion, serverVersion) => {
  switch (dataType) {
    case 'focus_records':
      return mergeFocusRecords(localData, serverData)

    case 'playlists':
      // 歌单数据包含 playlists 数组和当前/默认歌单 ID
      if (localData && serverData) {
        return {
          playlists: mergePlaylists(localData.playlists, serverData.playlists),
          currentId: serverData.currentId || localData.currentId,
          defaultId: serverData.defaultId || localData.defaultId
        }
      }
      return serverData || localData

    case 'focus_settings':
      return mergeFocusSettings(localData, serverData, localVersion, serverVersion)

    case 'user_settings':
      return mergeUserSettings(localData, serverData, localVersion, serverVersion)

    case 'share_config':
      return mergeShareConfig(localData, serverData, localVersion, serverVersion)

    default:
      // 默认使用 Last-Write-Wins
      return lastWriteWins(localData, serverData, localVersion, serverVersion).data
  }
}

/**
 * 检测数据是否有实质性变化
 * @param {any} oldData - 旧数据
 * @param {any} newData - 新数据
 * @returns {boolean} 是否有变化
 */
export const hasDataChanged = (oldData, newData) => {
  // 简单的 JSON 序列化比较
  try {
    return JSON.stringify(oldData) !== JSON.stringify(newData)
  } catch (error) {
    console.error('比较数据失败:', error)
    return true // 保守起见，认为有变化
  }
}
