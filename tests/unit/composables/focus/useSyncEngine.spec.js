import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/authStorage.js', () => ({
  getAccessToken: vi.fn(() => 'test-token'),
  hasValidAuth: vi.fn(() => true)
}))

vi.mock('@/composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: { value: true }
  }))
}))

vi.mock('@/utils/syncConflictResolver.js', () => ({
  mergeFocusRecords: vi.fn((local, server) => [...local, ...server])
}))

let useSyncEngine, _internal, generateUUID, authStorage, useAuth, mergeFocusRecords

beforeEach(async () => {
  vi.resetModules()
  globalThis.fetch = vi.fn()

  authStorage = await import('@/utils/authStorage.js')
  const authMod = await import('@/composables/useAuth.js')
  useAuth = authMod.useAuth
  const conflictMod = await import('@/utils/syncConflictResolver.js')
  mergeFocusRecords = conflictMod.mergeFocusRecords

  const mod = await import('@/composables/focus/useSyncEngine.js')
  useSyncEngine = mod.useSyncEngine
  _internal = mod._internal
  generateUUID = mod.generateUUID

  _internal.resetForTesting()

  // 显式重置 mock 默认值
  authStorage.getAccessToken.mockReturnValue('test-token')
  authStorage.hasValidAuth.mockReturnValue(true)
  useAuth.mockReturnValue({ isAuthenticated: { value: true } })
  mergeFocusRecords.mockImplementation((local, server) => [...(local || []), ...(server || [])])
})

