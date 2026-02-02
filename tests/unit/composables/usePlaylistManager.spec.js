/**
 * src/composables/usePlaylistManager.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { STORAGE_KEYS, PLAYLIST_CONFIG } from '@/config/constants.js'
import { ErrorTypes } from '@/types/playlist.js'
import { createSong } from '../../setup/fixtures/songs.js'
import { createPlaylistRef, createCollection } from '../../setup/fixtures/playlists.js'

describe('usePlaylistManager.js', () => {
  // 由于 usePlaylistManager 使用模块级单例，每个测试需要重置模块
  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const getManager = async () => {
    const { usePlaylistManager } = await import('@/composables/usePlaylistManager.js')
    return usePlaylistManager()
  }

  describe('initialize', () => {
    it('应该从 localStorage 加载歌单数据', async () => {
      const playlists = [createPlaylistRef({ id: 'test-1', name: 'Test Playlist' })]
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))
      localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYLIST, JSON.stringify('test-1'))

      const manager = await getManager()
      const result = manager.initialize()

      expect(result.success).toBe(true)
      expect(manager.playlists.value).toHaveLength(1)
      expect(manager.currentPlaylistId.value).toBe('test-1')
    })

    it('localStorage 为空时应该创建内置默认歌单', async () => {
      const manager = await getManager()
      manager.initialize()

      // 应该自动创建内置默认歌单
      expect(manager.playlists.value).toHaveLength(1)
      expect(manager.playlists.value[0].id).toBe('builtin_studywithmiku')
      expect(manager.playlists.value[0].name).toBe('Study with Miku')
      expect(manager.defaultPlaylistId.value).toBe('builtin_studywithmiku')
      expect(manager.currentPlaylistId.value).toBe('builtin_studywithmiku')
    })

    it('无效的 currentPlaylistId 应该被清除', async () => {
      // 预设一个有效歌单，避免触发内置歌单创建
      const playlists = [createPlaylistRef({ id: 'valid-id', name: 'Valid' })]
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))
      localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYLIST, JSON.stringify('invalid-id'))

      const manager = await getManager()
      manager.initialize()

      expect(manager.currentPlaylistId.value).toBeNull()
    })

    it('重复初始化应该返回成功但不重新加载', async () => {
      const manager = await getManager()
      manager.initialize()
      const result = manager.initialize()

      expect(result.success).toBe(true)
    })
  })

  describe('createPlaylist', () => {
    it('应该成功创建 playlist 模式歌单', async () => {
      const manager = await getManager()
      manager.initialize()

      const initialCount = manager.playlists.value.length

      const result = manager.createPlaylist({
        name: 'My Playlist',
        mode: 'playlist',
        source: 'netease',
        sourceId: '12345678'
      })

      expect(result.success).toBe(true)
      expect(result.playlist).toBeDefined()
      expect(result.playlist.mode).toBe('playlist')
      expect(result.playlist.source).toBe('netease')
      expect(manager.playlists.value).toHaveLength(initialCount + 1)
    })

    it('应该成功创建 collection 模式歌单', async () => {
      const manager = await getManager()
      manager.initialize()

      const result = manager.createPlaylist({
        name: 'My Collection',
        mode: 'collection',
        songs: [createSong()]
      })

      expect(result.success).toBe(true)
      expect(result.playlist.mode).toBe('collection')
      expect(result.playlist.songs).toHaveLength(1)
    })

    it('应该自动生成 ID', async () => {
      const manager = await getManager()
      manager.initialize()

      const result = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })

      expect(result.playlist.id).toBeDefined()
    })

    it('应该正确设置 order', async () => {
      const manager = await getManager()
      manager.initialize()

      // 内置歌单 order 为 0，新创建的歌单 order 应该递增
      const initialMaxOrder = manager.playlists.value.reduce((max, p) => Math.max(max, p.order), -1)

      manager.createPlaylist({ name: 'First', mode: 'playlist', source: 'netease', sourceId: '1' })
      manager.createPlaylist({ name: 'Second', mode: 'playlist', source: 'netease', sourceId: '2' })

      const newPlaylists = manager.playlists.value.filter((p) => p.id !== 'builtin_studywithmiku')
      expect(newPlaylists[0].order).toBe(initialMaxOrder + 1)
      expect(newPlaylists[1].order).toBe(initialMaxOrder + 2)
    })

    it('达到最大数量限制时应该失败', async () => {
      const playlists = Array.from({ length: PLAYLIST_CONFIG.MAX_PLAYLISTS }, (_, i) =>
        createPlaylistRef({ id: `p-${i}`, sourceId: `${i}` })
      )
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))

      const manager = await getManager()
      manager.initialize()

      const result = manager.createPlaylist({
        name: 'One More',
        mode: 'playlist',
        source: 'netease',
        sourceId: 'new'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.MAX_PLAYLISTS_REACHED)
    })

    it('无效的 mode 应该失败', async () => {
      const manager = await getManager()
      manager.initialize()

      const result = manager.createPlaylist({
        name: 'Test',
        mode: 'invalid'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.INVALID_PLAYLIST_MODE)
    })

    it('应该持久化到 localStorage', async () => {
      const manager = await getManager()
      manager.initialize()

      const initialCount = manager.playlists.value.length

      manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYLISTS))
      expect(stored).toHaveLength(initialCount + 1)
    })
  })

  describe('updatePlaylist', () => {
    it('应该成功更新歌单', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Original',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })

      const result = manager.updatePlaylist(playlist.id, { name: 'Updated' })

      expect(result.success).toBe(true)
      expect(result.playlist.name).toBe('Updated')
    })

    it('不存在的歌单应该失败', async () => {
      const manager = await getManager()
      manager.initialize()

      const result = manager.updatePlaylist('non-existent', { name: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.PLAYLIST_NOT_FOUND)
    })

    it('不应该允许更改 id', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })
      const originalId = playlist.id

      manager.updatePlaylist(playlist.id, { id: 'new-id' })

      const updatedPlaylist = manager.getPlaylist(originalId)
      expect(updatedPlaylist.id).toBe(originalId)
    })

    it('不应该允许更改 mode', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })

      manager.updatePlaylist(playlist.id, { mode: 'collection' })

      expect(manager.playlists.value[0].mode).toBe('playlist')
    })
  })

  describe('deletePlaylist', () => {
    it('应该成功删除歌单', async () => {
      const manager = await getManager()
      manager.initialize()
      const initialCount = manager.playlists.value.length
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })

      const result = await manager.deletePlaylist(playlist.id)

      expect(result.success).toBe(true)
      expect(manager.playlists.value).toHaveLength(initialCount)
    })

    it('不存在的歌单应该失败', async () => {
      const manager = await getManager()
      manager.initialize()

      const result = await manager.deletePlaylist('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorTypes.PLAYLIST_NOT_FOUND)
    })

    it('删除当前歌单时应该清除 currentPlaylistId', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })
      manager.setCurrentPlaylist(playlist.id)

      await manager.deletePlaylist(playlist.id)

      expect(manager.currentPlaylistId.value).toBeNull()
    })

    it('删除默认歌单时应该清除 defaultPlaylistId', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })
      manager.setDefaultPlaylist(playlist.id)

      await manager.deletePlaylist(playlist.id)

      expect(manager.defaultPlaylistId.value).toBeNull()
    })
  })

  describe('getPlaylist', () => {
    it('应该返回指定歌单', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })

      const found = manager.getPlaylist(playlist.id)

      expect(found).toEqual(playlist)
    })

    it('不存在的歌单应该返回 null', async () => {
      const manager = await getManager()
      manager.initialize()

      expect(manager.getPlaylist('non-existent')).toBeNull()
    })
  })

  describe('歌曲操作', () => {
    describe('addSong', () => {
      it('应该成功添加歌曲到 collection', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist } = manager.createPlaylist({
          name: 'Test',
          mode: 'collection'
        })

        const result = manager.addSong(playlist.id, createSong())

        expect(result.success).toBe(true)
        const updatedPlaylist = manager.getPlaylist(playlist.id)
        expect(updatedPlaylist.songs).toHaveLength(1)
      })

      it('playlist 模式不应该允许添加歌曲', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist } = manager.createPlaylist({
          name: 'Test',
          mode: 'playlist',
          source: 'netease',
          sourceId: '123'
        })

        const result = manager.addSong(playlist.id, createSong())

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.INVALID_PLAYLIST_MODE)
      })

      it('应该为没有 ID 的歌曲生成 ID', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist } = manager.createPlaylist({
          name: 'Test',
          mode: 'collection'
        })

        const song = { name: 'Test Song', artist: 'Test Artist' }
        manager.addSong(playlist.id, song)

        const updatedPlaylist = manager.getPlaylist(playlist.id)
        expect(updatedPlaylist.songs[0].id).toBeDefined()
      })

      it('达到最大歌曲数量时应该失败', async () => {
        const songs = Array.from({ length: PLAYLIST_CONFIG.MAX_SONGS_PER_COLLECTION }, (_, i) =>
          createSong({ id: `song-${i}` })
        )
        const playlists = [createCollection(songs, { id: 'test-collection' })]
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))

        const manager = await getManager()
        manager.initialize()

        const result = manager.addSong('test-collection', createSong())

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.MAX_SONGS_REACHED)
      })
    })

    describe('addSongs', () => {
      it('应该批量添加歌曲', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist } = manager.createPlaylist({
          name: 'Test',
          mode: 'collection'
        })

        const songs = [createSong({ name: 'Song 1' }), createSong({ name: 'Song 2' })]
        const result = manager.addSongs(playlist.id, songs)

        expect(result.success).toBe(true)
        expect(result.added).toBe(2)
        const updatedPlaylist = manager.getPlaylist(playlist.id)
        expect(updatedPlaylist.songs).toHaveLength(2)
      })

      it('应该截断超出限制的歌曲', async () => {
        const existingSongs = Array.from(
          { length: PLAYLIST_CONFIG.MAX_SONGS_PER_COLLECTION - 1 },
          (_, i) => createSong({ id: `song-${i}` })
        )
        const playlists = [createCollection(existingSongs, { id: 'test-collection' })]
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))

        const manager = await getManager()
        manager.initialize()

        const newSongs = [createSong(), createSong(), createSong()]
        const result = manager.addSongs('test-collection', newSongs)

        expect(result.success).toBe(true)
        expect(result.added).toBe(1)
      })
    })

    describe('removeSong', () => {
      it('应该成功移除歌曲', async () => {
        const song = createSong({ id: 'song-to-remove' })
        const playlists = [createCollection([song], { id: 'test-collection' })]
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))

        const manager = await getManager()
        manager.initialize()

        const result = await manager.removeSong('test-collection', 'song-to-remove')

        expect(result.success).toBe(true)
        expect(manager.playlists.value[0].songs).toHaveLength(0)
      })

      it('不存在的歌曲应该失败', async () => {
        const playlists = [createCollection([], { id: 'test-collection' })]
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))

        const manager = await getManager()
        manager.initialize()

        const result = await manager.removeSong('test-collection', 'non-existent')

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.SONG_NOT_FOUND)
      })
    })

    describe('reorderSongs', () => {
      it('应该成功重新排序歌曲', async () => {
        const songs = [
          createSong({ id: 'song-1', name: 'First' }),
          createSong({ id: 'song-2', name: 'Second' }),
          createSong({ id: 'song-3', name: 'Third' })
        ]
        const playlists = [createCollection(songs, { id: 'test-collection' })]
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))

        const manager = await getManager()
        manager.initialize()

        const result = manager.reorderSongs('test-collection', 0, 2)

        expect(result.success).toBe(true)
        expect(manager.playlists.value[0].songs[0].name).toBe('Second')
        expect(manager.playlists.value[0].songs[2].name).toBe('First')
      })

      it('无效索引应该失败', async () => {
        const songs = [createSong({ id: 'song-1' })]
        const playlists = [createCollection(songs, { id: 'test-collection' })]
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))

        const manager = await getManager()
        manager.initialize()

        const result = manager.reorderSongs('test-collection', -1, 0)

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.INVALID_DATA)
      })
    })
  })

  describe('选择操作', () => {
    describe('setCurrentPlaylist', () => {
      it('应该成功设置当前歌单', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist } = manager.createPlaylist({
          name: 'Test',
          mode: 'playlist',
          source: 'netease',
          sourceId: '123'
        })

        const result = manager.setCurrentPlaylist(playlist.id)

        expect(result.success).toBe(true)
        expect(manager.currentPlaylistId.value).toBe(playlist.id)
      })

      it('不存在的歌单应该失败', async () => {
        const manager = await getManager()
        manager.initialize()

        const result = manager.setCurrentPlaylist('non-existent')

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.PLAYLIST_NOT_FOUND)
      })

      it('null 应该清除当前选择', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist } = manager.createPlaylist({
          name: 'Test',
          mode: 'playlist',
          source: 'netease',
          sourceId: '123'
        })
        manager.setCurrentPlaylist(playlist.id)

        const result = manager.setCurrentPlaylist(null)

        expect(result.success).toBe(true)
        expect(manager.currentPlaylistId.value).toBeNull()
      })
    })

    describe('setDefaultPlaylist', () => {
      it('应该成功设置默认歌单', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist } = manager.createPlaylist({
          name: 'Test',
          mode: 'playlist',
          source: 'netease',
          sourceId: '123'
        })

        const result = manager.setDefaultPlaylist(playlist.id)

        expect(result.success).toBe(true)
        expect(manager.defaultPlaylistId.value).toBe(playlist.id)
      })
    })

    describe('reorderPlaylists', () => {
      it('应该成功重新排序歌单', async () => {
        const manager = await getManager()
        manager.initialize()
        const { playlist: p1 } = manager.createPlaylist({
          name: 'First',
          mode: 'playlist',
          source: 'netease',
          sourceId: '1'
        })
        const { playlist: p2 } = manager.createPlaylist({
          name: 'Second',
          mode: 'playlist',
          source: 'netease',
          sourceId: '2'
        })

        // 重新排序：Second, First（不包含内置歌单）
        const result = manager.reorderPlaylists([p2.id, p1.id])

        expect(result.success).toBe(true)
        // 验证 p2 的 order 小于 p1 的 order
        const updatedP1 = manager.getPlaylist(p1.id)
        const updatedP2 = manager.getPlaylist(p2.id)
        expect(updatedP2.order).toBeLessThan(updatedP1.order)
      })

      it('无效 ID 应该失败', async () => {
        const manager = await getManager()
        manager.initialize()

        const result = manager.reorderPlaylists(['invalid-id'])

        expect(result.success).toBe(false)
        expect(result.error).toBe(ErrorTypes.PLAYLIST_NOT_FOUND)
      })
    })
  })

  describe('Computed 属性', () => {
    it('currentPlaylist 应该返回当前歌单', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })
      manager.setCurrentPlaylist(playlist.id)

      expect(manager.currentPlaylist.value).toEqual(playlist)
    })

    it('defaultPlaylist 应该返回默认歌单', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist } = manager.createPlaylist({
        name: 'Test',
        mode: 'playlist',
        source: 'netease',
        sourceId: '123'
      })
      manager.setDefaultPlaylist(playlist.id)

      expect(manager.defaultPlaylist.value).toEqual(playlist)
    })

    it('sortedPlaylists 应该按 order 排序', async () => {
      const manager = await getManager()
      manager.initialize()
      const { playlist: pA } = manager.createPlaylist({
        name: 'A',
        mode: 'playlist',
        source: 'netease',
        sourceId: '1'
      })
      const { playlist: pB } = manager.createPlaylist({
        name: 'B',
        mode: 'playlist',
        source: 'netease',
        sourceId: '2'
      })
      const { playlist: pC } = manager.createPlaylist({
        name: 'C',
        mode: 'playlist',
        source: 'netease',
        sourceId: '3'
      })

      const sorted = manager.sortedPlaylists.value
      // 内置歌单 order=0 排在最前面，然后是 A, B, C
      expect(sorted[0].id).toBe('builtin_studywithmiku')
      expect(sorted[1].id).toBe(pA.id)
      expect(sorted[2].id).toBe(pB.id)
      expect(sorted[3].id).toBe(pC.id)
    })
  })
})
