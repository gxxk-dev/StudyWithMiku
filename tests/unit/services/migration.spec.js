import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CURRENT_DATA_VERSION,
  getDataVersion,
  createBackup,
  restoreFromBackup,
  clearBackup,
  hasBackup,
  runMigrations,
  rollbackMigration,
  migrateKey,
  migrateJSON
} from '../../../src/services/migration.js'
import { STORAGE_KEYS } from '../../../src/config/constants.js'

describe('migration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('getDataVersion', () => {
    it('应返回 0 当没有版本号时', () => {
      expect(getDataVersion()).toBe(0)
    })

    it('应返回正确的版本号', () => {
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, '5')
      expect(getDataVersion()).toBe(5)
    })

    it('应返回 0 当版本号无效时', () => {
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, 'invalid')
      expect(getDataVersion()).toBe(0)
    })
  })

  describe('createBackup', () => {
    it('应正确备份所有 swm_ 键', () => {
      localStorage.setItem('swm_test1', 'value1')
      localStorage.setItem('swm_test2', 'value2')
      localStorage.setItem('other_key', 'other_value')

      const result = createBackup()

      expect(result.success).toBe(true)
      expect(result.keys).toContain('swm_test1')
      expect(result.keys).toContain('swm_test2')
      expect(result.keys).not.toContain('other_key')
      expect(localStorage.getItem('swm_backup_swm_test1')).toBe('value1')
      expect(localStorage.getItem('swm_backup_swm_test2')).toBe('value2')
      expect(localStorage.getItem('swm_backup_timestamp')).toBeTruthy()
    })

    it('应清理旧备份后再创建新备份', () => {
      localStorage.setItem('swm_backup_old', 'old_backup')
      localStorage.setItem('swm_test', 'new_value')

      createBackup()

      expect(localStorage.getItem('swm_backup_old')).toBeNull()
      expect(localStorage.getItem('swm_backup_swm_test')).toBe('new_value')
    })
  })

  describe('restoreFromBackup', () => {
    it('应正确恢复数据', () => {
      localStorage.setItem('swm_backup_swm_test1', 'backup_value1')
      localStorage.setItem('swm_backup_swm_test2', 'backup_value2')
      localStorage.setItem('swm_backup_timestamp', String(Date.now()))

      const result = restoreFromBackup()

      expect(result.success).toBe(true)
      expect(result.restoredKeys).toContain('swm_test1')
      expect(result.restoredKeys).toContain('swm_test2')
      expect(localStorage.getItem('swm_test1')).toBe('backup_value1')
      expect(localStorage.getItem('swm_test2')).toBe('backup_value2')
    })

    it('应返回失败当没有备份时', () => {
      const result = restoreFromBackup()

      expect(result.success).toBe(false)
      expect(result.error).toBe('没有找到备份数据')
    })
  })

  describe('clearBackup', () => {
    it('应清理所有备份键', () => {
      localStorage.setItem('swm_backup_swm_test', 'backup')
      localStorage.setItem('swm_backup_timestamp', '123456')
      localStorage.setItem('swm_test', 'original')

      const result = clearBackup()

      expect(result.success).toBe(true)
      expect(result.clearedKeys).toBe(2)
      expect(localStorage.getItem('swm_backup_swm_test')).toBeNull()
      expect(localStorage.getItem('swm_backup_timestamp')).toBeNull()
      expect(localStorage.getItem('swm_test')).toBe('original')
    })
  })

  describe('hasBackup', () => {
    it('应返回 exists: false 当没有备份时', () => {
      const result = hasBackup()
      expect(result.exists).toBe(false)
    })

    it('应返回 exists: true 和时间戳当有备份时', () => {
      const timestamp = Date.now()
      localStorage.setItem('swm_backup_timestamp', String(timestamp))

      const result = hasBackup()

      expect(result.exists).toBe(true)
      expect(result.timestamp).toBe(timestamp)
    })
  })

  describe('runMigrations', () => {
    it('应直接返回成功当已是最新版本', () => {
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, String(CURRENT_DATA_VERSION))

      const result = runMigrations()

      expect(result.success).toBe(true)
      expect(result.migratedFrom).toBe(CURRENT_DATA_VERSION)
      expect(result.migratedTo).toBe(CURRENT_DATA_VERSION)
      expect(result.errors).toHaveLength(0)
      expect(result.rolledBack).toBe(false)
    })

    it('应从版本 0 迁移到当前版本', () => {
      localStorage.setItem('swm_test', 'value')

      const result = runMigrations()

      expect(result.success).toBe(true)
      expect(result.migratedFrom).toBe(0)
      expect(result.migratedTo).toBe(CURRENT_DATA_VERSION)
      expect(localStorage.getItem(STORAGE_KEYS.DATA_VERSION)).toBe(String(CURRENT_DATA_VERSION))
    })

    it('应在迁移前创建备份', () => {
      localStorage.setItem('swm_test', 'value')

      runMigrations()

      // 备份应该存在（除非 clearBackupOnSuccess 为 true）
      expect(localStorage.getItem('swm_backup_swm_test')).toBe('value')
    })

    it('应在成功后清理备份当 clearBackupOnSuccess 为 true', () => {
      localStorage.setItem('swm_test', 'value')

      runMigrations({ clearBackupOnSuccess: true })

      expect(localStorage.getItem('swm_backup_swm_test')).toBeNull()
      expect(localStorage.getItem('swm_backup_timestamp')).toBeNull()
    })
  })

  describe('rollbackMigration', () => {
    it('应返回失败当没有备份时', () => {
      const result = rollbackMigration()

      expect(result.success).toBe(false)
      expect(result.error).toBe('没有可用的备份')
    })

    it('应成功回滚并清理备份', () => {
      localStorage.setItem('swm_backup_swm_test', 'backup_value')
      localStorage.setItem('swm_backup_timestamp', String(Date.now()))
      localStorage.setItem('swm_test', 'current_value')

      const result = rollbackMigration()

      expect(result.success).toBe(true)
      expect(localStorage.getItem('swm_test')).toBe('backup_value')
      expect(localStorage.getItem('swm_backup_swm_test')).toBeNull()
      expect(localStorage.getItem('swm_backup_timestamp')).toBeNull()
    })
  })

  describe('migrateKey', () => {
    it('应正确重命名键', () => {
      localStorage.setItem('old_key', 'value')

      const result = migrateKey('old_key', 'new_key')

      expect(result).toBe(true)
      expect(localStorage.getItem('old_key')).toBeNull()
      expect(localStorage.getItem('new_key')).toBe('value')
    })

    it('应返回 false 当旧键不存在时', () => {
      const result = migrateKey('nonexistent', 'new_key')

      expect(result).toBe(false)
      expect(localStorage.getItem('new_key')).toBeNull()
    })
  })

  describe('migrateJSON', () => {
    it('应正确转换数据结构', () => {
      localStorage.setItem('swm_json_test', JSON.stringify({ a: 1, b: 2 }))

      const result = migrateJSON('swm_json_test', (data) => ({
        ...data,
        c: 3
      }))

      expect(result).toBe(true)
      const newData = JSON.parse(localStorage.getItem('swm_json_test'))
      expect(newData).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('应返回 false 当键不存在时', () => {
      const result = migrateJSON('nonexistent', (data) => data)

      expect(result).toBe(false)
    })

    it('应能处理数组数据', () => {
      localStorage.setItem('swm_array_test', JSON.stringify([{ id: 1 }, { id: 2 }]))

      const result = migrateJSON('swm_array_test', (data) =>
        data.map((item) => ({ ...item, newField: 'default' }))
      )

      expect(result).toBe(true)
      const newData = JSON.parse(localStorage.getItem('swm_array_test'))
      expect(newData).toEqual([
        { id: 1, newField: 'default' },
        { id: 2, newField: 'default' }
      ])
    })
  })

  describe('CURRENT_DATA_VERSION', () => {
    it('应为正整数', () => {
      expect(CURRENT_DATA_VERSION).toBeGreaterThan(0)
      expect(Number.isInteger(CURRENT_DATA_VERSION)).toBe(true)
    })
  })
})