describe('useSyncEngine', () => {
  describe('初始状态', () => {
    it('syncEnabled 为 true', () => {
      const { syncEnabled } = useSyncEngine()
      expect(syncEnabled.value).toBe(true)
    })

    it('isSyncing 为 false', () => {
      const { isSyncing } = useSyncEngine()
      expect(isSyncing.value).toBe(false)
    })

    it('lastSyncTime 为 0', () => {
      const { lastSyncTime } = useSyncEngine()
      expect(lastSyncTime.value).toBe(0)
    })

    it('queueLength 为 0', () => {
      const { queueLength } = useSyncEngine()
      expect(queueLength.value).toBe(0)
    })

    it('protocolMismatch 为 false', () => {
      const { protocolMismatch } = useSyncEngine()
      expect(protocolMismatch.value).toBe(false)
    })
  })

  describe('generateUUID', () => {
    it('crypto.randomUUID 可用时使用它', () => {
      const original = crypto.randomUUID
      crypto.randomUUID = vi.fn(() => 'mock-uuid')

      expect(generateUUID()).toBe('mock-uuid')
      crypto.randomUUID = original
    })

    it('不可用时回退到手动生成', () => {
      const original = crypto.randomUUID
      crypto.randomUUID = undefined

      const uuid = generateUUID()
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)

      crypto.randomUUID = original
    })
  })

  describe('queueChange', () => {
    it('添加变更到队列', () => {
      const { queueChange, queueLength } = useSyncEngine()
      queueChange('add', { id: 'r1', startTime: 1000 })

      expect(queueLength.value).toBe(1)
    })

    it('同 ID 变更去重替换', () => {
      const { queueChange, queueLength } = useSyncEngine()
      queueChange('add', { id: 'r1', startTime: 1000 })
      queueChange('update', { id: 'r1', startTime: 2000 })

      expect(queueLength.value).toBe(1)
    })

    it('delete 操作优先级最高', () => {
      const { queueChange, queueLength } = useSyncEngine()
      queueChange('delete', { id: 'r1' })
      queueChange('update', { id: 'r1', startTime: 2000 })

      // delete 不会被 update 覆盖
      expect(queueLength.value).toBe(1)
    })

    it('不同 ID 独立入队', () => {
      const { queueChange, queueLength } = useSyncEngine()
      queueChange('add', { id: 'r1' })
      queueChange('add', { id: 'r2' })

      expect(queueLength.value).toBe(2)
    })
  })

  describe('clearQueue', () => {
    it('清空队列', () => {
      const { queueChange, clearQueue, queueLength } = useSyncEngine()
      queueChange('add', { id: 'r1' })
      expect(queueLength.value).toBe(1)

      clearQueue()
      expect(queueLength.value).toBe(0)
    })
  })

  describe('checkProtocol', () => {
    it('版本兼容返回 compatible: true', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Sync-Protocol-Version': '1' })
      })

      const { checkProtocol } = useSyncEngine()
      // checkProtocol 是内部方法，通过 useSyncEngine 返回
      const result = await checkProtocol()
      expect(result.compatible).toBe(true)
    })

    it('版本不兼容返回 compatible: false', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Sync-Protocol-Version': '0' })
      })

      const { checkProtocol, syncEnabled, protocolMismatch } = useSyncEngine()
      const result = await checkProtocol()

      expect(result.compatible).toBe(false)
      expect(protocolMismatch.value).toBe(true)
      expect(syncEnabled.value).toBe(false)
    })

    it('网络错误时假设兼容', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Network error'))

      const { checkProtocol } = useSyncEngine()
      const result = await checkProtocol()
      expect(result.compatible).toBe(true)
    })
  })

  describe('sync', () => {
    it('未认证时返回 success: false', async () => {
      useAuth.mockReturnValue({ isAuthenticated: { value: false } })

      const { sync } = useSyncEngine()
      const result = await sync()
      expect(result.success).toBe(false)
    })

    it('协议不兼容时返回 protocolMismatch', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Sync-Protocol-Version': '0' })
      })

      const { sync } = useSyncEngine()
      const result = await sync()
      expect(result.success).toBe(false)
      expect(result.protocolMismatch).toBe(true)
    })

    it('版本一致且无本地变更时跳过', async () => {
      // checkProtocol 返回兼容
      globalThis.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({})
        })
        // fetchServerVersion 返回版本 0（与初始 serverVersion 一致）
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ version: 0 })
        })

      const { sync } = useSyncEngine()
      const result = await sync()
      expect(result.success).toBe(true)
    })

    it('完整同步流程：下载→合并→上传', async () => {
      localStorage.setItem('swm_focus_records', JSON.stringify([{ id: 'local-1' }]))

      // checkProtocol
      globalThis.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({})
        })
        // fetchServerVersion - 版本不同触发同步
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ version: 2 })
        })
        // downloadFullData
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [{ id: 'server-1' }], version: 2 })
        })
        // uploadFullData
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true, version: 3 })
        })

      mergeFocusRecords.mockReturnValue([{ id: 'local-1' }, { id: 'server-1' }])

      const { sync, queueChange } = useSyncEngine()
      queueChange('add', { id: 'local-1' })

      const result = await sync()

      expect(result.success).toBe(true)
      expect(result.merged).toBe(true)
      expect(mergeFocusRecords).toHaveBeenCalled()
    })

    it('isSyncing 在同步期间为 true，结束后为 false', async () => {
      globalThis.fetch
        .mockResolvedValueOnce({ ok: true, headers: new Headers({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ version: 0 })
        })

      const { sync, isSyncing } = useSyncEngine()
      expect(isSyncing.value).toBe(false)

      await sync()
      expect(isSyncing.value).toBe(false)
    })
  })

  describe('processQueue', () => {
    it('空队列返回 processed: 0', async () => {
      const { processQueue } = useSyncEngine()
      const result = await processQueue()
      expect(result.processed).toBe(0)
    })

    it('未认证时返回 success: false', async () => {
      useAuth.mockReturnValue({ isAuthenticated: { value: false } })

      const { processQueue, queueChange } = useSyncEngine()
      queueChange('add', { id: 'r1' })

      const result = await processQueue()
      expect(result.success).toBe(false)
    })
  })

  describe('setSyncEnabled', () => {
    it('正常切换同步开关', () => {
      const { setSyncEnabled, syncEnabled } = useSyncEngine()
      setSyncEnabled(false)
      expect(syncEnabled.value).toBe(false)

      setSyncEnabled(true)
      expect(syncEnabled.value).toBe(true)
    })

    it('协议不兼容时无法启用', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Sync-Protocol-Version': '0' })
      })

      const { checkProtocol, setSyncEnabled, syncEnabled } = useSyncEngine()
      await checkProtocol()

      setSyncEnabled(true)
      expect(syncEnabled.value).toBe(false)
    })
  })
})
