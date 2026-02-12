import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock 依赖
vi.mock('@/services/dataSync.js', () => ({
  updateData: vi.fn(),
  getData: vi.fn(),
  deleteData: vi.fn(),
  hasData: vi.fn()
}))

vi.mock('@/utils/authStorage.js', () => ({
  getAccessToken: vi.fn(() => null),
  hasValidAuth: vi.fn(() => false)
}))

vi.mock('@/utils/syncConflictResolver.js', () => ({
  resolveConflict: vi.fn((type, local, server) => server)
}))

let dataSyncService, authStorage, conflictResolver, useDataSync

beforeEach(async () => {
  vi.resetModules()

  dataSyncService = await import('@/services/dataSync.js')
  authStorage = await import('@/utils/authStorage.js')
  conflictResolver = await import('@/utils/syncConflictResolver.js')
  const mod = await import('@/composables/useDataSync.js')
  useDataSync = mod.useDataSync
})

describe('useDataSync', () => {
  describe('初始状态', () => {
    it('syncStatus 为空对象', () => {
      const { syncStatus } = useDataSync()
      expect(syncStatus.value).toEqual({})
    })

    it('lastSyncTime 为 null', () => {
      const { lastSyncTime } = useDataSync()
      expect(lastSyncTime.value).toBeNull()
    })

    it('isSyncing 为 false', () => {
      const { isSyncing } = useDataSync()
      expect(isSyncing.value).toBe(false)
    })

    it('pendingChanges 为空数组', () => {
      const { pendingChanges } = useDataSync()
      expect(pendingChanges.value).toEqual([])
    })

    it('error 为 null', () => {
      const { error } = useDataSync()
      expect(error.value).toBeNull()
    })
  })

  describe('initialize', () => {
    it('恢复队列和同步时间', () => {
      // localStorage 中预设数据
      const queue = [{ id: '1', type: 'focus_records', data: {}, timestamp: 1000 }]
      localStorage.setItem('swm_sync_queue', JSON.stringify(queue))
      localStorage.setItem('swm_last_sync_time', JSON.stringify(12345))

      const { initialize, pendingChanges, lastSyncTime } = useDataSync()
      initialize()

      expect(pendingChanges.value).toEqual(queue)
      expect(lastSyncTime.value).toBe(12345)
    })

    it('初始化各 dataType 的同步状态', () => {
      const { initialize, syncStatus } = useDataSync()
      initialize()

      expect(syncStatus.value).toHaveProperty('focus_records')
      expect(syncStatus.value).toHaveProperty('focus_settings')
      expect(syncStatus.value).toHaveProperty('playlists')
      expect(syncStatus.value).toHaveProperty('user_settings')
      expect(syncStatus.value).toHaveProperty('share_config')
    })
  })

  describe('uploadData', () => {
    it('已登录时调用 updateData 并更新状态', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.updateData.mockResolvedValue({ success: true, version: 2 })

      const { uploadData, syncStatus } = useDataSync()
      const result = await uploadData('focus_records', { records: [] })

      expect(dataSyncService.updateData).toHaveBeenCalledWith(
        'token',
        'focus_records',
        { records: [] },
        0
      )
      expect(result.success).toBe(true)
      expect(syncStatus.value.focus_records.synced).toBe(true)
      expect(syncStatus.value.focus_records.version).toBe(2)
    })

    it('未登录时加入队列', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { uploadData, pendingChanges } = useDataSync()
      const result = await uploadData('focus_records', { records: [] })

      expect(result).toBeUndefined()
      expect(pendingChanges.value).toHaveLength(1)
      expect(pendingChanges.value[0].type).toBe('focus_records')
    })

    it('冲突时 resolveConflict 后重试', async () => {
      authStorage.getAccessToken.mockReturnValue('token')

      const conflictError = new Error('Conflict')
      conflictError.code = 'CONFLICT_ERROR'
      conflictError.details = {
        conflict: true,
        serverData: { records: [1] },
        serverVersion: 3
      }

      dataSyncService.updateData
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({ success: true, version: 4 })

      conflictResolver.resolveConflict.mockReturnValue({ records: [1, 2] })

      const { uploadData } = useDataSync()
      const result = await uploadData('focus_records', { records: [2] })

      expect(conflictResolver.resolveConflict).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('其他错误加入队列并抛出', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.updateData.mockRejectedValue(new Error('Server error'))

      const { uploadData, pendingChanges, error } = useDataSync()
      await expect(uploadData('focus_records', {})).rejects.toThrow('Server error')

      expect(pendingChanges.value).toHaveLength(1)
      expect(error.value).toBeDefined()
    })

    it('成功后移除同类型队列项', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { uploadData, queueChange, pendingChanges } = useDataSync()

      // 先加入队列
      queueChange('focus_records', { old: true })
      expect(pendingChanges.value).toHaveLength(1)

      // 登录后上传成功
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.updateData.mockResolvedValue({ success: true, version: 1 })

      await uploadData('focus_records', { new: true })
      expect(pendingChanges.value.filter((c) => c.type === 'focus_records')).toHaveLength(0)
    })
  })

  describe('downloadData', () => {
    it('下载并保存数据', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.getData.mockResolvedValue({
        type: 'focus_records',
        data: { records: [1] },
        version: 5
      })

      const { downloadData } = useDataSync()
      const result = await downloadData('focus_records')

      expect(result).toEqual({ records: [1] })
      expect(dataSyncService.getData).toHaveBeenCalledWith('token', 'focus_records')
    })

    it('未登录时抛错', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { downloadData } = useDataSync()
      await expect(downloadData('focus_records')).rejects.toThrow('未登录')
    })

    it('服务器 null 返回本地数据', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.getData.mockResolvedValue({
        type: 'focus_records',
        data: null,
        version: 0
      })

      localStorage.setItem('swm_focus_records', JSON.stringify({ local: true }))

      const { downloadData } = useDataSync()
      const result = await downloadData('focus_records')

      expect(result).toEqual({ local: true })
    })

    it('版本不同时合并', async () => {
      authStorage.getAccessToken.mockReturnValue('token')

      // 设置本地版本为 1
      localStorage.setItem('swm_sync_version_focus_records', JSON.stringify('1'))
      localStorage.setItem('swm_focus_records', JSON.stringify({ local: true }))

      dataSyncService.getData.mockResolvedValue({
        type: 'focus_records',
        data: { server: true },
        version: 3
      })

      conflictResolver.resolveConflict.mockReturnValue({ merged: true })

      const { downloadData } = useDataSync()
      await downloadData('focus_records')

      expect(conflictResolver.resolveConflict).toHaveBeenCalledWith(
        'focus_records',
        { local: true },
        { server: true },
        1,
        3
      )
    })

    it('版本相同直接用服务器数据', async () => {
      authStorage.getAccessToken.mockReturnValue('token')

      localStorage.setItem('swm_sync_version_focus_records', JSON.stringify('5'))
      localStorage.setItem('swm_focus_records', JSON.stringify({ local: true }))

      dataSyncService.getData.mockResolvedValue({
        type: 'focus_records',
        data: { server: true },
        version: 5
      })

      const { downloadData } = useDataSync()
      await downloadData('focus_records')

      // 版本相同，不调用 resolveConflict
      expect(conflictResolver.resolveConflict).not.toHaveBeenCalled()
    })
  })

  describe('queueChange', () => {
    it('加入队列并持久化', () => {
      const { queueChange, pendingChanges } = useDataSync()
      queueChange('focus_records', { test: true })

      expect(pendingChanges.value).toHaveLength(1)
      expect(pendingChanges.value[0].type).toBe('focus_records')
      expect(pendingChanges.value[0].data).toEqual({ test: true })

      const saved = JSON.parse(localStorage.getItem('swm_sync_queue'))
      expect(saved).toHaveLength(1)
    })

    it('替换同类型旧变更', () => {
      const { queueChange, pendingChanges } = useDataSync()
      queueChange('focus_records', { v: 1 })
      queueChange('focus_records', { v: 2 })

      expect(pendingChanges.value).toHaveLength(1)
      expect(pendingChanges.value[0].data).toEqual({ v: 2 })
    })
  })

  describe('syncChanges', () => {
    it('空队列直接返回', async () => {
      const { syncChanges } = useDataSync()
      await syncChanges()
      expect(dataSyncService.updateData).not.toHaveBeenCalled()
    })

    it('未登录时抛错', async () => {
      authStorage.getAccessToken.mockReturnValue(null)

      const { queueChange, syncChanges } = useDataSync()
      queueChange('focus_records', {})

      // syncChanges 检查 accessToken
      await expect(syncChanges()).rejects.toThrow('未登录')
    })

    it('逐个上传队列项', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.updateData.mockResolvedValue({ success: true, version: 1 })

      const { queueChange, syncChanges, isSyncing } = useDataSync()
      queueChange('focus_records', { a: 1 })
      queueChange('focus_settings', { b: 2 })

      await syncChanges()

      expect(dataSyncService.updateData).toHaveBeenCalledTimes(2)
      expect(isSyncing.value).toBe(false)
    })

    it('单个失败不影响其他', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.updateData
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ success: true, version: 1 })

      const { queueChange, syncChanges } = useDataSync()
      queueChange('focus_records', {})
      queueChange('focus_settings', {})

      // 不应抛出
      await syncChanges()
      expect(dataSyncService.updateData).toHaveBeenCalledTimes(2)
    })
  })

  describe('triggerSync', () => {
    it('未登录时抛错', async () => {
      authStorage.hasValidAuth.mockReturnValue(false)

      const { triggerSync } = useDataSync()
      await expect(triggerSync()).rejects.toThrow('未登录')
    })
  })

  describe('计算属性', () => {
    it('hasPendingChanges 反映队列状态', () => {
      const { queueChange, hasPendingChanges } = useDataSync()
      expect(hasPendingChanges.value).toBe(false)

      queueChange('focus_records', {})
      expect(hasPendingChanges.value).toBe(true)
    })
  })

  describe('clearError', () => {
    it('清除错误状态', async () => {
      authStorage.getAccessToken.mockReturnValue('token')
      dataSyncService.updateData.mockRejectedValue(new Error('fail'))

      const { uploadData, error, clearError } = useDataSync()
      await expect(uploadData('focus_records', {})).rejects.toThrow()

      expect(error.value).toBeDefined()
      clearError()
      expect(error.value).toBeNull()
    })
  })
})
