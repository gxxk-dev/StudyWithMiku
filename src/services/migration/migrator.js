/**
 * @module migration/migrator
 * 迁移引擎 - 执行迁移升降级和回滚
 */

import { STORAGE_KEYS } from '../../config/constants.js'
import { getMigrationsInRange, getLatestMigrationVersion } from './registry.js'

/** localStorage 键前缀 */
const STORAGE_PREFIX = 'swm_'

/**
 * @typedef {Object} MigrationResult
 * @property {boolean} success - 是否成功
 * @property {number} fromVersion - 起始版本
 * @property {number} toVersion - 目标版本
 * @property {string} [error] - 错误信息
 */

/**
 * 获取当前 schema 版本
 * @returns {number}
 */
export function getCurrentVersion() {
  const stored = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)
  if (stored === null) {
    return 0
  }
  const version = parseInt(stored, 10)
  return Number.isNaN(version) ? 0 : version
}

/**
 * 设置当前 schema 版本
 * @param {number} version
 */
function setCurrentVersion(version) {
  localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(version))
}

/**
 * 获取最新 schema 版本
 * @returns {number}
 */
export function getLatestVersion() {
  return getLatestMigrationVersion()
}

/**
 * 创建所有 swm_ 前缀键的快照
 * @returns {Map<string, string>}
 */
function createSnapshot() {
  const snapshot = new Map()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      snapshot.set(key, localStorage.getItem(key))
    }
  }
  return snapshot
}

/**
 * 从快照恢复 localStorage
 * @param {Map<string, string>} snapshot
 */
function restoreSnapshot(snapshot) {
  // 先删除所有 swm_ 前缀的键
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))

  // 恢复快照
  snapshot.forEach((value, key) => {
    localStorage.setItem(key, value)
  })
}

/**
 * 执行迁移到指定版本
 * @param {number} targetVersion - 目标版本
 * @returns {MigrationResult}
 */
export function migrateTo(targetVersion) {
  const fromVersion = getCurrentVersion()

  if (fromVersion === targetVersion) {
    return { success: true, fromVersion, toVersion: targetVersion }
  }

  const migrations = getMigrationsInRange(fromVersion, targetVersion)
  const isUpgrade = targetVersion > fromVersion

  // 创建快照用于回滚
  const snapshot = createSnapshot()

  try {
    for (const migration of migrations) {
      if (isUpgrade) {
        console.log(`[Migration] Upgrading to v${migration.version}: ${migration.description}`)
        migration.up()
        setCurrentVersion(migration.version)
      } else {
        console.log(`[Migration] Downgrading from v${migration.version}: ${migration.description}`)
        migration.down()
        // 降级后设置为前一个版本
        setCurrentVersion(migration.version - 1)
      }
    }

    console.log(`[Migration] Successfully migrated from v${fromVersion} to v${targetVersion}`)
    return { success: true, fromVersion, toVersion: targetVersion }
  } catch (error) {
    console.error('[Migration] Failed:', error)
    // 回滚到快照
    restoreSnapshot(snapshot)
    console.log(`[Migration] Rolled back to v${fromVersion}`)

    return {
      success: false,
      fromVersion,
      toVersion: targetVersion,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * 执行迁移到最新版本（应用启动时调用）
 * @returns {MigrationResult}
 */
export function runMigrations() {
  const latestVersion = getLatestVersion()
  return migrateTo(latestVersion)
}
