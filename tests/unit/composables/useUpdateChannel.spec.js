/**
 * src/composables/useUpdateChannel.js 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { STORAGE_KEYS, UPDATE_CHANNEL_CONFIG, VERSION_CONFIG } from '@/config/constants.js'

describe('useUpdateChannel.js', () => {
  let originalLocation

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()

    // 保存原始值
    originalLocation = window.location

    // Mock window.location
    delete window.location
    window.location = {
      pathname: '/',
      href: 'http://localhost:3000/',
      replace: vi.fn()
    }

    // 确保 navigator.serviceWorker 有 getRegistrations
    if (navigator.serviceWorker && !navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations = vi.fn().mockResolvedValue([])
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.location = originalLocation
  })

  const getUseUpdateChannel = async () => {
    const { useUpdateChannel } = await import('@/composables/useUpdateChannel.js')
    return useUpdateChannel()
  }

  describe('初始状态', () => {
    it('默认通道应该是 stable', async () => {
      const uc = await getUseUpdateChannel()
      expect(uc.channel.value).toBe(UPDATE_CHANNEL_CONFIG.STABLE)
      expect(uc.isStable.value).toBe(true)
      expect(uc.isBeta.value).toBe(false)
    })

    it('应该从 localStorage 读取已保存的通道', async () => {
      localStorage.setItem(STORAGE_KEYS.UPDATE_CHANNEL, UPDATE_CHANNEL_CONFIG.BETA)

      const uc = await getUseUpdateChannel()
      expect(uc.channel.value).toBe(UPDATE_CHANNEL_CONFIG.BETA)
      expect(uc.isBeta.value).toBe(true)
      expect(uc.isStable.value).toBe(false)
    })

    it('hasNewRelease 初始值应该为 false', async () => {
      const uc = await getUseUpdateChannel()
      expect(uc.hasNewRelease.value).toBe(false)
    })

    it('latestVersion 初始值应该为 null', async () => {
      const uc = await getUseUpdateChannel()
      expect(uc.latestVersion.value).toBeNull()
    })
  })

  describe('isVersionedPath', () => {
    it('根路径不应该是版本子路径', async () => {
      window.location.pathname = '/'
      const uc = await getUseUpdateChannel()
      expect(uc.isVersionedPath.value).toBe(false)
    })

    it('/v/1.0.0/ 应该是版本子路径', async () => {
      window.location.pathname = '/v/1.0.0/'
      const uc = await getUseUpdateChannel()
      expect(uc.isVersionedPath.value).toBe(true)
    })

    it('/v/1.0.0/index.html 应该是版本子路径', async () => {
      window.location.pathname = '/v/1.0.0/index.html'
      const uc = await getUseUpdateChannel()
      expect(uc.isVersionedPath.value).toBe(true)
    })
  })

  describe('pathVersion', () => {
    it('根路径应该返回 null', async () => {
      window.location.pathname = '/'
      const uc = await getUseUpdateChannel()
      expect(uc.pathVersion.value).toBeNull()
    })

    it('/v/1.0.0/ 应该返回 1.0.0', async () => {
      window.location.pathname = '/v/1.0.0/'
      const uc = await getUseUpdateChannel()
      expect(uc.pathVersion.value).toBe('1.0.0')
    })

    it('/v/2.1.3-beta/ 应该返回 2.1.3-beta', async () => {
      window.location.pathname = '/v/2.1.3-beta/'
      const uc = await getUseUpdateChannel()
      expect(uc.pathVersion.value).toBe('2.1.3-beta')
    })
  })

  describe('setChannel', () => {
    it('应该更新通道状态和 localStorage', async () => {
      const uc = await getUseUpdateChannel()

      uc.setChannel(UPDATE_CHANNEL_CONFIG.BETA)

      expect(uc.channel.value).toBe(UPDATE_CHANNEL_CONFIG.BETA)
      expect(uc.isBeta.value).toBe(true)
      expect(localStorage.getItem(STORAGE_KEYS.UPDATE_CHANNEL)).toBe(UPDATE_CHANNEL_CONFIG.BETA)
    })
  })

  describe('fetchLatestVersion', () => {
    it('应该正确解析 versions.json', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ latest: '1.2.0', versions: ['1.0.0', '1.1.0', '1.2.0'] })
      })

      const uc = await getUseUpdateChannel()
      const latest = await uc.fetchLatestVersion()

      expect(latest).toBe('1.2.0')
      expect(uc.latestVersion.value).toBe('1.2.0')
      expect(globalThis.fetch).toHaveBeenCalledWith(VERSION_CONFIG.VERSIONS_FILE, {
        signal: expect.any(AbortSignal),
        cache: 'no-store'
      })
    })

    it('fetch 失败时应该返回 null', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

      const uc = await getUseUpdateChannel()
      const latest = await uc.fetchLatestVersion()

      expect(latest).toBeNull()
    })

    it('网络错误时应该返回 null', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const uc = await getUseUpdateChannel()
      const latest = await uc.fetchLatestVersion()

      expect(latest).toBeNull()
    })
  })

  describe('checkForNewRelease', () => {
    it('不在版本子路径时应该返回 false', async () => {
      window.location.pathname = '/'

      const uc = await getUseUpdateChannel()
      const hasNew = await uc.checkForNewRelease()

      expect(hasNew).toBe(false)
      expect(uc.hasNewRelease.value).toBe(false)
    })

    it('版本相同时应该返回 false', async () => {
      window.location.pathname = '/v/1.0.0/'
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ latest: '1.0.0' })
      })

      const uc = await getUseUpdateChannel()
      const hasNew = await uc.checkForNewRelease()

      expect(hasNew).toBe(false)
      expect(uc.hasNewRelease.value).toBe(false)
    })

    it('有新版本时应该返回 true', async () => {
      window.location.pathname = '/v/1.0.0/'
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ latest: '1.1.0' })
      })

      const uc = await getUseUpdateChannel()
      const hasNew = await uc.checkForNewRelease()

      expect(hasNew).toBe(true)
      expect(uc.hasNewRelease.value).toBe(true)
      expect(uc.latestVersion.value).toBe('1.1.0')
    })
  })

  describe('switchToBeta', () => {
    it('应该设置通道为 beta 并跳转到根路径', async () => {
      window.location.pathname = '/v/1.0.0/'

      const uc = await getUseUpdateChannel()
      await uc.switchToBeta()

      expect(uc.channel.value).toBe(UPDATE_CHANNEL_CONFIG.BETA)
      expect(localStorage.getItem(STORAGE_KEYS.UPDATE_CHANNEL)).toBe(UPDATE_CHANNEL_CONFIG.BETA)
      expect(window.location.href).toBe('/')
    })
  })

  describe('switchToStable', () => {
    it('应该设置通道为 stable 并跳转到版本子路径', async () => {
      localStorage.setItem(STORAGE_KEYS.UPDATE_CHANNEL, UPDATE_CHANNEL_CONFIG.BETA)
      window.location.pathname = '/'
      const originalHref = 'http://localhost:3000/'
      window.location.href = originalHref
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ latest: '1.2.0' })
      })

      const uc = await getUseUpdateChannel()
      await uc.switchToStable()

      expect(uc.channel.value).toBe(UPDATE_CHANNEL_CONFIG.STABLE)
      expect(localStorage.getItem(STORAGE_KEYS.UPDATE_CHANNEL)).toBe(UPDATE_CHANNEL_CONFIG.STABLE)
      expect(window.location.href).toBe(`${VERSION_CONFIG.VERSION_PATH_PREFIX}1.2.0/`)
    })

    it('获取版本失败时不应该跳转', async () => {
      localStorage.setItem(STORAGE_KEYS.UPDATE_CHANNEL, UPDATE_CHANNEL_CONFIG.BETA)
      window.location.pathname = '/'
      const originalHref = 'http://localhost:3000/'
      window.location.href = originalHref
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

      const uc = await getUseUpdateChannel()
      await uc.switchToStable()

      expect(uc.channel.value).toBe(UPDATE_CHANNEL_CONFIG.STABLE)
      expect(window.location.href).toBe(originalHref)
    })
  })

  describe('upgradeToLatestRelease', () => {
    it('应该跳转到最新版本路径', async () => {
      window.location.pathname = '/v/1.0.0/'
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ latest: '1.2.0' })
      })

      const uc = await getUseUpdateChannel()
      await uc.upgradeToLatestRelease()

      expect(window.location.href).toBe(`${VERSION_CONFIG.VERSION_PATH_PREFIX}1.2.0/`)
    })

    it('如果 latestVersion 已存在，不应该重新获取', async () => {
      window.location.pathname = '/v/1.0.0/'
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ latest: '1.1.0' })
      })

      const uc = await getUseUpdateChannel()
      await uc.fetchLatestVersion()
      expect(uc.latestVersion.value).toBe('1.1.0')

      globalThis.fetch.mockClear()

      await uc.upgradeToLatestRelease()

      expect(globalThis.fetch).not.toHaveBeenCalled()
      expect(window.location.href).toBe(`${VERSION_CONFIG.VERSION_PATH_PREFIX}1.1.0/`)
    })
  })
})
