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
 * 合并两个用户的数据
 * @param {Object} d1 - D1 数据库实例
 * @param {string} targetUserId - 目标用户 ID（当前登录用户）
 * @param {string} sourceUserId - 源用户 ID（被合并的用户）
 * @param {Object} dataChoices - 每个类别选择保留哪边
 *   { records: 'target'|'source', settings: 'target'|'source', playlists: 'target'|'source' }
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
