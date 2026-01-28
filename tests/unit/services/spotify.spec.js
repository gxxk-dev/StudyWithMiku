/**
 * src/services/spotify.js 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  extractSpotifyPlaylistId,
  isSpotifyLink,
  getSpotifyEmbedUrl,
  saveSpotifyPlaylistId,
  getSpotifyPlaylistId,
  resetSpotifyPlaylistId,
  DEFAULT_SPOTIFY_PLAYLIST_ID
} from '@/services/spotify.js'
import { STORAGE_KEYS, API_CONFIG } from '@/config/constants.js'

describe('spotify.js', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('extractSpotifyPlaylistId', () => {
    describe('URL 格式', () => {
      it('应该从标准 URL 提取 ID', () => {
        const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
        expect(extractSpotifyPlaylistId(url)).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })

      it('应该从带参数的 URL 提取 ID', () => {
        const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abcdef123456'
        expect(extractSpotifyPlaylistId(url)).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })

      it('应该从带多个参数的 URL 提取 ID', () => {
        const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc&nd=1'
        expect(extractSpotifyPlaylistId(url)).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })
    })

    describe('URI 格式', () => {
      it('应该从 Spotify URI 提取 ID', () => {
        const uri = 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
        expect(extractSpotifyPlaylistId(uri)).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })
    })

    describe('纯 ID 格式', () => {
      it('应该识别 22 字符的 base62 ID', () => {
        expect(extractSpotifyPlaylistId('37i9dQZF1DXcBWIGoYBM5M')).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })

      it('长度不是 22 的字符串应该原样返回', () => {
        expect(extractSpotifyPlaylistId('shortid')).toBe('shortid')
        expect(extractSpotifyPlaylistId('thisIsAVeryLongStringThatIsNotA22CharId')).toBe(
          'thisIsAVeryLongStringThatIsNotA22CharId'
        )
      })
    })

    describe('边缘情况', () => {
      it('空字符串应该返回空字符串', () => {
        expect(extractSpotifyPlaylistId('')).toBe('')
      })

      it('null 应该返回空字符串', () => {
        expect(extractSpotifyPlaylistId(null)).toBe('')
      })

      it('undefined 应该返回空字符串', () => {
        expect(extractSpotifyPlaylistId(undefined)).toBe('')
      })

      it('应该去除前后空格', () => {
        expect(
          extractSpotifyPlaylistId('  https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M  ')
        ).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })

      it('非 Spotify URL 应该原样返回（去除空格后）', () => {
        expect(extractSpotifyPlaylistId('random text')).toBe('random text')
      })
    })
  })

  describe('isSpotifyLink', () => {
    it('应该识别 Spotify Web URL', () => {
      expect(isSpotifyLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe(true)
    })

    it('应该识别 Spotify URI', () => {
      expect(isSpotifyLink('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe(true)
    })

    it('应该不识别其他 URL', () => {
      expect(isSpotifyLink('https://music.163.com/playlist?id=123')).toBe(false)
      expect(isSpotifyLink('https://y.qq.com/playlist/123')).toBe(false)
      expect(isSpotifyLink('https://example.com')).toBe(false)
    })

    it('空值应该返回 false', () => {
      expect(isSpotifyLink('')).toBe(false)
      expect(isSpotifyLink(null)).toBe(false)
      expect(isSpotifyLink(undefined)).toBe(false)
    })

    it('应该不区分大小写', () => {
      expect(isSpotifyLink('HTTPS://OPEN.SPOTIFY.COM/playlist/abc123')).toBe(true)
    })
  })

  describe('getSpotifyEmbedUrl', () => {
    it('应该生成默认主题的嵌入 URL', () => {
      const url = getSpotifyEmbedUrl('37i9dQZF1DXcBWIGoYBM5M')
      expect(url).toBe(
        'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0'
      )
    })

    it('应该支持浅色主题', () => {
      const url = getSpotifyEmbedUrl('37i9dQZF1DXcBWIGoYBM5M', { theme: 1 })
      expect(url).toBe(
        'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=1'
      )
    })

    it('空 ID 应该返回空字符串', () => {
      expect(getSpotifyEmbedUrl('')).toBe('')
      expect(getSpotifyEmbedUrl(null)).toBe('')
      expect(getSpotifyEmbedUrl(undefined)).toBe('')
    })
  })

  describe('saveSpotifyPlaylistId', () => {
    it('应该保存歌单 ID 到 localStorage', () => {
      saveSpotifyPlaylistId('testPlaylistId')
      expect(localStorage.getItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID)).toBe('testPlaylistId')
    })

    it('应该覆盖已有的值', () => {
      localStorage.setItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID, 'oldId')
      saveSpotifyPlaylistId('newId')
      expect(localStorage.getItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID)).toBe('newId')
    })
  })

  describe('getSpotifyPlaylistId', () => {
    it('应该返回已保存的歌单 ID', () => {
      localStorage.setItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID, 'savedPlaylistId')
      expect(getSpotifyPlaylistId()).toBe('savedPlaylistId')
    })

    it('没有保存值时应该返回默认 ID', () => {
      expect(getSpotifyPlaylistId()).toBe(API_CONFIG.DEFAULT_SPOTIFY_PLAYLIST_ID)
    })

    it('保存的值为空字符串时应该返回默认 ID', () => {
      localStorage.setItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID, '')
      expect(getSpotifyPlaylistId()).toBe(API_CONFIG.DEFAULT_SPOTIFY_PLAYLIST_ID)
    })
  })

  describe('resetSpotifyPlaylistId', () => {
    it('应该重置为默认歌单 ID', () => {
      localStorage.setItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID, 'customId')
      const result = resetSpotifyPlaylistId()

      expect(result).toBe(API_CONFIG.DEFAULT_SPOTIFY_PLAYLIST_ID)
      expect(localStorage.getItem(STORAGE_KEYS.SPOTIFY_PLAYLIST_ID)).toBe(
        API_CONFIG.DEFAULT_SPOTIFY_PLAYLIST_ID
      )
    })
  })

  describe('DEFAULT_SPOTIFY_PLAYLIST_ID', () => {
    it('应该导出默认 ID', () => {
      expect(DEFAULT_SPOTIFY_PLAYLIST_ID).toBe(API_CONFIG.DEFAULT_SPOTIFY_PLAYLIST_ID)
    })
  })
})
