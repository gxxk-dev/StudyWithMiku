/**
 * @module migration
 * 数据迁移服务 - 处理 localStorage 数据结构升级
 *
 * 功能：
 * - 版本检测与顺序迁移
 * - 迁移前自动备份
 * - 迁移失败自动回滚
 * - 手动回滚支持
 */

import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  safeLocalStorageGetJSON,
  safeLocalStorageSetJSON
} from '../utils/storage.js'
import { STORAGE_KEYS } from '../config/constants.js'

/** 当前数据版本（每次数据结构变更时递增） */
export const CURRENT_DATA_VERSION = 1

/** 备份键前缀 */
const BACKUP_PREFIX = 'swm_backup_'

/** 备份时间戳键 */
const BACKUP_TIMESTAMP_KEY = 'swm_backup_timestamp'

/**
 * @typedef {Object} MigrationResult
 * @property {boolean} success - 是否成功
 * @property {string} [error] - 错误信息
 */

/**
 * @typedef {Object} MigrationReport
 * @property {boolean} success - 整体是否成功
 * @property {number} migratedFrom - 起始版本
 * @property {number} migratedTo - 最终版本
 * @property {string[]} errors - 错误列表
 * @property {boolean} rolledBack - 是否已回滚
 */

/**
 * 迁移函数注册表
 * @type {Record<number, () => MigrationResult>}
 */
const migrations = {
  // 版本 1：初始版本，无需迁移逻辑
  // 未来迁移示例：
  // 2: migrateToV2,
}

// ============ 版本管理 ============

/**
 * 获取当前数据版本
 * @returns {number}
 */
export const getDataVersion = () => {
  const version = safeLocalStorageGet(STORAGE_KEYS.DATA_VERSION, '0')
  return parseInt(version, 10) || 0
}

/**
 * 设置数据版本
 * @param {number} version
 */
const setDataVersion = (version) => {
  safeLocalStorageSet(STORAGE_KEYS.DATA_VERSION, String(version))
}

// ============ 备份与回滚 ============

/**
 * 获取所有 swm_ 前缀的键（排除备份键）
 * @returns {string[]}
 */
const getAllDataKeys = () => {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('swm_') && !key.startsWith(BACKUP_PREFIX)) {
      keys.push(key)
    }
  }
  return keys
}

/**
 * 创建数据备份
 * @returns {{ success: boolean, keys: string[], error?: string }}
 */
export const createBackup = () => {
  try {
    const keys = getAllDataKeys()

    // 清理旧备份
    clearBackup()

    // 备份所有数据
    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value !== null) {
        const backupKey = BACKUP_PREFIX + key
        safeLocalStorageSet(backupKey, value)
      }
    }

    // 记录备份时间
    safeLocalStorageSet(BACKUP_TIMESTAMP_KEY, String(Date.now()))

    console.log(`[Migration] 已备份 ${keys.length} 个键`)
    return { success: true, keys }
  } catch (err) {
    console.error('[Migration] 备份失败:', err)
    return { success: false, keys: [], error: err.message }
  }
}

/**
 * 从备份恢复数据
 * @returns {{ success: boolean, restoredKeys: string[], error?: string }}
 */
export const restoreFromBackup = () => {
  try {
    const restoredKeys = []

    // 查找所有备份键
    const backupKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(BACKUP_PREFIX) && key !== BACKUP_TIMESTAMP_KEY) {
        backupKeys.push(key)
      }
    }

    if (backupKeys.length === 0) {
      return { success: false, restoredKeys: [], error: '没有找到备份数据' }
    }

    // 恢复数据
    for (const backupKey of backupKeys) {
      const originalKey = backupKey.replace(BACKUP_PREFIX, '')
      const value = localStorage.getItem(backupKey)
      if (value !== null) {
        safeLocalStorageSet(originalKey, value)
        restoredKeys.push(originalKey)
      }
    }

    console.log(`[Migration] 已恢复 ${restoredKeys.length} 个键`)
    return { success: true, restoredKeys }
  } catch (err) {
    console.error('[Migration] 恢复失败:', err)
    return { success: false, restoredKeys: [], error: err.message }
  }
}

/**
 * 清理备份数据
 * @returns {{ success: boolean, clearedKeys: number }}
 */
export const clearBackup = () => {
  try {
    let clearedKeys = 0
    const keysToRemove = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith(BACKUP_PREFIX) || key === BACKUP_TIMESTAMP_KEY)) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      safeLocalStorageRemove(key)
      clearedKeys++
    }

    if (clearedKeys > 0) {
      console.log(`[Migration] 已清理 ${clearedKeys} 个备份键`)
    }
    return { success: true, clearedKeys }
  } catch (err) {
    console.error('[Migration] 清理备份失败:', err)
    return { success: false, clearedKeys: 0 }
  }
}

/**
 * 检查是否存在备份
 * @returns {{ exists: boolean, timestamp?: number }}
 */
export const hasBackup = () => {
  const timestamp = safeLocalStorageGet(BACKUP_TIMESTAMP_KEY)
  if (timestamp) {
    return { exists: true, timestamp: parseInt(timestamp, 10) }
  }
  return { exists: false }
}

// ============ 迁移执行 ============

