/**
 * src/services/meting.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { API_CONFIG, CACHE_CONFIG, STORAGE_KEYS } from '@/config/constants.js'
import { metingApiResponse, neteaseSongs, incompleteSongs } from '../../setup/fixtures/songs.js'

describe('meting.js', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const getMeting = async () => {
    return await import('@/services/meting.js')
  }

  describe('fetchPlaylist', () => {
    it('应该成功获取并转换歌单数据', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(metingApiResponse)
      })

      const { fetchPlaylist } = await getMeting()
      const result = await fetchPlaylist('netease', '12345678')

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('artist')
      expect(result[0]).toHaveProperty('url')
      expect(result[0]).toHaveProperty('cover')
    })

    it('应该使用默认参数', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      })

      const { fetchPlaylist, DEFAULT_PLAYLIST_ID } = await getMeting()
      await fetchPlaylist()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('server=netease'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`id=${DEFAULT_PLAYLIST_ID}`),
        expect.any(Object)
      )
    })

    it('应该正确映射 API 响应字段', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              title: 'Song Title',
              author: 'Song Author',
              url: 'https://example.com/song.mp3',
              pic: 'https://example.com/cover.jpg',
              lrc: '[00:00.00]Lyrics'
            }
          ])
      })

      const { fetchPlaylist } = await getMeting()
      const result = await fetchPlaylist('netease', '123')

      expect(result[0].name).toBe('Song Title')
      expect(result[0].artist).toBe('Song Author')
      expect(result[0].url).toBe('https://example.com/song.mp3')
      expect(result[0].cover).toBe('https://example.com/cover.jpg')
      expect(result[0].lrc).toBe('[00:00.00]Lyrics')
    })

    it('应该过滤不完整的歌曲数据', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            ...metingApiResponse,
            { title: 'No URL' }, // 缺少 url
            { url: 'test.mp3' } // 缺少 title
          ])
      })

      const { fetchPlaylist } = await getMeting()
      const result = await fetchPlaylist('netease', '123')

      expect(result).toHaveLength(2) // 只有 metingApiResponse 中的两首
    })

    it('网络错误应该抛出 NETWORK_ERROR', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })

      const { fetchPlaylist } = await getMeting()

      await expect(fetchPlaylist('netease', '123')).rejects.toMatchObject({
        type: 'NETWORK_ERROR'
      })
    })

    it('JSON 解析失败应该抛出 PARSE_ERROR', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      const { fetchPlaylist } = await getMeting()

      await expect(fetchPlaylist('netease', '123')).rejects.toMatchObject({
        type: 'PARSE_ERROR'
      })
    })

    it('非数组响应应该抛出 INVALID_DATA', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'not an array' })
      })

      const { fetchPlaylist } = await getMeting()

      await expect(fetchPlaylist('netease', '123')).rejects.toMatchObject({
        type: 'INVALID_DATA'
      })
    })

    it('超时应该抛出 TIMEOUT_ERROR', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          }, API_CONFIG.FETCH_TIMEOUT + 1000)
        })
      })

      const { fetchPlaylist } = await getMeting()
      const promise = fetchPlaylist('netease', '123')

      vi.advanceTimersByTime(API_CONFIG.FETCH_TIMEOUT + 1000)

      await expect(promise).rejects.toMatchObject({
        type: 'TIMEOUT_ERROR'
      })
    })
  })

  describe('getCachedPlaylist', () => {
    it('应该返回有效的缓存数据', async () => {
      const cacheData = {
        timestamp: Date.now(),
        songs: neteaseSongs
      }
      localStorage.setItem(
        `${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`,
        JSON.stringify(cacheData)
      )

      const { getCachedPlaylist } = await getMeting()
      const result = getCachedPlaylist('netease', '123')

      expect(result).not.toBeNull()
      expect(result.songs).toEqual(neteaseSongs)
      expect(result.isExpired).toBe(false)
    })

    it('缓存不存在时应该返回 null', async () => {
      const { getCachedPlaylist } = await getMeting()
      const result = getCachedPlaylist('netease', 'non-existent')

      expect(result).toBeNull()
    })

    it('缓存过期时 isExpired 应该为 true', async () => {
      const expiredTimestamp = Date.now() - CACHE_CONFIG.PLAYLIST_DURATION - 1000
      const cacheData = {
        timestamp: expiredTimestamp,
        songs: neteaseSongs
      }
      localStorage.setItem(
        `${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`,
        JSON.stringify(cacheData)
      )

      const { getCachedPlaylist } = await getMeting()
      const result = getCachedPlaylist('netease', '123')

      expect(result.isExpired).toBe(true)
    })

    it('无效 JSON 应该返回 null 并清除缓存', async () => {
      localStorage.setItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`, 'invalid json')

      const { getCachedPlaylist } = await getMeting()
      const result = getCachedPlaylist('netease', '123')

      expect(result).toBeNull()
      expect(localStorage.getItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`)).toBeNull()
    })
  })

  describe('cachePlaylist', () => {
    it('应该将歌单数据缓存到 localStorage', async () => {
      const { cachePlaylist } = await getMeting()
      cachePlaylist('netease', '123', neteaseSongs)

      const cached = JSON.parse(
        localStorage.getItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`)
      )
      expect(cached.songs).toEqual(neteaseSongs)
      expect(cached.timestamp).toBeDefined()
    })
  })

  describe('clearPlaylistCache', () => {
    it('应该清除指定的缓存', async () => {
      localStorage.setItem(
        `${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`,
        JSON.stringify({ songs: [] })
      )

      const { clearPlaylistCache } = await getMeting()
      clearPlaylistCache('netease', '123')

      expect(localStorage.getItem(`${STORAGE_KEYS.PLAYLIST_CACHE_PREFIX}:netease:123`)).toBeNull()
    })
  })

  describe('getStoredConfig', () => {
    it('应该返回存储的配置', async () => {
      localStorage.setItem(STORAGE_KEYS.MUSIC_PLATFORM, 'tencent')

      const { getStoredConfig } = await getMeting()
      const config = getStoredConfig()

      expect(config.platform).toBe('tencent')
    })

    it('没有存储配置时应该返回默认值', async () => {
      const { getStoredConfig } = await getMeting()
      const config = getStoredConfig()

      expect(config.platform).toBe('netease')
    })
  })

  describe('saveConfig', () => {
    it('应该保存配置到 localStorage', async () => {
      const { saveConfig } = await getMeting()
      saveConfig('tencent', '87654321')

      expect(localStorage.getItem(STORAGE_KEYS.MUSIC_PLATFORM)).toBe('tencent')
      expect(localStorage.getItem(STORAGE_KEYS.MUSIC_ID)).toBe('87654321')
    })
  })
})
