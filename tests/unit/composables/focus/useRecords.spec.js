/**
 * useRecords 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FocusMode, CompletionType } from '@/composables/focus/constants.js'
import { createFocusRecord, createRecordForDate } from '../../../setup/fixtures/focusRecords.js'

describe('useRecords', () => {
  let useRecords, _internal

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()

    const module = await import('@/composables/focus/useRecords.js')
    useRecords = module.useRecords
    _internal = module._internal
    _internal.resetForTesting()
  })

  describe('初始化', () => {
    it('应该正确初始化空记录', () => {
      const { records } = useRecords()

      expect(records.value).toEqual([])
    })

    it('应该从 localStorage 恢复记录', async () => {
      const savedRecords = [
        createFocusRecord({ id: 'saved-1' }),
        createFocusRecord({ id: 'saved-2' })
      ]

      localStorage.setItem('swm_focus_records', JSON.stringify(savedRecords))

      vi.resetModules()
      const module = await import('@/composables/focus/useRecords.js')
      module._internal.resetForTesting()

      const { records } = module.useRecords()

      expect(records.value).toHaveLength(2)
      expect(records.value[0].id).toBe('saved-1')
    })
  })

  describe('addRecord', () => {
    it('应该添加新记录', () => {
      const { records, addRecord } = useRecords()

      const result = addRecord({
        mode: FocusMode.FOCUS,
        duration: 25 * 60,
        elapsed: 25 * 60,
        completionType: CompletionType.COMPLETED
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.id).toBeDefined()
      expect(records.value).toHaveLength(1)
    })

    it('应该自动生成 UUID 格式的 ID', () => {
      const { addRecord } = useRecords()

      const result = addRecord({
        mode: FocusMode.FOCUS,
        duration: 25 * 60
      })

      // UUID v4 格式
      expect(result.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('应该使用提供的 ID', () => {
      const { addRecord } = useRecords()

      const result = addRecord({
        id: 'custom-id',
        mode: FocusMode.FOCUS
      })

      expect(result.data.id).toBe('custom-id')
    })

    it('应该持久化到 localStorage', () => {
      const { addRecord } = useRecords()

      addRecord({ mode: FocusMode.FOCUS })

      const saved = JSON.parse(localStorage.getItem('swm_focus_records'))
      expect(saved).toHaveLength(1)
    })

    it('无效数据应该返回错误', () => {
      const { addRecord } = useRecords()

      const result = addRecord(null)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid record data')
    })
  })

  describe('getRecord', () => {
    it('应该获取指定记录', () => {
      const { addRecord, getRecord } = useRecords()

      addRecord({ id: 'test-id', mode: FocusMode.FOCUS })

      const result = getRecord('test-id')

      expect(result.success).toBe(true)
      expect(result.data.id).toBe('test-id')
    })

    it('不存在的记录应该返回错误', () => {
      const { getRecord } = useRecords()

      const result = getRecord('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Record not found')
    })
  })

  describe('updateRecord', () => {
    it('应该更新记录', () => {
      const { addRecord, updateRecord, getRecord } = useRecords()

      addRecord({ id: 'test-id', mode: FocusMode.FOCUS, elapsed: 10 })

      const result = updateRecord('test-id', { elapsed: 20 })

      expect(result.success).toBe(true)
      expect(getRecord('test-id').data.elapsed).toBe(20)
    })

    it('不应该覆盖 ID', () => {
      const { addRecord, updateRecord, getRecord } = useRecords()

      addRecord({ id: 'original-id', mode: FocusMode.FOCUS })

      updateRecord('original-id', { id: 'new-id' })

      expect(getRecord('original-id').success).toBe(true)
    })

    it('不存在的记录应该返回错误', () => {
      const { updateRecord } = useRecords()

      const result = updateRecord('non-existent', { elapsed: 20 })

      expect(result.success).toBe(false)
    })
  })

  describe('deleteRecord', () => {
    it('应该删除记录', () => {
      const { addRecord, deleteRecord, records } = useRecords()

      addRecord({ id: 'test-id', mode: FocusMode.FOCUS })
      expect(records.value).toHaveLength(1)

      const result = deleteRecord('test-id')

      expect(result.success).toBe(true)
      expect(records.value).toHaveLength(0)
    })

    it('不存在的记录应该返回错误', () => {
      const { deleteRecord } = useRecords()

      const result = deleteRecord('non-existent')

      expect(result.success).toBe(false)
    })
  })

  describe('queryRecords', () => {
    beforeEach(() => {
      const { addRecord } = useRecords()

      // 添加测试数据
      const now = Date.now()
      addRecord({
        id: '1',
        mode: FocusMode.FOCUS,
        startTime: now - 3600000,
        completionType: CompletionType.COMPLETED
      })
      addRecord({
        id: '2',
        mode: FocusMode.SHORT_BREAK,
        startTime: now - 1800000,
        completionType: CompletionType.COMPLETED
      })
      addRecord({
        id: '3',
        mode: FocusMode.FOCUS,
        startTime: now - 900000,
        completionType: CompletionType.CANCELLED
      })
    })

    it('应该返回所有记录', () => {
      const { queryRecords } = useRecords()

      const result = queryRecords()

      expect(result.success).toBe(true)
      expect(result.total).toBe(3)
    })

    it('应该按模式过滤', () => {
      const { queryRecords } = useRecords()

      const result = queryRecords({ mode: FocusMode.FOCUS })

      expect(result.total).toBe(2)
    })

    it('应该按完成类型过滤', () => {
      const { queryRecords } = useRecords()

      const result = queryRecords({ completionType: CompletionType.COMPLETED })

      expect(result.total).toBe(2)
    })

    it('应该支持分页', () => {
      const { queryRecords } = useRecords()

      const result = queryRecords({ limit: 2, offset: 0 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(3)
    })

    it('应该支持排序', () => {
      const { queryRecords } = useRecords()

      const descResult = queryRecords({ sortOrder: 'desc' })
      const ascResult = queryRecords({ sortOrder: 'asc' })

      expect(descResult.data[0].startTime).toBeGreaterThan(descResult.data[2].startTime)
      expect(ascResult.data[0].startTime).toBeLessThan(ascResult.data[2].startTime)
    })
  })

  describe('getRecordsByDate', () => {
    it('应该返回指定日期的记录', () => {
      const { addRecord, getRecordsByDate } = useRecords()

      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      addRecord(createRecordForDate(today, { id: 'today-1' }))
      addRecord(createRecordForDate(yesterday, { id: 'yesterday-1' }))

      const result = getRecordsByDate(today)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('today-1')
    })
  })

  describe('getRecordsByDateRange', () => {
    it('应该返回日期范围内的记录', () => {
      const { addRecord, getRecordsByDateRange } = useRecords()

      const now = new Date()
      const twoDaysAgo = new Date(now)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const threeDaysAgo = new Date(now)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      addRecord(createRecordForDate(now, { id: 'now' }))
      addRecord(createRecordForDate(twoDaysAgo, { id: 'two-days-ago' }))
      addRecord(createRecordForDate(threeDaysAgo, { id: 'three-days-ago' }))

      const result = getRecordsByDateRange(twoDaysAgo, now)

      expect(result.data).toHaveLength(2)
    })
  })

  describe('clearRecords', () => {
    it('应该清除所有记录', () => {
      const { addRecord, clearRecords, records } = useRecords()

      addRecord({ mode: FocusMode.FOCUS })
      addRecord({ mode: FocusMode.FOCUS })
      expect(records.value).toHaveLength(2)

      const result = clearRecords()

      expect(result.success).toBe(true)
      expect(records.value).toHaveLength(0)
      expect(localStorage.getItem('swm_focus_records')).toBeNull()
    })
  })

  describe('importRecords', () => {
    it('应该导入记录（合并模式）', () => {
      const { addRecord, importRecords, records } = useRecords()

      addRecord({ id: 'existing', mode: FocusMode.FOCUS })

      const result = importRecords(
        [createFocusRecord({ id: 'new-1' }), createFocusRecord({ id: 'new-2' })],
        { merge: true }
      )

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(records.value).toHaveLength(3)
    })

    it('应该跳过已存在的 ID（合并模式）', () => {
      const { addRecord, importRecords, records } = useRecords()

      addRecord({ id: 'existing', mode: FocusMode.FOCUS })

      const result = importRecords(
        [createFocusRecord({ id: 'existing' }), createFocusRecord({ id: 'new' })],
        { merge: true }
      )

      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
      expect(records.value).toHaveLength(2)
    })

    it('应该替换所有记录（替换模式）', () => {
      const { addRecord, importRecords, records } = useRecords()

      addRecord({ id: 'existing', mode: FocusMode.FOCUS })

      const result = importRecords([createFocusRecord({ id: 'new' })], { merge: false })

      expect(result.imported).toBe(1)
      expect(records.value).toHaveLength(1)
      expect(records.value[0].id).toBe('new')
    })

    it('无效格式应该返回错误', () => {
      const { importRecords } = useRecords()

      const result = importRecords('invalid')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid records format')
    })
  })

  describe('getAllRecords', () => {
    it('应该返回所有记录的副本', () => {
      const { addRecord, getAllRecords, records } = useRecords()

      addRecord({ id: '1', mode: FocusMode.FOCUS })
      addRecord({ id: '2', mode: FocusMode.FOCUS })

      const all = getAllRecords()

      expect(all).toHaveLength(2)
      expect(all).not.toBe(records.value) // 应该是副本
    })
  })
})
