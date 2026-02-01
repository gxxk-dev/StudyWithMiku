/**
 * @module migration
 * 数据迁移系统入口
 *
 * 提供 localStorage 数据格式的版本管理，支持：
 * - 应用启动时自动升级到最新 schema
 * - 版本切换前主动降级数据格式
 * - 迁移失败时回滚保护
 */

// 导入所有迁移定义（按版本顺序）
import './migrations/v1.js'

// 导出公共 API
export { runMigrations, migrateTo, getCurrentVersion, getLatestVersion } from './migrator.js'
export { registerMigration, getMigrations, clearMigrations } from './registry.js'
