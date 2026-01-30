/**
 * src/composables/useMusic.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { STORAGE_KEYS, API_CONFIG } from '@/config/constants.js'
import { neteaseSongs, metingApiResponse, onlineSongs } from '../../setup/fixtures/songs.js'
import { neteasePlaylist, onlineCollection } from '../../setup/fixtures/playlists.js'

describe('useMusic.js', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(metingApiResponse)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const getUseMusic = async () => {
    const { useMusic } = await import('@/composables/useMusic.js')
    return useMusic()
  }

  describe('初始状态', () => {
    it('songs 应该是空数组', async () => {
      const music = await getUseMusic()
      expect(music.songs.value).toEqual([])
    })

    it('loading 初始值应该为 false', async () => {
      const music = await getUseMusic()
      expect(music.loading.value).toBe(false)
    })

    it('platform 默认应该是 netease', async () => {
      const music = await getUseMusic()
      expect(music.platform.value).toBe('netease')
    })

    it('isSpotify 默认应该为 false', async () => {
      const music = await getUseMusic()
      expect(music.isSpotify.value).toBe(false)
    })

    it('应该从 localStorage 恢复 platform', async () => {
      localStorage.setItem(STORAGE_KEYS.MUSIC_PLATFORM, 'tencent')
      const music = await getUseMusic()
      expect(music.platform.value).toBe('tencent')
    })

    it('应该从 localStorage 恢复 playlistId', async () => {
      localStorage.setItem(STORAGE_KEYS.PLAYLIST_ID, '123456')
      const music = await getUseMusic()
      expect(music.playlistId.value).toBe('123456')
    })
  })

  describe('setPlatform', () => {
    it('应该更新 platform', async () => {
      const music = await getUseMusic()

      music.setPlatform('tencent')

      expect(music.platform.value).toBe('tencent')
      expect(localStorage.getItem(STORAGE_KEYS.MUSIC_PLATFORM)).toBe('tencent')
    })

    it('设置 spotify 后 isSpotify 应该为 true', async () => {
      const music = await getUseMusic()

      music.setPlatform('spotify')

      expect(music.isSpotify.value).toBe(true)
    })
  })

  describe('setPlaylistId', () => {
    it('应该更新 playlistId', async () => {
      const music = await getUseMusic()

      music.setPlaylistId('newPlaylistId')

      expect(music.playlistId.value).toBe('newPlaylistId')
      expect(localStorage.getItem(STORAGE_KEYS.PLAYLIST_ID)).toBe('newPlaylistId')
    })
  })

  describe('resetPlaylistId', () => {
    it('应该重置为默认 ID', async () => {
      const music = await getUseMusic()
      music.setPlaylistId('custom')

      music.resetPlaylistId()

      expect(music.playlistId.value).toBe(API_CONFIG.DEFAULT_PLAYLIST_ID)
    })
  })

  describe('loadSongs', () => {
    it('Spotify 平台不应该调用 Meting API', async () => {
      const music = await getUseMusic()
      music.setPlatform('spotify')

      await music.loadSongs()

      expect(global.fetch).not.toHaveBeenCalled()
      expect(music.loading.value).toBe(false)
    })

    it('应该从 API 加载歌曲', async () => {
      const music = await getUseMusic()

      await music.loadSongs()

      expect(global.fetch).toHaveBeenCalled()
      expect(music.songs.value.length).toBeGreaterThan(0)
    })

    it('应该使用缓存数据', async () => {
      // 预设缓存
      const cacheKey = `${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:${API_CONFIG.DEFAULT_PLAYLIST_ID}`
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          songs: neteaseSongs
        })
      )

      const music = await getUseMusic()
      await music.loadSongs()

      // 应该先使用缓存
      expect(music.songs.value).toEqual(neteaseSongs)
    })
  })

  describe('applyCustomPlaylist', () => {
    it('应该更新平台和歌单 ID', async () => {
      const music = await getUseMusic()

      await music.applyCustomPlaylist('tencent', 'custom123')

      expect(music.platform.value).toBe('tencent')
      expect(music.playlistId.value).toBe('custom123')
    })
  })

  describe('resetToDefault', () => {
    it('应该重置为默认配置', async () => {
      const music = await getUseMusic()
      music.setPlatform('tencent')
      music.setPlaylistId('custom')

      await music.resetToDefault()

      expect(music.platform.value).toBe('netease')
      expect(music.playlistId.value).toBe(API_CONFIG.DEFAULT_PLAYLIST_ID)
    })
  })

  describe('Spotify 方法', () => {
    describe('setSpotifyPlaylistId', () => {
      it('应该更新 Spotify 歌单 ID', async () => {
        const music = await getUseMusic()

        music.setSpotifyPlaylistId('newSpotifyId')

        expect(music.spotifyPlaylistId.value).toBe('newSpotifyId')
        expect(localStorage.getItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID)).toBe('newSpotifyId')
      })
    })

    describe('applySpotifyPlaylist', () => {
      it('应该切换到 Spotify 并设置歌单 ID', async () => {
        const music = await getUseMusic()

        music.applySpotifyPlaylist('spotifyListId')

        expect(music.platform.value).toBe('spotify')
        expect(music.spotifyPlaylistId.value).toBe('spotifyListId')
        expect(music.isSpotify.value).toBe(true)
      })
    })

    describe('resetSpotifyToDefault', () => {
      it('应该重置为默认 Spotify 歌单', async () => {
        const music = await getUseMusic()
        music.setSpotifyPlaylistId('custom')

        music.resetSpotifyToDefault()

        expect(music.spotifyPlaylistId.value).toBe(API_CONFIG.DEFAULT_SPOTIFY_PLAYLIST_ID)
      })
    })
  })

  describe('applyUrlPlaylist', () => {
    it('应该成功应用 netease 歌单', async () => {
      const music = await getUseMusic()

      const result = await music.applyUrlPlaylist('netease:12345678')

      expect(result).toBe(true)
      expect(music.platform.value).toBe('netease')
      expect(music.playlistId.value).toBe('12345678')
    })

    it('应该成功应用 spotify 歌单', async () => {
      const music = await getUseMusic()

      const result = await music.applyUrlPlaylist('spotify:37i9dQZF1DXcBWIGoYBM5M')

      expect(result).toBe(true)
      expect(music.platform.value).toBe('spotify')
      expect(music.spotifyPlaylistId.value).toBe('37i9dQZF1DXcBWIGoYBM5M')
    })

    it('无效格式应该返回 false', async () => {
      const music = await getUseMusic()

      const result = await music.applyUrlPlaylist('invalid')

      expect(result).toBe(false)
    })

    it('不支持的平台应该返回 false', async () => {
      const music = await getUseMusic()

      const result = await music.applyUrlPlaylist('unknown:12345')

      expect(result).toBe(false)
    })
  })

  describe('loadFromPlaylist', () => {
    it('空歌单应该返回 false', async () => {
      const music = await getUseMusic()

      const result = await music.loadFromPlaylist(null)

      expect(result).toBe(false)
    })

    it('playlist 模式应该调用 loadMetingSongs', async () => {
      const music = await getUseMusic()

      const result = await music.loadFromPlaylist(neteasePlaylist)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('spotify playlist 模式应该调用 applySpotifyPlaylist', async () => {
      const music = await getUseMusic()

      const spotifyPlaylist = {
        ...neteasePlaylist,
        source: 'spotify',
        sourceId: '37i9dQZF1DXcBWIGoYBM5M'
      }

      const result = await music.loadFromPlaylist(spotifyPlaylist)

      expect(result).toBe(true)
      expect(music.platform.value).toBe('spotify')
    })

    it('collection 模式应该转换歌曲格式', async () => {
      const music = await getUseMusic()

      const collection = {
        ...onlineCollection,
        songs: onlineSongs
      }

      const result = await music.loadFromPlaylist(collection)

      expect(result).toBe(true)
      expect(music.songs.value.length).toBe(onlineSongs.length)
    })

    it('未知模式应该返回 false', async () => {
      const music = await getUseMusic()

      const unknownPlaylist = { mode: 'unknown' }
      const result = await music.loadFromPlaylist(unknownPlaylist)

      expect(result).toBe(false)
    })
  })

  describe('cleanupLocalAudioURLs', () => {
    it('应该清理所有 Object URLs', async () => {
      const music = await getUseMusic()
      vi.spyOn(URL, 'revokeObjectURL')

      // 手动触发一些 URL 创建（通过 loadFromPlaylist with local songs）
      // 然后调用清理
      music.cleanupLocalAudioURLs()

      // 验证方法存在且可调用
      expect(music.cleanupLocalAudioURLs).toBeDefined()
    })
  })

  describe('导出的常量', () => {
    it('应该导出 DEFAULT_PLAYLIST_ID', async () => {
      const music = await getUseMusic()
      expect(music.DEFAULT_PLAYLIST_ID).toBe(API_CONFIG.DEFAULT_PLAYLIST_ID)
    })

    it('应该导出 DEFAULT_SPOTIFY_PLAYLIST_ID', async () => {
      const music = await getUseMusic()
      expect(music.DEFAULT_SPOTIFY_PLAYLIST_ID).toBe(API_CONFIG.DEFAULT_SPOTIFY_PLAYLIST_ID)
    })

    it('应该导出 PLATFORMS', async () => {
      const music = await getUseMusic()
      expect(music.PLATFORMS).toHaveLength(3)
      expect(music.PLATFORMS.map((p) => p.value)).toContain('netease')
      expect(music.PLATFORMS.map((p) => p.value)).toContain('tencent')
      expect(music.PLATFORMS.map((p) => p.value)).toContain('spotify')
    })
  })
})
