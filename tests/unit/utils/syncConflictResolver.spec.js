import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('syncConflictResolver', () => {
  let resolver

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    resolver = await import('../../../src/utils/syncConflictResolver.js')
  })

  // --- mergeFocusRecords ---
  describe('mergeFocusRecords', () => {
    it('should merge records by id using LWW on updatedAt', () => {
      const local = [{ id: 'r1', startTime: 100, updatedAt: 300, note: 'local' }]
      const server = [{ id: 'r1', startTime: 100, updatedAt: 200, note: 'server' }]
      const result = resolver.mergeFocusRecords(local, server)
      expect(result.find((r) => r.id === 'r1').note).toBe('local')
    })

    it('should prefer server record when updatedAt is newer', () => {
      const local = [{ id: 'r1', startTime: 100, updatedAt: 200 }]
      const server = [{ id: 'r1', startTime: 100, updatedAt: 500 }]
      const result = resolver.mergeFocusRecords(local, server)
      expect(result.find((r) => r.id === 'r1').updatedAt).toBe(500)
    })

    it('should include records unique to each side', () => {
      const local = [{ id: 'r1', startTime: 300 }]
      const server = [{ id: 'r2', startTime: 200 }]
      const result = resolver.mergeFocusRecords(local, server)
      expect(result).toHaveLength(2)
    })

    it('should sort merged results by startTime descending', () => {
      const local = [{ id: 'r1', startTime: 100 }]
      const server = [{ id: 'r2', startTime: 500 }]
      const result = resolver.mergeFocusRecords(local, server)
      expect(result[0].startTime).toBeGreaterThanOrEqual(result[1].startTime)
    })

    it('should fall back to startTime when updatedAt is missing', () => {
      const local = [{ id: 'r1', startTime: 400 }]
      const server = [{ id: 'r1', startTime: 300 }]
      const result = resolver.mergeFocusRecords(local, server)
      expect(result.find((r) => r.id === 'r1').startTime).toBe(400)
    })

    it('should handle null local input', () => {
      const server = [{ id: 'r1', startTime: 100 }]
      const result = resolver.mergeFocusRecords(null, server)
      expect(result).toHaveLength(1)
    })

    it('should handle null server input', () => {
      const local = [{ id: 'r1', startTime: 100 }]
      const result = resolver.mergeFocusRecords(local, null)
      expect(result).toHaveLength(1)
    })

    it('should handle both inputs null', () => {
      const result = resolver.mergeFocusRecords(null, null)
      expect(result).toEqual([])
    })

    it('should handle non-array inputs gracefully', () => {
      const result = resolver.mergeFocusRecords('bad', 123)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  // --- mergePlaylists ---
  describe('mergePlaylists', () => {
    it('should merge playlists by id with server as base', () => {
      const local = [{ id: 'p1', updatedAt: 500, name: 'local' }]
      const server = [{ id: 'p1', updatedAt: 300, name: 'server' }]
      const result = resolver.mergePlaylists(local, server)
      expect(result.find((p) => p.id === 'p1').name).toBe('local')
    })

    it('should keep server version when server updatedAt is newer', () => {
      const local = [{ id: 'p1', updatedAt: 100, name: 'local' }]
      const server = [{ id: 'p1', updatedAt: 900, name: 'server' }]
      const result = resolver.mergePlaylists(local, server)
      expect(result.find((p) => p.id === 'p1').name).toBe('server')
    })

    it('should include playlists unique to each side', () => {
      const local = [{ id: 'p1', createdAt: 100 }]
      const server = [{ id: 'p2', createdAt: 200 }]
      const result = resolver.mergePlaylists(local, server)
      expect(result).toHaveLength(2)
    })

    it('should sort by createdAt ascending', () => {
      const local = [{ id: 'p1', createdAt: 500 }]
      const server = [{ id: 'p2', createdAt: 100 }]
      const result = resolver.mergePlaylists(local, server)
      expect(result[0].createdAt).toBeLessThanOrEqual(result[1].createdAt)
    })

    it('should handle null inputs', () => {
      expect(resolver.mergePlaylists(null, null)).toEqual([])
      expect(resolver.mergePlaylists(null, [{ id: 'p1' }])).toHaveLength(1)
      expect(resolver.mergePlaylists([{ id: 'p1' }], null)).toHaveLength(1)
    })

    it('should handle non-array inputs', () => {
      const result = resolver.mergePlaylists({}, 42)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  // --- lastWriteWins ---
  describe('lastWriteWins', () => {
    it('should return server data with no conflict when versions are equal', () => {
      const result = resolver.lastWriteWins('localData', 'serverData', 1, 1)
      expect(result.data).toBe('serverData')
      expect(result.source).toBe('server')
      expect(result.hasConflict).toBe(false)
    })

    it('should return local data with conflict when local version is higher', () => {
      const result = resolver.lastWriteWins('localData', 'serverData', 3, 1)
      expect(result.data).toBe('localData')
      expect(result.source).toBe('local')
      expect(result.hasConflict).toBe(true)
    })

    it('should return server data with conflict when server version is higher', () => {
      const result = resolver.lastWriteWins('localData', 'serverData', 1, 5)
      expect(result.data).toBe('serverData')
      expect(result.source).toBe('server')
      expect(result.hasConflict).toBe(true)
    })
  })

  // --- deepMergeObjects ---
  describe('deepMergeObjects', () => {
    it('should merge flat objects preserving all keys', () => {
      const result = resolver.deepMergeObjects({ a: 1 }, { b: 2 })
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should let server overwrite non-object values', () => {
      const result = resolver.deepMergeObjects({ a: 1 }, { a: 99 })
      expect(result.a).toBe(99)
    })

    it('should preserve local-only fields', () => {
      const result = resolver.deepMergeObjects({ localOnly: 'yes', shared: 1 }, { shared: 2 })
      expect(result.localOnly).toBe('yes')
      expect(result.shared).toBe(2)
    })

    it('should recursively merge nested objects', () => {
      const local = { nested: { a: 1, b: 2 } }
      const server = { nested: { b: 99, c: 3 } }
      const result = resolver.deepMergeObjects(local, server)
      expect(result.nested).toEqual({ a: 1, b: 99, c: 3 })
    })

    it('should overwrite arrays with server value', () => {
      const result = resolver.deepMergeObjects({ arr: [1, 2, 3] }, { arr: [4, 5] })
      expect(result.arr).toEqual([4, 5])
    })

    it('should handle null local input', () => {
      const result = resolver.deepMergeObjects(null, { a: 1 })
      expect(result).toEqual({ a: 1 })
    })

    it('should handle null server input', () => {
      const result = resolver.deepMergeObjects({ a: 1 }, null)
      expect(result).toEqual({ a: 1 })
    })

    it('should handle both inputs null', () => {
      const result = resolver.deepMergeObjects(null, null)
      expect(result).toBeNull()
    })
  })

  // --- mergeFocusSettings ---
  describe('mergeFocusSettings', () => {
    it('should return server when no conflict (same version)', () => {
      const result = resolver.mergeFocusSettings({ duration: 25 }, { duration: 30 }, 1, 1)
      expect(result.duration).toBe(30)
    })

    it('should deep merge when there is a conflict', () => {
      const local = { duration: 25, localOnly: true }
      const server = { duration: 30 }
      const result = resolver.mergeFocusSettings(local, server, 2, 1)
      expect(result.localOnly).toBe(true)
    })
  })

  // --- mergeUserSettings ---
  describe('mergeUserSettings', () => {
    it('should return server when no conflict', () => {
      const result = resolver.mergeUserSettings({ theme: 'dark' }, { theme: 'light' }, 1, 1)
      expect(result.theme).toBe('light')
    })

    it('should deep merge on conflict', () => {
      const result = resolver.mergeUserSettings(
        { theme: 'dark', extra: 1 },
        { theme: 'light' },
        3,
        1
      )
      expect(result.extra).toBe(1)
      expect(result.theme).toBeDefined()
    })
  })

  // --- mergeShareConfig ---
  describe('mergeShareConfig', () => {
    it('should return LWW result data directly', () => {
      const result = resolver.mergeShareConfig({ shareId: 'a' }, { shareId: 'b' }, 1, 1)
      expect(result).toEqual({ shareId: 'b' })
    })

    it('should return local data when local version is higher', () => {
      const result = resolver.mergeShareConfig({ shareId: 'local' }, { shareId: 'server' }, 5, 2)
      expect(result).toEqual({ shareId: 'local' })
    })
  })

  // --- resolveConflict ---
  describe('resolveConflict', () => {
    it('should dispatch playlists type to mergePlaylists logic', () => {
      const local = {
        playlists: [{ id: 'p1', createdAt: 100 }],
        currentId: 'p1'
      }
      const server = {
        playlists: [{ id: 'p2', createdAt: 200 }],
        currentId: 'p2'
      }
      const result = resolver.resolveConflict('playlists', local, server, 1, 1)
      expect(result.playlists).toBeDefined()
      expect(Array.isArray(result.playlists)).toBe(true)
    })

    it('should use LWW for unknown data types', () => {
      const result = resolver.resolveConflict('unknownType', 'localVal', 'serverVal', 1, 1)
      expect(result).toBe('serverVal')
    })

    it('should dispatch focusRecords type', () => {
      const local = [{ id: 'r1', startTime: 100 }]
      const server = [{ id: 'r2', startTime: 200 }]
      const result = resolver.resolveConflict('focusRecords', local, server, 1, 1)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  // --- hasDataChanged ---
  describe('hasDataChanged', () => {
    it('should return false for identical objects', () => {
      expect(resolver.hasDataChanged({ a: 1 }, { a: 1 })).toBe(false)
    })

    it('should return true for different objects', () => {
      expect(resolver.hasDataChanged({ a: 1 }, { a: 2 })).toBe(true)
    })

    it('should return false for identical arrays', () => {
      expect(resolver.hasDataChanged([1, 2, 3], [1, 2, 3])).toBe(false)
    })

    it('should return true for different arrays', () => {
      expect(resolver.hasDataChanged([1, 2], [1, 2, 3])).toBe(true)
    })

    it('should return false for identical primitives', () => {
      expect(resolver.hasDataChanged('hello', 'hello')).toBe(false)
    })

    it('should return true for different primitives', () => {
      expect(resolver.hasDataChanged('hello', 'world')).toBe(true)
    })

    it('should return true on circular reference (error case)', () => {
      const obj = {}
      obj.self = obj
      expect(resolver.hasDataChanged(obj, {})).toBe(true)
    })
  })
})
