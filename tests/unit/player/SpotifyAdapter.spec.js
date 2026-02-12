/**
 * SpotifyAdapter 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SpotifyAdapter } from '../../../src/player/adapters/SpotifyAdapter.js'
import { PlayerEvent, AdapterType } from '../../../src/player/constants.js'

describe('SpotifyAdapter', () => {
  let adapter

  beforeEach(() => {
    adapter = new SpotifyAdapter()
  })

  describe('初始化', () => {
    it('应该正确初始化', async () => {
      await adapter.initialize(null, { playlistId: 'test123' })

      expect(adapter.isInitialized()).toBe(true)
      expect(adapter.getPlaylistId()).toBe('test123')
    })

    it('应该创建占位曲目', async () => {
      await adapter.initialize(null, { playlistId: 'test123' })

      const tracks = adapter.getTrackList()
      expect(tracks.length).toBe(1)
      expect(tracks[0].name).toBe('Spotify Playlist')
      expect(tracks[0].meta.source).toBe('spotify')
    })

    it('应该触发 READY 事件', async () => {
      const callback = vi.fn()
      adapter.on(PlayerEvent.READY, callback)

      await adapter.initialize(null, { playlistId: 'test123' })

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('适配器类型', () => {
    it('应该返回 SPOTIFY 类型', () => {
      expect(adapter.getAdapterType()).toBe(AdapterType.SPOTIFY)
    })
  })

  describe('能力查询', () => {
    it('不支持歌词', () => {
      expect(adapter.supportsLyrics()).toBe(false)
    })

    it('不支持跳转（iframe 模式）', () => {
      expect(adapter.supportsSeek()).toBe(false)
    })

    it('有内置 UI', () => {
      expect(adapter.hasBuiltInUI()).toBe(true)
    })

    it('内部管理播放列表', () => {
      expect(adapter.hasInternalPlaylist()).toBe(true)
    })
  })

  describe('播放控制（no-op）', () => {
    beforeEach(async () => {
      await adapter.initialize(null, { playlistId: 'test123' })
    })

    it('play 应该静默执行', async () => {
      await expect(adapter.play()).resolves.toBeUndefined()
    })

    it('pause 应该静默执行', async () => {
      await expect(adapter.pause()).resolves.toBeUndefined()
    })

    it('stop 应该静默执行', async () => {
      await expect(adapter.stop()).resolves.toBeUndefined()
    })

    it('seek 应该静默执行', async () => {
      await expect(adapter.seek(10)).resolves.toBeUndefined()
    })

    it('skipNext 应该静默执行', async () => {
      await expect(adapter.skipNext()).resolves.toBeUndefined()
    })

    it('skipPrevious 应该静默执行', async () => {
      await expect(adapter.skipPrevious()).resolves.toBeUndefined()
    })

    it('switchTrack 应该静默执行', async () => {
      await expect(adapter.switchTrack(1)).resolves.toBeUndefined()
    })
  })

  describe('音量控制', () => {
    beforeEach(async () => {
      await adapter.initialize(null, { playlistId: 'test123' })
    })

    it('应该返回模拟音量值', () => {
      expect(adapter.getVolume()).toBe(0.7)
    })

    it('应该保存设置的音量并触发事件', () => {
      const callback = vi.fn()
      adapter.on(PlayerEvent.VOLUME_CHANGE, callback)

      adapter.setVolume(0.5)

      expect(adapter.getVolume()).toBe(0.5)
      expect(callback).toHaveBeenCalledWith(0.5)
    })

    it('应该限制音量范围', () => {
      adapter.setVolume(-0.5)
      expect(adapter.getVolume()).toBe(0)

      adapter.setVolume(1.5)
      expect(adapter.getVolume()).toBe(1)
    })
  })

  describe('进度查询', () => {
    beforeEach(async () => {
      await adapter.initialize(null, { playlistId: 'test123' })
    })

    it('getCurrentTime 应该返回 0（iframe 模式无法获取）', () => {
      expect(adapter.getCurrentTime()).toBe(0)
    })

    it('getDuration 应该返回 0（iframe 模式无法获取）', () => {
      expect(adapter.getDuration()).toBe(0)
    })
  })

  describe('歌单管理', () => {
    beforeEach(async () => {
      await adapter.initialize(null, { playlistId: 'test123' })
    })

    it('setPlaylistId 应该更新歌单 ID', () => {
      adapter.setPlaylistId('newPlaylist')
      expect(adapter.getPlaylistId()).toBe('newPlaylist')
    })

    it('setPlaylistId 应该触发 PLAYLIST_LOADED 事件', () => {
      const callback = vi.fn()
      adapter.on(PlayerEvent.PLAYLIST_LOADED, callback)

      adapter.setPlaylistId('newPlaylist')

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          playlistId: 'newPlaylist'
        })
      )
    })

    it('loadPlaylist 应该触发 PLAYLIST_LOADED 事件', async () => {
      const callback = vi.fn()
      adapter.on(PlayerEvent.PLAYLIST_LOADED, callback)

      await adapter.loadPlaylist([{ id: '1', name: 'Test' }])

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('销毁', () => {
    it('应该清理状态', async () => {
      await adapter.initialize(null, { playlistId: 'test123' })
      await adapter.destroy()

      expect(adapter.isInitialized()).toBe(false)
      expect(adapter.getPlaylistId()).toBeNull()
    })
  })
})
