/**
 * src/composables/usePlaylistDetection.js 单元测试
 */

import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import {
  extractPlaylistId,
  detectPlatformFromText,
  usePlaylistDetection
} from '@/composables/usePlaylistDetection.js'

describe('usePlaylistDetection.js', () => {
  describe('extractPlaylistId', () => {
    describe('网易云音乐', () => {
      it('应该从标准 URL 提取 ID', () => {
        const url = 'https://music.163.com/playlist?id=17543418420'
        expect(extractPlaylistId(url, 'netease')).toBe('17543418420')
      })

      it('应该从短路径 URL 提取 ID', () => {
        const url = 'https://music.163.com/playlist/17543418420'
        expect(extractPlaylistId(url, 'netease')).toBe('17543418420')
      })

      it('应该从带额外参数的 URL 提取 ID', () => {
        const url = 'https://music.163.com/playlist?id=17543418420&userid=12345&type=0'
        expect(extractPlaylistId(url, 'netease')).toBe('17543418420')
      })

      it('应该识别纯数字 ID', () => {
        expect(extractPlaylistId('17543418420', 'netease')).toBe('17543418420')
      })
    })

    describe('QQ音乐', () => {
      it('应该从标准 URL 提取 ID', () => {
        const url = 'https://y.qq.com/n/ryqq/playlist/8888888888'
        expect(extractPlaylistId(url, 'tencent')).toBe('8888888888')
      })

      it('应该从带 id 参数的 URL 提取', () => {
        const url = 'https://y.qq.com/playlist?id=8888888888'
        expect(extractPlaylistId(url, 'tencent')).toBe('8888888888')
      })

      it('应该识别纯数字 ID', () => {
        expect(extractPlaylistId('8888888888', 'tencent')).toBe('8888888888')
      })
    })

    describe('Spotify', () => {
      it('应该委托给 extractSpotifyPlaylistId', () => {
        const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
        expect(extractPlaylistId(url, 'spotify')).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })

      it('应该处理 Spotify URI', () => {
        const uri = 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
        expect(extractPlaylistId(uri, 'spotify')).toBe('37i9dQZF1DXcBWIGoYBM5M')
      })
    })

    describe('边缘情况', () => {
      it('空字符串应该返回空字符串', () => {
        expect(extractPlaylistId('', 'netease')).toBe('')
      })

      it('null 应该返回空字符串', () => {
        expect(extractPlaylistId(null, 'netease')).toBe('')
      })

      it('undefined 应该返回空字符串', () => {
        expect(extractPlaylistId(undefined, 'netease')).toBe('')
      })

      it('未知平台应该尝试通用提取', () => {
        // 纯数字
        expect(extractPlaylistId('12345678', 'unknown')).toBe('12345678')
        // 带 id 参数的通用 URL
        expect(extractPlaylistId('https://example.com?id=999', 'unknown')).toBe('999')
        // 无法提取时原样返回
        expect(extractPlaylistId('some-text', 'unknown')).toBe('some-text')
      })

      it('应该去除前后空格', () => {
        expect(extractPlaylistId('  12345678  ', 'netease')).toBe('12345678')
      })
    })
  })

  describe('detectPlatformFromText', () => {
    describe('网易云音乐检测', () => {
      it('应该检测网易云 URL', () => {
        expect(detectPlatformFromText('https://music.163.com/playlist?id=123')).toBe('netease')
      })

      it('应该检测网易云子域名', () => {
        expect(detectPlatformFromText('https://y.music.163.com/m/playlist?id=123')).toBe('netease')
      })
    })

    describe('QQ音乐检测', () => {
      it('应该检测 y.qq.com', () => {
        expect(detectPlatformFromText('https://y.qq.com/n/ryqq/playlist/123')).toBe('tencent')
      })

      it('应该检测移动端 i.y.qq.com', () => {
        expect(
          detectPlatformFromText('https://i.y.qq.com/n2/m/share/details/taoge.html?id=123')
        ).toBe('tencent')
      })
    })

    describe('Spotify 检测', () => {
      it('应该检测 Spotify URL', () => {
        expect(
          detectPlatformFromText('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')
        ).toBe('spotify')
      })

      it('应该检测 Spotify URI', () => {
        expect(detectPlatformFromText('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe('spotify')
      })
    })

    describe('无法检测', () => {
      it('其他 URL 应该返回 null', () => {
        expect(detectPlatformFromText('https://example.com/playlist')).toBeNull()
      })

      it('纯文本应该返回 null', () => {
        expect(detectPlatformFromText('just some text')).toBeNull()
      })

      it('空值应该返回 null', () => {
        expect(detectPlatformFromText('')).toBeNull()
        expect(detectPlatformFromText(null)).toBeNull()
        expect(detectPlatformFromText(undefined)).toBeNull()
      })
    })
  })

  describe('usePlaylistDetection', () => {
    it('应该返回正确的检测提示 - 网易云', () => {
      const inputRef = ref('https://music.163.com/playlist?id=123')
      const { detectedPlatformHint } = usePlaylistDetection(inputRef)
      expect(detectedPlatformHint.value).toBe('✓ 检测到网易云歌单')
    })

    it('应该返回正确的检测提示 - QQ音乐', () => {
      const inputRef = ref('https://y.qq.com/n/ryqq/playlist/123')
      const { detectedPlatformHint } = usePlaylistDetection(inputRef)
      expect(detectedPlatformHint.value).toBe('✓ 检测到QQ音乐歌单')
    })

    it('应该返回正确的检测提示 - Spotify', () => {
      const inputRef = ref('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')
      const { detectedPlatformHint } = usePlaylistDetection(inputRef)
      expect(detectedPlatformHint.value).toBe('✓ 检测到Spotify歌单')
    })

    it('无法检测时应该返回空字符串', () => {
      const inputRef = ref('random text')
      const { detectedPlatformHint } = usePlaylistDetection(inputRef)
      expect(detectedPlatformHint.value).toBe('')
    })

    it('输入变化时应该响应式更新', () => {
      const inputRef = ref('')
      const { detectedPlatformHint } = usePlaylistDetection(inputRef)

      expect(detectedPlatformHint.value).toBe('')

      inputRef.value = 'https://music.163.com/playlist?id=123'
      expect(detectedPlatformHint.value).toBe('✓ 检测到网易云歌单')

      inputRef.value = 'https://y.qq.com/n/ryqq/playlist/123'
      expect(detectedPlatformHint.value).toBe('✓ 检测到QQ音乐歌单')
    })

    it('应该导出工具函数', () => {
      const inputRef = ref('')
      const result = usePlaylistDetection(inputRef)

      expect(result.extractPlaylistId).toBe(extractPlaylistId)
      expect(result.detectPlatformFromText).toBe(detectPlatformFromText)
    })
  })
})
