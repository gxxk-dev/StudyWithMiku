/**
 * mediaSessionBridge 测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { setupMediaSession, cleanupMediaSession } from '../../../src/player/mediaSessionBridge.js'
import { PlaybackState } from '../../../src/player/constants.js'

// 模拟 MediaMetadata
class MockMediaMetadata {
  constructor(data) {
    this.title = data.title
    this.artist = data.artist
    this.album = data.album
    this.artwork = data.artwork
  }
}

// 模拟 navigator.mediaSession
const mockMediaSession = {
  metadata: null,
  playbackState: 'none',
  setPositionState: vi.fn(),
  setActionHandler: vi.fn()
}

// 模拟 usePlayer 返回值
function createMockPlayer() {
  return {
    playbackState: ref(PlaybackState.IDLE),
    currentTrack: ref(null),
    currentTime: ref(0),
    duration: ref(0),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    skipNext: vi.fn(),
    skipPrevious: vi.fn()
  }
}

describe('mediaSessionBridge', () => {
  let originalMediaSession
  let originalMediaMetadata
  let mockPlayer

  beforeEach(() => {
    // 保存原始值
    originalMediaSession = navigator.mediaSession
    originalMediaMetadata = globalThis.MediaMetadata

    // 设置 mock
    Object.defineProperty(navigator, 'mediaSession', {
      value: mockMediaSession,
      writable: true,
      configurable: true
    })

    // Mock MediaMetadata
    globalThis.MediaMetadata = MockMediaMetadata

    // 重置 mock
    mockMediaSession.metadata = null
    mockMediaSession.playbackState = 'none'
    mockMediaSession.setPositionState.mockClear()
    mockMediaSession.setActionHandler.mockClear()

    // 创建 mock player
    mockPlayer = createMockPlayer()

    // 先清理可能存在的状态
    cleanupMediaSession()
  })

  afterEach(() => {
    cleanupMediaSession()

    // 恢复原始值
    Object.defineProperty(navigator, 'mediaSession', {
      value: originalMediaSession,
      writable: true,
      configurable: true
    })

    if (originalMediaMetadata) {
      globalThis.MediaMetadata = originalMediaMetadata
    } else {
      delete globalThis.MediaMetadata
    }
  })

  describe('setupMediaSession', () => {
    it('应该返回 cleanup 函数', () => {
      const cleanup = setupMediaSession(mockPlayer)
      expect(typeof cleanup).toBe('function')
    })

    it('应该注册 action handlers', () => {
      setupMediaSession(mockPlayer)

      const registeredActions = mockMediaSession.setActionHandler.mock.calls.map((call) => call[0])

      expect(registeredActions).toContain('play')
      expect(registeredActions).toContain('pause')
      expect(registeredActions).toContain('previoustrack')
      expect(registeredActions).toContain('nexttrack')
      expect(registeredActions).toContain('seekforward')
      expect(registeredActions).toContain('seekbackward')
      expect(registeredActions).toContain('seekto')
    })
  })

  describe('元数据更新', () => {
    it('应该在 currentTrack 变化时更新 metadata', async () => {
      setupMediaSession(mockPlayer)

      mockPlayer.currentTrack.value = {
        name: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        cover: 'https://example.com/cover.jpg'
      }
      await nextTick()

      expect(mockMediaSession.metadata).toBeTruthy()
      expect(mockMediaSession.metadata.title).toBe('Test Song')
      expect(mockMediaSession.metadata.artist).toBe('Test Artist')
    })

    it('currentTrack 为 null 时应该清空 metadata', async () => {
      setupMediaSession(mockPlayer)

      mockPlayer.currentTrack.value = { name: 'Test', artist: 'Test' }
      await nextTick()

      mockPlayer.currentTrack.value = null
      await nextTick()

      expect(mockMediaSession.metadata).toBeNull()
    })
  })

  describe('播放状态更新', () => {
    it('PLAYING 状态应该设置为 playing', async () => {
      setupMediaSession(mockPlayer)

      mockPlayer.playbackState.value = PlaybackState.PLAYING
      await nextTick()

      expect(mockMediaSession.playbackState).toBe('playing')
    })

    it('PAUSED 状态应该设置为 paused', async () => {
      setupMediaSession(mockPlayer)

      mockPlayer.playbackState.value = PlaybackState.PAUSED
      await nextTick()

      expect(mockMediaSession.playbackState).toBe('paused')
    })

    it('IDLE 状态应该设置为 paused', async () => {
      setupMediaSession(mockPlayer)

      mockPlayer.playbackState.value = PlaybackState.IDLE
      await nextTick()

      expect(mockMediaSession.playbackState).toBe('paused')
    })
  })

  describe('Action handlers', () => {
    it('play action 应该调用 player.play', () => {
      setupMediaSession(mockPlayer)

      // 找到 play handler
      const playCall = mockMediaSession.setActionHandler.mock.calls.find(
        (call) => call[0] === 'play'
      )
      const playHandler = playCall[1]

      playHandler()

      expect(mockPlayer.play).toHaveBeenCalled()
    })

    it('pause action 应该调用 player.pause', () => {
      setupMediaSession(mockPlayer)

      const pauseCall = mockMediaSession.setActionHandler.mock.calls.find(
        (call) => call[0] === 'pause'
      )
      const pauseHandler = pauseCall[1]

      pauseHandler()

      expect(mockPlayer.pause).toHaveBeenCalled()
    })

    it('nexttrack action 应该调用 player.skipNext', () => {
      setupMediaSession(mockPlayer)

      const nextCall = mockMediaSession.setActionHandler.mock.calls.find(
        (call) => call[0] === 'nexttrack'
      )
      const nextHandler = nextCall[1]

      nextHandler()

      expect(mockPlayer.skipNext).toHaveBeenCalled()
    })

    it('previoustrack action 应该调用 player.skipPrevious', () => {
      setupMediaSession(mockPlayer)

      const prevCall = mockMediaSession.setActionHandler.mock.calls.find(
        (call) => call[0] === 'previoustrack'
      )
      const prevHandler = prevCall[1]

      prevHandler()

      expect(mockPlayer.skipPrevious).toHaveBeenCalled()
    })

    it('seekto action 应该调用 player.seek', () => {
      setupMediaSession(mockPlayer)

      const seekCall = mockMediaSession.setActionHandler.mock.calls.find(
        (call) => call[0] === 'seekto'
      )
      const seekHandler = seekCall[1]

      seekHandler({ seekTime: 30 })

      expect(mockPlayer.seek).toHaveBeenCalledWith(30)
    })
  })

  describe('cleanupMediaSession', () => {
    it('应该清除 action handlers', () => {
      setupMediaSession(mockPlayer)
      mockMediaSession.setActionHandler.mockClear()

      cleanupMediaSession()

      // 应该注销所有 handlers（设置为 null）
      const nullCalls = mockMediaSession.setActionHandler.mock.calls.filter(
        (call) => call[1] === null
      )
      expect(nullCalls.length).toBeGreaterThan(0)
    })

    it('应该重置 metadata 和 playbackState', () => {
      setupMediaSession(mockPlayer)

      cleanupMediaSession()

      expect(mockMediaSession.metadata).toBeNull()
      expect(mockMediaSession.playbackState).toBe('none')
    })
  })

  describe('防止重复设置', () => {
    it('重复调用 setupMediaSession 应该先清理旧的', () => {
      setupMediaSession(mockPlayer)

      // 清除 mock 以便检测新的调用
      mockMediaSession.setActionHandler.mockClear()

      // 再次设置
      setupMediaSession(mockPlayer)

      // 应该先注销旧的 handlers（设置为 null），然后注册新的
      const calls = mockMediaSession.setActionHandler.mock.calls
      expect(calls.length).toBeGreaterThan(7) // 7 个 null + 7 个新 handler
    })
  })
})
