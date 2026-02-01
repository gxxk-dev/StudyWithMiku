/**
 * @module migration/registry
 * 迁移注册表 - 管理所有已注册的迁移定义
 */

/**
 * @typedef {Object} Migration
 * @property {number} version - 迁移目标版本号
 * @property {string} description - 迁移描述
 * @property {() => void} up - 升级函数
 * @property {() => void} down - 降级函数
 */

/** @type {Migration[]} */
const migrations = []

/**
 * 注册一个迁移
 * @param {Migration} migration - 迁移定义
 */
export function registerMigration(migration) {
  if (typeof migration.version !== 'number' || migration.version < 1) {
    throw new Error(`Invalid migration version: ${migration.version}`)
  }
  if (typeof migration.up !== 'function') {
    throw new Error(`Migration v${migration.version} must have an up() function`)
  }
  if (typeof migration.down !== 'function') {
    throw new Error(`Migration v${migration.version} must have a down() function`)
  }

  // 检查重复版本
  if (migrations.some((m) => m.version === migration.version)) {
    throw new Error(`Migration v${migration.version} is already registered`)
  }

  migrations.push(migration)
  // 保持按版本号排序
  migrations.sort((a, b) => a.version - b.version)
}

/**
 * 获取所有已注册的迁移（按版本号升序）
 * @returns {Migration[]}
 */
export function getMigrations() {
  return [...migrations]
}

/**
 * 获取指定版本范围的迁移
 * @param {number} fromVersion - 起始版本（不包含）
 * @param {number} toVersion - 目标版本（包含）
 * @returns {Migration[]} - 升级时正序，降级时逆序
 */
export function getMigrationsInRange(fromVersion, toVersion) {
  if (fromVersion === toVersion) {
    return []
  }

  const isUpgrade = toVersion > fromVersion
  const filtered = migrations.filter((m) => {
    if (isUpgrade) {
      // 升级: from < version <= to
      return m.version > fromVersion && m.version <= toVersion
    } else {
      // 降级: to < version <= from
      return m.version > toVersion && m.version <= fromVersion
    }
  })

  // 降级时逆序
  if (!isUpgrade) {
    filtered.reverse()
  }

  return filtered
}

/**
 * 获取最新迁移版本号
 * @returns {number}
 */
export function getLatestMigrationVersion() {
  if (migrations.length === 0) {
    return 0
  }
  return migrations[migrations.length - 1].version
}

/**
 * 清空所有迁移（仅用于测试）
 */
export function clearMigrations() {
  migrations.length = 0
}
