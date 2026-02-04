/**
 * src/composables/useClipboardDetection.js 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useClipboardDetection } from '@/composables/useClipboardDetection.js'

describe('useClipboardDetection.js', () => {
  let originalClipboard
  let originalLocation

  beforeEach(() => {
    // 保存原始的 clipboard
    originalClipboard = navigator.clipboard

    // 保存原始的 location
    originalLocation = window.location

    // Mock window.location
    delete window.location
    window.location = {
      hostname: 'localhost',
      href: 'http://localhost:3000/',
      search: ''
    }

    // 重置模块状态（通过清除 lastDetectedKey）
    const { clearLastDetected } = useClipboardDetection()
    clearLastDetected()
  })

  afterEach(() => {
    // 恢复原始的 clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true
    })

    // 恢复原始的 location
    window.location = originalLocation
  })

  /**
   * 模拟 clipboard API
   * @param {string} text - 剪贴板内容
   */
  const mockClipboard = (text) => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn().mockResolvedValue(text)
      },
      writable: true,
      configurable: true
    })
  }

  /**
   * 模拟 clipboard API 抛出错误
   * @param {Error} error - 要抛出的错误
   */
  const mockClipboardError = (error) => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn().mockRejectedValue(error)
      },
      writable: true,
      configurable: true
    })
  }

  /**
   * 模拟 clipboard API 不可用
   */
  const mockClipboardUnavailable = () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true
    })
  }

  describe('checkClipboard - 歌单检测', () => {
    describe('网易云歌单检测', () => {
      it('应该检测网易云歌单 URL', async () => {
        mockClipboard('https://music.163.com/playlist?id=17543418420')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toEqual({
          type: 'playlist',
          platform: 'netease',
          playlistId: '17543418420',
          rawText: 'https://music.163.com/playlist?id=17543418420'
        })
      })

      it('应该检测带额外参数的网易云 URL', async () => {
        mockClipboard('https://music.163.com/playlist?id=123&userid=456&type=0')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toEqual({
          type: 'playlist',
          platform: 'netease',
          playlistId: '123',
          rawText: 'https://music.163.com/playlist?id=123&userid=456&type=0'
        })
      })
    })

    describe('QQ音乐歌单检测', () => {
      it('应该检测 QQ 音乐歌单 URL', async () => {
        mockClipboard('https://y.qq.com/n/ryqq/playlist/8888888888')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toEqual({
          type: 'playlist',
          platform: 'tencent',
          playlistId: '8888888888',
          rawText: 'https://y.qq.com/n/ryqq/playlist/8888888888'
        })
      })

      it('应该检测移动端 QQ 音乐 URL', async () => {
        mockClipboard('https://i.y.qq.com/n2/m/share/details/taoge.html?id=123456')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toEqual({
          type: 'playlist',
          platform: 'tencent',
          playlistId: '123456',
          rawText: 'https://i.y.qq.com/n2/m/share/details/taoge.html?id=123456'
        })
      })
    })

    describe('Spotify 歌单检测', () => {
      it('应该检测 Spotify 歌单 URL', async () => {
        mockClipboard('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toEqual({
          type: 'playlist',
          platform: 'spotify',
          playlistId: '37i9dQZF1DXcBWIGoYBM5M',
          rawText: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
        })
      })

      it('应该检测 Spotify URI', async () => {
        mockClipboard('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toEqual({
          type: 'playlist',
          platform: 'spotify',
          playlistId: '37i9dQZF1DXcBWIGoYBM5M',
          rawText: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
        })
      })
    })
  })

  describe('checkClipboard - 应用 URL 检测', () => {
    describe('localhost URL', () => {
      it('应该检测 localhost 应用 URL', async () => {
        mockClipboard('http://localhost:3000/?focus=25')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toEqual({
          type: 'appUrl',
          config: {
            focus: { focusDuration: 1500 }
          },
          warnings: [],
          rawText: 'http://localhost:3000/?focus=25'
        })
      })

      it('应该检测带完整配置的 localhost URL', async () => {
        mockClipboard('http://localhost:3000/?focus=25&short=5&long=15&interval=4')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result.type).toBe('appUrl')
        expect(result.config.focus).toEqual({
          focusDuration: 1500,
          shortBreakDuration: 300,
          longBreakDuration: 900,
          longBreakInterval: 4
        })
      })

      it('应该检测带歌单参数的 localhost URL', async () => {
        mockClipboard('http://localhost:3000/?playlist=netease%3A17543418420')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result.type).toBe('appUrl')
        expect(result.config.playlist).toEqual({
          platform: 'netease',
          id: '17543418420'
        })
      })

      it('应该检测带 autostart 和 save 参数的 URL', async () => {
        mockClipboard('http://localhost:3000/?focus=25&autostart=1&save=1')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result.type).toBe('appUrl')
        expect(result.config.autostart).toBe(true)
        expect(result.config.save).toBe(true)
      })
    })

    describe('127.0.0.1 URL', () => {
      it('应该检测 127.0.0.1 应用 URL', async () => {
        mockClipboard('http://127.0.0.1:3000/?focus=30')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result.type).toBe('appUrl')
        expect(result.config.focus.focusDuration).toBe(1800)
      })
    })

    describe('无效参数处理', () => {
      it('参数超出范围时应返回 null（无有效配置）', async () => {
        mockClipboard('http://localhost:3000/?focus=999')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        // focus=999 超出范围（1-120），无有效配置，返回 null
        expect(result).toBeNull()
      })

      it('部分参数有效时应返回 appUrl 和警告', async () => {
        mockClipboard('http://localhost:3000/?focus=25&short=999')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        // focus=25 有效，short=999 无效
        expect(result.type).toBe('appUrl')
        expect(result.config.focus.focusDuration).toBe(1500)
        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.warnings[0]).toContain('short')
      })

      it('无有效参数时应返回 null', async () => {
        mockClipboard('http://localhost:3000/')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toBeNull()
      })

      it('无有效参数值时应返回 null', async () => {
        mockClipboard('http://localhost:3000/?invalid=test')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toBeNull()
      })
    })

    describe('非应用 URL', () => {
      it('不应检测其他域名的 URL', async () => {
        mockClipboard('https://example.com/?focus=25')
        const { checkClipboard } = useClipboardDetection()

        const result = await checkClipboard()

        expect(result).toBeNull()
      })
    })
  })

  describe('应用 URL 优先于歌单 URL', () => {
    it('应用 URL 应该优先于歌单平台检测', async () => {
      // 这个 URL 同时是本应用 URL 并且包含有效参数
      mockClipboard('http://localhost:3000/?playlist=netease%3A123')
      const { checkClipboard } = useClipboardDetection()

      const result = await checkClipboard()

      // 应该被识别为 appUrl 而非 playlist
      expect(result.type).toBe('appUrl')
      expect(result.config.playlist).toEqual({
        platform: 'netease',
        id: '123'
      })
    })
  })

  describe('防重复检测', () => {
    it('相同 URL 第二次检测应该返回 null', async () => {
      mockClipboard('https://music.163.com/playlist?id=123')
      const { checkClipboard } = useClipboardDetection()

      // 第一次检测
      const result1 = await checkClipboard()
      expect(result1).not.toBeNull()

      // 第二次检测同一 URL
      const result2 = await checkClipboard()
      expect(result2).toBeNull()
    })

    it('不同 URL 应该都能检测到', async () => {
      const { checkClipboard } = useClipboardDetection()

      // 第一个 URL
      mockClipboard('https://music.163.com/playlist?id=123')
      const result1 = await checkClipboard()
      expect(result1).not.toBeNull()
      expect(result1.playlistId).toBe('123')

      // 不同的 URL
      mockClipboard('https://music.163.com/playlist?id=456')
      const result2 = await checkClipboard()
      expect(result2).not.toBeNull()
      expect(result2.playlistId).toBe('456')
    })

    it('clearLastDetected 应该允许重新检测同一 URL', async () => {
      mockClipboard('https://music.163.com/playlist?id=123')
      const { checkClipboard, clearLastDetected } = useClipboardDetection()

      // 第一次检测
      const result1 = await checkClipboard()
      expect(result1).not.toBeNull()

      // 清除记录
      clearLastDetected()

      // 再次检测同一 URL
      const result2 = await checkClipboard()
      expect(result2).not.toBeNull()
    })

    it('应用 URL 也应该防重复', async () => {
      mockClipboard('http://localhost:3000/?focus=25')
      const { checkClipboard } = useClipboardDetection()

      const result1 = await checkClipboard()
      expect(result1).not.toBeNull()

      const result2 = await checkClipboard()
      expect(result2).toBeNull()
    })
  })

  describe('无效内容处理', () => {
    it('空剪贴板应该返回 null', async () => {
      mockClipboard('')
      const { checkClipboard } = useClipboardDetection()

      const result = await checkClipboard()
      expect(result).toBeNull()
    })

    it('纯空格应该返回 null', async () => {
      mockClipboard('   ')
      const { checkClipboard } = useClipboardDetection()

      const result = await checkClipboard()
      expect(result).toBeNull()
    })

    it('非歌单 URL 应该返回 null', async () => {
      mockClipboard('https://example.com/some-page')
      const { checkClipboard } = useClipboardDetection()

      const result = await checkClipboard()
      expect(result).toBeNull()
    })

    it('普通文本应该返回 null', async () => {
      mockClipboard('Hello World')
      const { checkClipboard } = useClipboardDetection()

      const result = await checkClipboard()
      expect(result).toBeNull()
    })

    it('应该去除 URL 前后的空格', async () => {
      mockClipboard('  https://music.163.com/playlist?id=123  ')
      const { checkClipboard } = useClipboardDetection()

      const result = await checkClipboard()

      expect(result).not.toBeNull()
      expect(result.playlistId).toBe('123')
    })
  })

  describe('错误处理', () => {
    it('权限被拒绝应该返回 null', async () => {
      const notAllowedError = new Error('Permission denied')
      notAllowedError.name = 'NotAllowedError'
      mockClipboardError(notAllowedError)

      const { checkClipboard } = useClipboardDetection()
      const result = await checkClipboard()

      expect(result).toBeNull()
    })

    it('其他错误应该返回 null', async () => {
      mockClipboardError(new Error('Some error'))

      const { checkClipboard } = useClipboardDetection()
      const result = await checkClipboard()

      expect(result).toBeNull()
    })

    it('Clipboard API 不可用应该返回 null', async () => {
      mockClipboardUnavailable()

      const { checkClipboard } = useClipboardDetection()
      const result = await checkClipboard()

      expect(result).toBeNull()
    })
  })

  describe('lastDetectedKey / lastDetectedUrl', () => {
    it('应该初始为空字符串', () => {
      const { lastDetectedKey, clearLastDetected } = useClipboardDetection()
      clearLastDetected()
      expect(lastDetectedKey.value).toBe('')
    })

    it('检测歌单成功后应该更新为 playlist:platform:id 格式', async () => {
      mockClipboard('https://music.163.com/playlist?id=123')
      const { checkClipboard, lastDetectedKey, clearLastDetected } = useClipboardDetection()
      clearLastDetected()

      await checkClipboard()

      expect(lastDetectedKey.value).toBe('playlist:netease:123')
    })

    it('检测应用 URL 成功后应该更新为 appUrl:search 格式', async () => {
      mockClipboard('http://localhost:3000/?focus=25')
      const { checkClipboard, lastDetectedKey, clearLastDetected } = useClipboardDetection()
      clearLastDetected()

      await checkClipboard()

      expect(lastDetectedKey.value).toBe('appUrl:?focus=25')
    })

    it('检测失败时不应该更新', async () => {
      mockClipboard('random text')
      const { checkClipboard, lastDetectedKey, clearLastDetected } = useClipboardDetection()
      clearLastDetected()

      await checkClipboard()

      expect(lastDetectedKey.value).toBe('')
    })

    it('lastDetectedUrl 应该是 lastDetectedKey 的别名', () => {
      const { lastDetectedKey, lastDetectedUrl } = useClipboardDetection()
      expect(lastDetectedUrl).toBe(lastDetectedKey)
    })
  })
})
