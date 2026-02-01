/**
 * @module migration/migrations/v1
 * Schema 版本 1 - 初始迁移
 *
 * 标记初始 schema 版本，无实际数据变更。
 * 这个迁移的作用是为现有数据打上版本标记。
 */

import { registerMigration } from '../registry.js'

registerMigration({
  version: 1,
  description: '标记初始 schema 版本',

  /**
   * 升级到 v1
   * 无数据变更，仅标记版本
   */
  up() {
    // v0 → v1: 无数据变更
    // 版本号由 migrator 自动更新
  },

  /**
   * 降级到 v0
   * 无数据变更
   */
  down() {
    // v1 → v0: 无数据变更
  }
})
