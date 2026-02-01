/**
 * src/services/migration/migrator.js 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STORAGE_KEYS } from '@/config/constants.js'
import { registerMigration, clearMigrations } from '@/services/migration/registry.js'
import {
  getCurrentVersion,
  getLatestVersion,
  migrateTo,
  runMigrations
} from '@/services/migration/migrator.js'

describe('migrator.js', () => {
  beforeEach(() => {
    localStorage.clear()
    clearMigrations()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCurrentVersion', () => {
    it('未存储时应该返回 0', () => {
      expect(getCurrentVersion()).toBe(0)
    })

    it('应该返回存储的版本号', () => {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '3')
      expect(getCurrentVersion()).toBe(3)
    })

    it('无效值时应该返回 0', () => {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, 'invalid')
      expect(getCurrentVersion()).toBe(0)
    })
  })

  describe('getLatestVersion', () => {
    it('无迁移时应该返回 0', () => {
      expect(getLatestVersion()).toBe(0)
    })

    it('应该返回最高迁移版本号', () => {
      registerMigration({ version: 1, description: 'v1', up: () => {}, down: () => {} })
      registerMigration({ version: 3, description: 'v3', up: () => {}, down: () => {} })
      registerMigration({ version: 2, description: 'v2', up: () => {}, down: () => {} })

      expect(getLatestVersion()).toBe(3)
    })
  })

  describe('migrateTo', () => {
    it('版本相同时应该直接返回成功', () => {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '2')

      const result = migrateTo(2)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe(2)
      expect(result.toVersion).toBe(2)
    })

    it('应该执行升级链 v0 → v1 → v2', () => {
      const upCalls = []

      registerMigration({
        version: 1,
        description: 'v1',
        up: () => upCalls.push(1),
        down: () => {}
      })
      registerMigration({
        version: 2,
        description: 'v2',
        up: () => upCalls.push(2),
        down: () => {}
      })

      const result = migrateTo(2)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe(0)
      expect(result.toVersion).toBe(2)
      expect(upCalls).toEqual([1, 2])
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('2')
    })

    it('应该执行降级链 v2 → v1 → v0', () => {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '2')
      const downCalls = []

      registerMigration({
        version: 1,
        description: 'v1',
        up: () => {},
        down: () => downCalls.push(1)
      })
      registerMigration({
        version: 2,
        description: 'v2',
        up: () => {},
        down: () => downCalls.push(2)
      })

      const result = migrateTo(0)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe(2)
      expect(result.toVersion).toBe(0)
      expect(downCalls).toEqual([2, 1])
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('0')
    })

    it('升级失败时应该回滚到快照', () => {
      localStorage.setItem('swm_test_key', 'original')

      registerMigration({
        version: 1,
        description: 'v1',
        up: () => {
          localStorage.setItem('swm_test_key', 'modified')
          throw new Error('Migration failed')
        },
        down: () => {}
      })

      const result = migrateTo(1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Migration failed')
      // 数据应该回滚
      expect(localStorage.getItem('swm_test_key')).toBe('original')
      // 版本号也应该回滚
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBeNull()
    })

    it('降级失败时应该回滚到快照', () => {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '1')
      localStorage.setItem('swm_data', 'v1data')

      registerMigration({
        version: 1,
        description: 'v1',
        up: () => {},
        down: () => {
          localStorage.setItem('swm_data', 'corrupted')
          throw new Error('Downgrade failed')
        }
      })

      const result = migrateTo(0)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Downgrade failed')
      // 数据应该回滚
      expect(localStorage.getItem('swm_data')).toBe('v1data')
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('1')
    })

    it('应该只回滚 swm_ 前缀的键', () => {
      localStorage.setItem('other_key', 'other_value')
      localStorage.setItem('swm_key', 'swm_value')

      registerMigration({
        version: 1,
        description: 'v1',
        up: () => {
          localStorage.setItem('other_key', 'modified_other')
          localStorage.setItem('swm_key', 'modified_swm')
          throw new Error('fail')
        },
        down: () => {}
      })

      migrateTo(1)

      // swm_ 前缀的键应该回滚
      expect(localStorage.getItem('swm_key')).toBe('swm_value')
      // 非 swm_ 前缀的键不受影响（保持修改后的值）
      expect(localStorage.getItem('other_key')).toBe('modified_other')
    })
  })

  describe('runMigrations', () => {
    it('应该升级到最新版本', () => {
      registerMigration({ version: 1, description: 'v1', up: () => {}, down: () => {} })
      registerMigration({ version: 2, description: 'v2', up: () => {}, down: () => {} })

      const result = runMigrations()

      expect(result.success).toBe(true)
      expect(result.toVersion).toBe(2)
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('2')
    })

    it('已是最新版本时应该直接返回成功', () => {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '2')
      registerMigration({ version: 1, description: 'v1', up: () => {}, down: () => {} })
      registerMigration({ version: 2, description: 'v2', up: () => {}, down: () => {} })

      const result = runMigrations()

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe(2)
      expect(result.toVersion).toBe(2)
    })
  })
})
