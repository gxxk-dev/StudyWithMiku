/**
 * PlayerAdapter 抽象基类测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlayerAdapter } from '../../../src/player/PlayerAdapter.js'
import { PlaybackState, PlayerEvent, RepeatMode } from '../../../src/player/constants.js'

describe('PlayerAdapter', () => {
  let adapter

  beforeEach(() => {
    adapter = new PlayerAdapter()
  })

  describe('事件发射器', () => {
    it('应该能注册和触发事件', () => {
      const callback = vi.fn()
      adapter.on('test', callback)

      adapter.emit('test', { data: 'value' })

      expect(callback).toHaveBeenCalledWith({ data: 'value' })
    })

    it('应该能取消事件监听', () => {
      const callback = vi.fn()
      adapter.on('test', callback)
      adapter.off('test', callback)

      adapter.emit('test')

      expect(callback).not.toHaveBeenCalled()
    })

    it('on 应该返回取消订阅函数', () => {
      const callback = vi.fn()
      const unsubscribe = adapter.on('test', callback)

      unsubscribe()
      adapter.emit('test')

      expect(callback).not.toHaveBeenCalled()
    })

    it('应该能移除所有监听器', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      adapter.on('test1', callback1)
      adapter.on('test2', callback2)

      adapter.removeAllListeners()
      adapter.emit('test1')
      adapter.emit('test2')

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })

    it('回调错误不应该影响其他回调', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error')
      })
      const normalCallback = vi.fn()
      adapter.on('test', errorCallback)
      adapter.on('test', normalCallback)

      // 不应该抛出错误
      expect(() => adapter.emit('test')).not.toThrow()
      expect(normalCallback).toHaveBeenCalled()
    })
  })

  describe('状态管理', () => {
    it('初始状态应该是 IDLE', () => {
      expect(adapter.getPlaybackState()).toBe(PlaybackState.IDLE)
    })

    it('_setPlaybackState 应该更新状态并触发事件', () => {
      const callback = vi.fn()
      adapter.on(PlayerEvent.STATE_CHANGE, callback)

      adapter._setPlaybackState(PlaybackState.PLAYING)

      expect(adapter.getPlaybackState()).toBe(PlaybackState.PLAYING)
      expect(callback).toHaveBeenCalledWith(PlaybackState.PLAYING)
    })

    it('相同状态不应该重复触发事件', () => {
      const callback = vi.fn()
      adapter._setPlaybackState(PlaybackState.PLAYING)
      adapter.on(PlayerEvent.STATE_CHANGE, callback)

      adapter._setPlaybackState(PlaybackState.PLAYING)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('循环模式', () => {
    it('初始循环模式应该是 ALL', () => {
      expect(adapter.getRepeatMode()).toBe(RepeatMode.ALL)
    })

    it('应该能设置循环模式', () => {
      adapter.setRepeatMode(RepeatMode.ONE)
      expect(adapter.getRepeatMode()).toBe(RepeatMode.ONE)

      adapter.setRepeatMode(RepeatMode.NONE)
      expect(adapter.getRepeatMode()).toBe(RepeatMode.NONE)
    })

    it('无效的循环模式应该被忽略', () => {
      adapter.setRepeatMode('invalid')
      expect(adapter.getRepeatMode()).toBe(RepeatMode.ALL)
    })
  })

  describe('曲目管理', () => {
    it('初始状态没有曲目', () => {
      expect(adapter.getCurrentTrack()).toBeNull()
      expect(adapter.getCurrentTrackIndex()).toBe(0)
      expect(adapter.getTrackList()).toEqual([])
      expect(adapter.getTrackCount()).toBe(0)
    })
  })

  describe('能力查询', () => {
    it('默认不支持歌词', () => {
      expect(adapter.supportsLyrics()).toBe(false)
    })

    it('默认支持跳转', () => {
      expect(adapter.supportsSeek()).toBe(true)
    })

    it('默认没有内置 UI', () => {
      expect(adapter.hasBuiltInUI()).toBe(false)
    })

    it('默认不是内部管理播放列表', () => {
      expect(adapter.hasInternalPlaylist()).toBe(false)
    })
  })

  describe('生命周期', () => {
    it('初始未初始化', () => {
      expect(adapter.isInitialized()).toBe(false)
    })

    it('destroy 应该重置状态', async () => {
      adapter._initialized = true
      adapter._tracks = [{ id: '1' }]
      adapter._currentIndex = 5
      adapter._state = PlaybackState.PLAYING
      adapter.on('test', vi.fn())

      await adapter.destroy()

      expect(adapter.isInitialized()).toBe(false)
      expect(adapter.getTrackList()).toEqual([])
      expect(adapter.getCurrentTrackIndex()).toBe(0)
      expect(adapter.getPlaybackState()).toBe(PlaybackState.IDLE)
    })
  })

  describe('抽象方法', () => {
    it('initialize 应该抛出错误', async () => {
      await expect(adapter.initialize()).rejects.toThrow('子类必须实现')
    })

    it('play 应该抛出错误', async () => {
      await expect(adapter.play()).rejects.toThrow('子类必须实现')
    })

    it('pause 应该抛出错误', async () => {
      await expect(adapter.pause()).rejects.toThrow('子类必须实现')
    })

    it('stop 应该抛出错误', async () => {
      await expect(adapter.stop()).rejects.toThrow('子类必须实现')
    })

    it('seek 应该抛出错误', async () => {
      await expect(adapter.seek(10)).rejects.toThrow('子类必须实现')
    })

    it('getVolume 应该抛出错误', () => {
      expect(() => adapter.getVolume()).toThrow('子类必须实现')
    })

    it('setVolume 应该抛出错误', () => {
      expect(() => adapter.setVolume(0.5)).toThrow('子类必须实现')
    })

    it('getCurrentTime 应该抛出错误', () => {
      expect(() => adapter.getCurrentTime()).toThrow('子类必须实现')
    })

    it('getDuration 应该抛出错误', () => {
      expect(() => adapter.getDuration()).toThrow('子类必须实现')
    })

    it('loadPlaylist 应该抛出错误', async () => {
      await expect(adapter.loadPlaylist([])).rejects.toThrow('子类必须实现')
    })

    it('skipNext 应该抛出错误', async () => {
      await expect(adapter.skipNext()).rejects.toThrow('子类必须实现')
    })

    it('skipPrevious 应该抛出错误', async () => {
      await expect(adapter.skipPrevious()).rejects.toThrow('子类必须实现')
    })

    it('switchTrack 应该抛出错误', async () => {
      await expect(adapter.switchTrack(0)).rejects.toThrow('子类必须实现')
    })

    it('getAdapterType 应该抛出错误', () => {
      expect(() => adapter.getAdapterType()).toThrow('子类必须实现')
    })
  })
})
