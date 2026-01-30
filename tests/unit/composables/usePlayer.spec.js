/**
 * usePlayer composable 测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { usePlayer } from '../../../src/composables/usePlayer.js'
import { PlaybackState, PlayerEvent, RepeatMode } from '../../../src/player/constants.js'

// 创建模拟适配器
function createMockAdapter() {
  const listeners = new Map()

  return {
    _state: PlaybackState.IDLE,
    _volume: 0.7,
    _currentTime: 0,
    _duration: 100,
    _tracks: [],
    _currentIndex: 0,
    _initialized: false,

    on(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event).add(callback)
      return () => listeners.get(event)?.delete(callback)
    },

    emit(event, data) {
      const cbs = listeners.get(event)
      if (cbs) {
        cbs.forEach((cb) => cb(data))
      }
    },

    removeAllListeners() {
      listeners.clear()
    },

    async initialize() {
      this._initialized = true
      this.emit(PlayerEvent.READY)
    },

    async destroy() {
      this._initialized = false
      listeners.clear()
    },

    isInitialized() {
      return this._initialized
    },

    getAdapterType() {
      return 'mock'
    },

    getPlaybackState() {
      return this._state
    },

    getVolume() {
      return this._volume
    },

    setVolume(v) {
      this._volume = Math.max(0, Math.min(1, v))
      this.emit(PlayerEvent.VOLUME_CHANGE, this._volume)
    },

    getCurrentTime() {
      return this._currentTime
    },

    getDuration() {
      return this._duration
    },

    getCurrentTrack() {
      return this._tracks[this._currentIndex] || null
    },

    getCurrentTrackIndex() {
      return this._currentIndex
    },

    getTrackList() {
      return [...this._tracks]
    },

    async play() {
      this._state = PlaybackState.PLAYING
      this.emit(PlayerEvent.PLAY)
    },

    async pause() {
      this._state = PlaybackState.PAUSED
      this.emit(PlayerEvent.PAUSE)
    },

    async stop() {
      this._state = PlaybackState.IDLE
      this.emit(PlayerEvent.STOP)
    },

    async seek(time) {
      this._currentTime = time
    },

    async skipNext() {},

    async skipPrevious() {},

    async switchTrack(index) {
      this._currentIndex = index
      this.emit(PlayerEvent.TRACK_CHANGE, {
        index,
        track: this._tracks[index]
      })
    },

    async loadPlaylist(tracks) {
      this._tracks = tracks
      this.emit(PlayerEvent.PLAYLIST_LOADED, { tracks })
    },

    supportsLyrics() {
      return false
    },

    supportsSeek() {
      return true
    },

    hasBuiltInUI() {
      return false
    },

    hasInternalPlaylist() {
      return false
    }
  }
}

describe('usePlayer', () => {
  let player
  let mockAdapter

  beforeEach(async () => {
    // 获取 player 实例
    player = usePlayer()

    // 清理之前的状态
    await player.destroy()

    // 创建新的模拟适配器
    mockAdapter = createMockAdapter()
  })

  afterEach(async () => {
    await player.destroy()
  })

  describe('适配器管理', () => {
    it('初始状态没有适配器', () => {
      expect(player.getAdapter()).toBeNull()
      expect(player.adapterType.value).toBe('')
    })

    it('应该能设置适配器', async () => {
      await player.setAdapter(mockAdapter)

      expect(player.getAdapter()).toBe(mockAdapter)
      expect(player.adapterType.value).toBe('mock')
    })

    it('设置新适配器应该销毁旧适配器', async () => {
      const oldAdapter = createMockAdapter()
      const destroySpy = vi.spyOn(oldAdapter, 'destroy')

      await player.setAdapter(oldAdapter)
      await player.setAdapter(mockAdapter)

      expect(destroySpy).toHaveBeenCalled()
    })
  })

  describe('播放控制', () => {
    beforeEach(async () => {
      await player.setAdapter(mockAdapter)
      await mockAdapter.initialize()
    })

    it('play 应该调用适配器的 play', async () => {
      const playSpy = vi.spyOn(mockAdapter, 'play')

      await player.play()

      expect(playSpy).toHaveBeenCalled()
    })

    it('pause 应该调用适配器的 pause', async () => {
      const pauseSpy = vi.spyOn(mockAdapter, 'pause')

      await player.pause()

      expect(pauseSpy).toHaveBeenCalled()
    })

    it('stop 应该调用适配器的 stop', async () => {
      const stopSpy = vi.spyOn(mockAdapter, 'stop')

      await player.stop()

      expect(stopSpy).toHaveBeenCalled()
    })

    it('seek 应该调用适配器的 seek', async () => {
      const seekSpy = vi.spyOn(mockAdapter, 'seek')

      await player.seek(50)

      expect(seekSpy).toHaveBeenCalledWith(50)
    })
  })

  describe('响应式状态', () => {
    beforeEach(async () => {
      await player.setAdapter(mockAdapter)
      await mockAdapter.initialize()
    })

    it('播放事件应该更新 playbackState', async () => {
      await player.play()
      await nextTick()

      expect(player.playbackState.value).toBe(PlaybackState.PLAYING)
      expect(player.isPlaying.value).toBe(true)
      expect(player.isPaused.value).toBe(false)
    })

    it('暂停事件应该更新 playbackState', async () => {
      await player.play()
      await player.pause()
      await nextTick()

      expect(player.playbackState.value).toBe(PlaybackState.PAUSED)
      expect(player.isPaused.value).toBe(true)
      expect(player.isPlaying.value).toBe(false)
    })

    it('音量变化应该更新 volume', async () => {
      player.setVolume(0.5)
      await nextTick()

      expect(player.volume.value).toBe(0.5)
    })
  })

  describe('音量控制', () => {
    beforeEach(async () => {
      await player.setAdapter(mockAdapter)
      await mockAdapter.initialize()
    })

    it('getVolume 应该返回当前音量', () => {
      expect(player.getVolume()).toBe(0.7)
    })

    it('setVolume 应该设置音量', () => {
      player.setVolume(0.3)
      expect(player.getVolume()).toBe(0.3)
    })
  })

  describe('曲目管理', () => {
    beforeEach(async () => {
      await player.setAdapter(mockAdapter)
      await mockAdapter.initialize()
    })

    it('loadPlaylist 应该加载曲目', async () => {
      const tracks = [
        { id: '1', name: 'Song 1', artist: 'Artist 1' },
        { id: '2', name: 'Song 2', artist: 'Artist 2' }
      ]

      await player.loadPlaylist(tracks)
      await nextTick()

      expect(player.trackList.value).toHaveLength(2)
    })

    it('switchTrack 应该切换曲目', async () => {
      const tracks = [
        { id: '1', name: 'Song 1', artist: 'Artist 1' },
        { id: '2', name: 'Song 2', artist: 'Artist 2' }
      ]

      await player.loadPlaylist(tracks)
      await player.switchTrack(1)
      await nextTick()

      expect(player.trackIndex.value).toBe(1)
    })
  })

  describe('能力查询', () => {
    beforeEach(async () => {
      await player.setAdapter(mockAdapter)
    })

    it('hasCapability 应该查询适配器能力', () => {
      expect(player.hasCapability('lyrics')).toBe(false)
      expect(player.hasCapability('seek')).toBe(true)
      expect(player.hasCapability('builtInUI')).toBe(false)
      expect(player.hasCapability('internalPlaylist')).toBe(false)
    })

    it('没有适配器时应该返回 false', async () => {
      await player.destroy()
      expect(player.hasCapability('seek')).toBe(false)
    })
  })

  describe('销毁', () => {
    it('destroy 应该重置所有状态', async () => {
      await player.setAdapter(mockAdapter)
      await mockAdapter.initialize()
      await player.loadPlaylist([{ id: '1', name: 'Test', artist: 'Test' }])

      await player.destroy()

      expect(player.getAdapter()).toBeNull()
      expect(player.playbackState.value).toBe(PlaybackState.IDLE)
      expect(player.trackList.value).toEqual([])
      expect(player.adapterType.value).toBe('')
    })
  })

  describe('Computed 属性', () => {
    beforeEach(async () => {
      await player.setAdapter(mockAdapter)
      await mockAdapter.initialize()
    })

    it('progress 应该正确计算', async () => {
      mockAdapter._currentTime = 50
      mockAdapter._duration = 100

      mockAdapter.emit(PlayerEvent.TIME_UPDATE, {
        currentTime: 50,
        duration: 100
      })
      await nextTick()

      expect(player.progress.value).toBe(0.5)
    })

    it('duration 为 0 时 progress 应该返回 0', async () => {
      mockAdapter._currentTime = 50
      mockAdapter._duration = 0

      mockAdapter.emit(PlayerEvent.TIME_UPDATE, {
        currentTime: 50,
        duration: 0
      })
      await nextTick()

      expect(player.progress.value).toBe(0)
    })
  })
})