/**
 * 执行所有待处理的迁移
 * @param {Object} [options]
 * @param {boolean} [options.autoRollback=true] - 失败时自动回滚
 * @param {boolean} [options.clearBackupOnSuccess=false] - 成功后清理备份
 * @returns {MigrationReport}
 */
export const runMigrations = (options = {}) => {
  const { autoRollback = true, clearBackupOnSuccess = false } = options

  const currentVersion = getDataVersion()
  const errors = []
  let lastSuccessVersion = currentVersion
  let rolledBack = false

  // 已是最新版本
  if (currentVersion >= CURRENT_DATA_VERSION) {
    return {
      success: true,
      migratedFrom: currentVersion,
      migratedTo: currentVersion,
      errors: [],
      rolledBack: false
    }
  }

  console.log(`[Migration] 数据版本 ${currentVersion} → ${CURRENT_DATA_VERSION}`)

  // 创建备份
  const backupResult = createBackup()
  if (!backupResult.success) {
    console.warn('[Migration] 备份失败，继续迁移（无法回滚）')
  }

  // 按版本顺序执行迁移
  for (
    let targetVersion = currentVersion + 1;
    targetVersion <= CURRENT_DATA_VERSION;
    targetVersion++
  ) {
    const migrateFn = migrations[targetVersion]

    if (!migrateFn) {
      // 无迁移函数，直接递增版本
      lastSuccessVersion = targetVersion
      continue
    }

    try {
      console.log(`[Migration] 执行: v${targetVersion - 1} → v${targetVersion}`)
      const result = migrateFn()

      if (result.success) {
        lastSuccessVersion = targetVersion
        console.log(`[Migration] v${targetVersion} 成功`)
      } else {
        errors.push(`v${targetVersion}: ${result.error || '未知错误'}`)
        console.error(`[Migration] v${targetVersion} 失败:`, result.error)
        break
      }
    } catch (err) {
      errors.push(`v${targetVersion}: ${err.message}`)
      console.error(`[Migration] v${targetVersion} 异常:`, err)
      break
    }
  }

  // 处理结果
  if (errors.length > 0 && autoRollback && backupResult.success) {
    console.log('[Migration] 迁移失败，执行回滚...')
    const rollbackResult = restoreFromBackup()
    rolledBack = rollbackResult.success
    if (rolledBack) {
      console.log('[Migration] 回滚成功')
    } else {
      console.error('[Migration] 回滚失败:', rollbackResult.error)
      errors.push(`回滚失败: ${rollbackResult.error}`)
    }
  } else {
    // 迁移成功，更新版本号
    setDataVersion(lastSuccessVersion)

    if (clearBackupOnSuccess && errors.length === 0) {
      clearBackup()
    }
  }

  return {
    success: errors.length === 0,
    migratedFrom: currentVersion,
    migratedTo: rolledBack ? currentVersion : lastSuccessVersion,
    errors,
    rolledBack
  }
}

/**
 * 手动回滚到备份版本
 * @returns {{ success: boolean, error?: string }}
 */
export const rollbackMigration = () => {
  const backup = hasBackup()
  if (!backup.exists) {
    return { success: false, error: '没有可用的备份' }
  }

  const result = restoreFromBackup()
  if (result.success) {
    // 恢复后清理备份
    clearBackup()
  }
  return result
}

// ============ 迁移工具函数 ============

/**
 * 迁移键名（重命名）
 * @param {string} oldKey - 旧键名
 * @param {string} newKey - 新键名
 * @returns {boolean} 是否执行了迁移
 */
export const migrateKey = (oldKey, newKey) => {
  const value = safeLocalStorageGet(oldKey)
  if (value !== null) {
    safeLocalStorageSet(newKey, value)
    safeLocalStorageRemove(oldKey)
    console.log(`[Migration] 键迁移: ${oldKey} → ${newKey}`)
    return true
  }
  return false
}

/**
 * 迁移 JSON 数据结构
 * @param {string} key - 存储键
 * @param {(data: any) => any} transformer - 数据转换函数
 * @returns {boolean} 是否执行了迁移
 */
export const migrateJSON = (key, transformer) => {
  const data = safeLocalStorageGetJSON(key, null)
  if (data !== null) {
    const newData = transformer(data)
    safeLocalStorageSetJSON(key, newData)
    console.log(`[Migration] JSON 迁移: ${key}`)
    return true
  }
  return false
}

// ============ 迁移函数示例 ============

// /**
//  * 迁移到 v2 示例
//  * @returns {MigrationResult}
//  */
// const migrateToV2 = () => {
//   try {
//     // 示例 1：重命名键
//     migrateKey('old_settings', STORAGE_KEYS.USER_SETTINGS)
//
//     // 示例 2：添加新字段
//     migrateJSON(STORAGE_KEYS.USER_SETTINGS, (data) => ({
//       ...data,
//       newField: data.newField ?? 'defaultValue'
//     }))
//
//     // 示例 3：数据格式转换
//     migrateJSON(STORAGE_KEYS.FOCUS_RECORDS, (records) =>
//       records.map(record => ({
//         ...record,
//         // 将旧的 timestamp 字段拆分为 startTime 和 endTime
//         startTime: record.startTime ?? record.timestamp,
//         endTime: record.endTime ?? record.timestamp + record.duration * 1000
//       }))
//     )
//
//     return { success: true }
//   } catch (err) {
//     return { success: false, error: err.message }
//   }
// }
