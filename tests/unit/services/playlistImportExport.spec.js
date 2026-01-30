/**
 * src/services/playlistImportExport.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  exportPlaylists,
  downloadPlaylistsAsFile,
  parseImportJSON,
  importFromFile,
  mergePlaylists,
  selectAndImportFile
} from '@/services/playlistImportExport.js'
import { PLAYLIST_CONFIG } from '@/config/constants.js'
import { ErrorTypes } from '@/types/playlist.js'
import {
  neteasePlaylist,
  onlineCollection,
  createPlaylistRef,
  createCollection,
  createExportData
} from '../../setup/fixtures/playlists.js'
import { localManagedSongs, onlineSongs } from '../../setup/fixtures/songs.js'

describe('playlistImportExport.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportPlaylists', () => {
    it('应该成功导出 playlist 模式歌单', () => {
      const result = exportPlaylists([neteasePlaylist])

      expect(result.success).toBe(true)
      expect(result.data.version).toBe(PLAYLIST_CONFIG.EXPORT_VERSION)
      expect(result.data.playlists).toHaveLength(1)
      expect(result.data.playlists[0].mode).toBe('playlist')
      expect(result.data.exportedAt).toBeDefined()
    })

    it('应该成功导出 collection 模式歌单', () => {
      const result = exportPlaylists([onlineCollection])

      expect(result.success).toBe(true)
      expect(result.data.playlists[0].mode).toBe('collection')
      expect(result.data.playlists[0].songs).toBeDefined()
    })

    it('默认应该过滤本地歌曲', () => {
      const mixedCollection = createCollection(
        [...onlineSongs.slice(0, 1), ...localManagedSongs.slice(0, 1)],
        { name: '混合集合' }
      )

      const result = exportPlaylists([mixedCollection])

      expect(result.success).toBe(true)
      expect(result.data.playlists[0].songs).toHaveLength(1)
      expect(result.data.playlists[0].songs[0].type).toBe('online')
    })

    it('includeLocalSongs=true 时应该包含本地歌曲', () => {
      const mixedCollection = createCollection(
        [...onlineSongs.slice(0, 1), ...localManagedSongs.slice(0, 1)],
        { name: '混合集合' }
      )

      const result = exportPlaylists([mixedCollection], { includeLocalSongs: true })

      expect(result.success).toBe(true)
      expect(result.data.playlists[0].songs).toHaveLength(2)
    })

    it('应该正确导出多个歌单', () => {
      const result = exportPlaylists([neteasePlaylist, onlineCollection])

      expect(result.success).toBe(true)
      expect(result.data.playlists).toHaveLength(2)
    })

    it('空数组应该成功导出', () => {
      const result = exportPlaylists([])

      expect(result.success).toBe(true)
      expect(result.data.playlists).toHaveLength(0)
    })
  })

  describe('downloadPlaylistsAsFile', () => {
    let mockCreateElement
    let mockLink
    let originalCreateObjectURL
    let originalRevokeObjectURL

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

      originalCreateObjectURL = URL.createObjectURL
      originalRevokeObjectURL = URL.revokeObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:test-url')
      URL.revokeObjectURL = vi.fn()
    })

    afterEach(() => {
      mockCreateElement.mockRestore()
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    })

    it('应该创建下载链接并触发下载', () => {
      const result = downloadPlaylistsAsFile([neteasePlaylist])

      expect(result.success).toBe(true)
      expect(mockLink.click).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('应该使用自定义文件名', () => {
      downloadPlaylistsAsFile([neteasePlaylist], 'custom-name.json')

      expect(mockLink.download).toBe('custom-name.json')
    })

    it('没有指定文件名时应该使用默认文件名', () => {
      downloadPlaylistsAsFile([neteasePlaylist])

      expect(mockLink.download).toMatch(/^swm-playlists-\d{4}-\d{2}-\d{2}\.json$/)
    })
  })

  describe('parseImportJSON', () => {
    it('应该成功解析有效的导出数据', () => {
      const exportData = createExportData([neteasePlaylist])
      const json = JSON.stringify(exportData)

      const result = parseImportJSON(json)

      expect(result.success).toBe(true)
      expect(result.data.playlists).toHaveLength(1)
    })

    it('无效 JSON 应该返回 PARSE_ERROR', () => {
      const result = parseImportJSON('not valid json {')

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.PARSE_ERROR)
    })

    it('缺少 version 应该返回 INVALID_DATA', () => {
      const result = parseImportJSON(JSON.stringify({ playlists: [] }))

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.INVALID_DATA)
    })

    it('缺少 playlists 应该返回 INVALID_DATA', () => {
      const result = parseImportJSON(JSON.stringify({ version: 1 }))

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.INVALID_DATA)
    })

    it('版本号过高应该返回 IMPORT_VERSION_MISMATCH', () => {
      const result = parseImportJSON(
        JSON.stringify({
          version: PLAYLIST_CONFIG.EXPORT_VERSION + 1,
          playlists: []
        })
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.IMPORT_VERSION_MISMATCH)
    })

    it('无效的歌单数据应该返回 INVALID_DATA', () => {
      const result = parseImportJSON(
        JSON.stringify({
          version: 1,
          playlists: [{ invalid: 'data' }]
        })
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.INVALID_DATA)
    })

    it('playlist 模式缺少 source 应该返回 INVALID_DATA', () => {
      const result = parseImportJSON(
        JSON.stringify({
          version: 1,
          playlists: [{ name: 'Test', mode: 'playlist', sourceId: '123' }]
        })
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.INVALID_DATA)
    })

    it('collection 模式缺少 songs 应该返回 INVALID_DATA', () => {
      const result = parseImportJSON(
        JSON.stringify({
          version: 1,
          playlists: [{ name: 'Test', mode: 'collection' }]
        })
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.INVALID_DATA)
    })

    it('应该接受有效的 playlist 模式', () => {
      const result = parseImportJSON(
        JSON.stringify({
          version: 1,
          playlists: [{ name: 'Test', mode: 'playlist', source: 'netease', sourceId: '123' }]
        })
      )

      expect(result.success).toBe(true)
    })

    it('应该接受有效的 collection 模式', () => {
      const result = parseImportJSON(
        JSON.stringify({
          version: 1,
          playlists: [{ name: 'Test', mode: 'collection', songs: [] }]
        })
      )

      expect(result.success).toBe(true)
    })
  })

  describe('importFromFile', () => {
    it('应该成功从文件导入', async () => {
      const exportData = createExportData([neteasePlaylist])
      const file = new File([JSON.stringify(exportData)], 'test.json', {
        type: 'application/json'
      })

      const result = await importFromFile(file)

      expect(result.success).toBe(true)
      expect(result.data.playlists).toHaveLength(1)
    })

    it('无效文件应该返回错误', async () => {
      const file = new File(['invalid json'], 'test.json', {
        type: 'application/json'
      })

      const result = await importFromFile(file)

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.PARSE_ERROR)
    })
  })

  describe('selectAndImportFile', () => {
    it('应该成功选择文件并解析', async () => {
      const exportData = createExportData([neteasePlaylist])
      const file = new File([JSON.stringify(exportData)], 'test.json', {
        type: 'application/json'
      })

      const mockInput = {
        type: '',
        accept: '',
        onchange: null,
        oncancel: null,
        click: vi.fn()
      }
      mockInput.click.mockImplementation(() => {
        Object.defineProperty(mockInput, 'files', { value: [file], configurable: true })
        mockInput.onchange({ target: mockInput })
      })

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      const result = await selectAndImportFile()

      expect(result.success).toBe(true)
      expect(result.data.playlists).toHaveLength(1)
    })

    it('用户取消选择时应该返回 CANCELLED 错误', async () => {
      const mockInput = {
        type: '',
        accept: '',
        onchange: null,
        oncancel: null,
        click: vi.fn()
      }
      mockInput.click.mockImplementation(() => {
        mockInput.oncancel()
      })

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      const result = await selectAndImportFile()

      expect(result.success).toBe(false)
      expect(result.error).toBe('CANCELLED')
    })

    it('未选择文件时应该返回 FILE_NOT_FOUND', async () => {
      const mockInput = {
        type: '',
        accept: '',
        onchange: null,
        oncancel: null,
        click: vi.fn()
      }
      mockInput.click.mockImplementation(() => {
        Object.defineProperty(mockInput, 'files', { value: [], configurable: true })
        mockInput.onchange({ target: mockInput })
      })

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      const result = await selectAndImportFile()

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.FILE_NOT_FOUND)
    })
  })

  describe('mergePlaylists', () => {
    describe('合并模式 (merge)', () => {
      it('应该将导入的歌单添加到现有列表', () => {
        const existing = [createPlaylistRef({ id: 'existing-1', name: 'Existing' })]
        const imported = [createPlaylistRef({ name: 'Imported', sourceId: '999' })]

        const result = mergePlaylists(existing, imported)

        expect(result.success).toBe(true)
        expect(result.playlists).toHaveLength(2)
        expect(result.stats.added).toBe(1)
        expect(result.stats.skipped).toBe(0)
      })

      it('应该跳过重复的 playlist 模式歌单', () => {
        const existing = [createPlaylistRef({ source: 'netease', sourceId: '123' })]
        const imported = [createPlaylistRef({ source: 'netease', sourceId: '123' })]

        const result = mergePlaylists(existing, imported)

        expect(result.success).toBe(true)
        expect(result.playlists).toHaveLength(1)
        expect(result.stats.skipped).toBe(1)
      })

      it('应该跳过重复的 collection 模式歌单（通过名称判断）', () => {
        const existing = [createCollection([], { name: 'My Collection' })]
        const imported = [createCollection([], { name: 'My Collection' })]

        const result = mergePlaylists(existing, imported)

        expect(result.success).toBe(true)
        expect(result.playlists).toHaveLength(1)
        expect(result.stats.skipped).toBe(1)
      })

      it('skipDuplicates=false 时不应该检查重复', () => {
        const existing = [createPlaylistRef({ source: 'netease', sourceId: '123' })]
        const imported = [createPlaylistRef({ source: 'netease', sourceId: '123' })]

        const result = mergePlaylists(existing, imported, { skipDuplicates: false })

        expect(result.success).toBe(true)
        expect(result.playlists).toHaveLength(2)
        expect(result.stats.added).toBe(1)
      })

      it('应该为导入的歌单生成新 ID', () => {
        const imported = [createPlaylistRef({ id: 'original-id' })]

        const result = mergePlaylists([], imported)

        expect(result.playlists[0].id).not.toBe('original-id')
      })

      it('应该设置正确的 order', () => {
        const existing = [
          createPlaylistRef({ order: 0 }),
          createPlaylistRef({ order: 1, sourceId: '222' })
        ]
        const imported = [createPlaylistRef({ sourceId: '333' })]

        const result = mergePlaylists(existing, imported)

        expect(result.playlists[2].order).toBe(2)
      })

      it('超过最大歌单数量时应该跳过', () => {
        const existing = Array.from({ length: PLAYLIST_CONFIG.MAX_PLAYLISTS }, (_, i) =>
          createPlaylistRef({ id: `existing-${i}`, sourceId: `${i}` })
        )
        const imported = [createPlaylistRef({ sourceId: 'new' })]

        const result = mergePlaylists(existing, imported)

        expect(result.playlists).toHaveLength(PLAYLIST_CONFIG.MAX_PLAYLISTS)
        expect(result.stats.skipped).toBe(1)
      })
    })

    describe('替换模式 (replace)', () => {
      it('应该完全替换现有歌单', () => {
        const existing = [
          createPlaylistRef({ id: 'old-1', name: 'Old 1' }),
          createPlaylistRef({ id: 'old-2', name: 'Old 2' })
        ]
        const imported = [createPlaylistRef({ name: 'New' })]

        const result = mergePlaylists(existing, imported, { mode: 'replace' })

        expect(result.success).toBe(true)
        expect(result.playlists).toHaveLength(1)
        expect(result.playlists[0].name).toBe('New')
        expect(result.stats.replaced).toBe(2)
        expect(result.stats.added).toBe(1)
      })

      it('应该按导入顺序设置 order', () => {
        const imported = [
          createPlaylistRef({ name: 'First', sourceId: '1' }),
          createPlaylistRef({ name: 'Second', sourceId: '2' }),
          createPlaylistRef({ name: 'Third', sourceId: '3' })
        ]

        const result = mergePlaylists([], imported, { mode: 'replace' })

        expect(result.playlists[0].order).toBe(0)
        expect(result.playlists[1].order).toBe(1)
        expect(result.playlists[2].order).toBe(2)
      })
    })
  })
})
