/**
 * src/services/migration/migrations/v1.js 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STORAGE_KEYS } from '@/config/constants.js'
import { clearMigrations, getMigrations, registerMigration } from '@/services/migration/registry.js'
import { runMigrations, migrateTo } from '@/services/migration/migrator.js'

describe('v1.js migration', () => {
  beforeEach(() => {
    localStorage.clear()
    clearMigrations()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('迁移注册', () => {
    it('应该正确注册 v1 迁移格式', () => {
      // 模拟 v1 迁移定义
      registerMigration({
        version: 1,
        description: '标记初始 schema 版本',
        up() {},
        down() {}
      })

      const migrations = getMigrations()

      expect(migrations.length).toBe(1)
      expect(migrations[0].version).toBe(1)
      expect(migrations[0].description).toBe('标记初始 schema 版本')
      expect(typeof migrations[0].up).toBe('function')
      expect(typeof migrations[0].down).toBe('function')
    })
  })

  describe('up()', () => {
    it('应该正常执行（无数据变更）', () => {
      // 预设一些数据
      localStorage.setItem('swm_settings', '{"volume":0.5}')

      // 注册 v1 迁移（模拟真实迁移的行为）
      registerMigration({
        version: 1,
        description: '标记初始 schema 版本',
        up() {},
        down() {}
      })

      const result = runMigrations()

      expect(result.success).toBe(true)
      expect(result.toVersion).toBe(1)
      // 数据应该保持不变
      expect(localStorage.getItem('swm_settings')).toBe('{"volume":0.5}')
      // 版本号应该更新
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('1')
    })
  })

  describe('down()', () => {
    it('应该正常执行（无数据变更）', () => {
      // 设置为 v1
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '1')
      localStorage.setItem('swm_settings', '{"volume":0.5}')

      registerMigration({
        version: 1,
        description: '标记初始 schema 版本',
        up() {},
        down() {}
      })

      const result = migrateTo(0)

      expect(result.success).toBe(true)
      expect(result.toVersion).toBe(0)
      // 数据应该保持不变
      expect(localStorage.getItem('swm_settings')).toBe('{"volume":0.5}')
      // 版本号应该更新
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('0')
    })
  })

  describe('完整升降级循环', () => {
    it('v0 → v1 → v0 应该保持数据完整', () => {
      // 初始数据
      localStorage.setItem('swm_settings', '{"theme":"dark"}')
      localStorage.setItem('swm_playlist_id', '12345')

      registerMigration({
        version: 1,
        description: '标记初始 schema 版本',
        up() {},
        down() {}
      })

      // 升级到 v1
      const upgradeResult = runMigrations()
      expect(upgradeResult.success).toBe(true)

      // 降级到 v0
      const downgradeResult = migrateTo(0)
      expect(downgradeResult.success).toBe(true)

      // 数据应该保持完整
      expect(localStorage.getItem('swm_settings')).toBe('{"theme":"dark"}')
      expect(localStorage.getItem('swm_playlist_id')).toBe('12345')
    })
  })
})
