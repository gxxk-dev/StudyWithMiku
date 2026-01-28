/**
 * useTimer 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTimer } from '@/composables/focus/useTimer.js'

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('初始状态', () => {
    it('应该有正确的初始值', () => {
      const timer = createTimer()

      expect(timer.isRunning.value).toBe(false)
      expect(timer.isPaused.value).toBe(false)
      expect(timer.elapsed.value).toBe(0)
      expect(timer.duration.value).toBe(0)
      expect(timer.remaining.value).toBe(0)
      expect(timer.progress.value).toBe(0)
    })
  })

  describe('start', () => {
    it('应该启动计时器', () => {
      const timer = createTimer()

      timer.start(25 * 60)

      expect(timer.isRunning.value).toBe(true)
      expect(timer.isPaused.value).toBe(false)
      expect(timer.duration.value).toBe(25 * 60)
    })

    it('应该支持初始已过时间', () => {
      const timer = createTimer()

      timer.start(25 * 60, 10 * 60)

      expect(timer.elapsed.value).toBe(10 * 60)
      expect(timer.remaining.value).toBe(15 * 60)
    })

    it('不应该在已运行时重复启动', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      timer.start(30 * 60)

      expect(timer.duration.value).toBe(25 * 60)
    })
  })

  describe('tick', () => {
    it('应该在时间推进时更新 elapsed', () => {
      const timer = createTimer()

      timer.start(25 * 60)

      // 推进 5 秒
      vi.advanceTimersByTime(5000)

      expect(timer.elapsed.value).toBe(5)
      expect(timer.remaining.value).toBe(25 * 60 - 5)
    })

    it('应该调用 onTick 回调', () => {
      const onTick = vi.fn()
      const timer = createTimer({ onTick })

      timer.start(25 * 60)
      vi.advanceTimersByTime(1000)

      expect(onTick).toHaveBeenCalledWith(
        expect.objectContaining({
          elapsed: expect.any(Number),
          remaining: expect.any(Number),
          progress: expect.any(Number)
        })
      )
    })

    it('应该在完成时调用 onComplete', () => {
      const onComplete = vi.fn()
      const timer = createTimer({ onComplete })

      timer.start(3) // 3 秒
      vi.advanceTimersByTime(4000)

      expect(onComplete).toHaveBeenCalled()
      expect(timer.isRunning.value).toBe(false)
    })

    it('应该正确计算 progress', () => {
      const timer = createTimer()

      timer.start(100) // 100 秒
      vi.advanceTimersByTime(50000) // 50 秒

      expect(timer.progress.value).toBeCloseTo(0.5, 1)
    })
  })

  describe('pause/resume', () => {
    it('应该暂停计时器', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      vi.advanceTimersByTime(5000)

      timer.pause()

      expect(timer.isPaused.value).toBe(true)
      expect(timer.isRunning.value).toBe(true)
      expect(timer.elapsed.value).toBe(5)
    })

    it('暂停后不应该继续计时', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      vi.advanceTimersByTime(5000)

      timer.pause()
      const elapsedAtPause = timer.elapsed.value

      vi.advanceTimersByTime(10000)

      expect(timer.elapsed.value).toBe(elapsedAtPause)
    })

    it('应该恢复计时器', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      vi.advanceTimersByTime(5000)

      timer.pause()
      timer.resume()

      expect(timer.isPaused.value).toBe(false)
      expect(timer.isRunning.value).toBe(true)

      vi.advanceTimersByTime(5000)
      expect(timer.elapsed.value).toBe(10)
    })

    it('不应该在未运行时暂停', () => {
      const timer = createTimer()

      timer.pause()

      expect(timer.isPaused.value).toBe(false)
    })

    it('不应该在未暂停时恢复', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      timer.resume()

      expect(timer.isPaused.value).toBe(false)
    })
  })

  describe('stop', () => {
    it('应该停止计时器', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      vi.advanceTimersByTime(5000)

      timer.stop()

      expect(timer.isRunning.value).toBe(false)
      expect(timer.isPaused.value).toBe(false)
    })

    it('停止后不应该继续计时', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      vi.advanceTimersByTime(5000)

      timer.stop()
      const elapsedAtStop = timer.elapsed.value

      vi.advanceTimersByTime(10000)

      expect(timer.elapsed.value).toBe(elapsedAtStop)
    })
  })

  describe('reset', () => {
    it('应该重置所有状态', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      vi.advanceTimersByTime(5000)

      timer.reset()

      expect(timer.isRunning.value).toBe(false)
      expect(timer.isPaused.value).toBe(false)
      expect(timer.elapsed.value).toBe(0)
      expect(timer.duration.value).toBe(0)
    })
  })

  describe('getSnapshot/restoreFromSnapshot', () => {
    it('应该返回正确的状态快照', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      vi.advanceTimersByTime(5000)

      const snapshot = timer.getSnapshot()

      expect(snapshot.isRunning).toBe(true)
      expect(snapshot.isPaused).toBe(false)
      expect(snapshot.elapsed).toBe(5)
      expect(snapshot.duration).toBe(25 * 60)
    })

    it('应该从快照恢复运行状态', () => {
      const timer1 = createTimer()
      timer1.start(25 * 60)
      vi.advanceTimersByTime(5000)

      const snapshot = timer1.getSnapshot()
      timer1.cleanup()

      // 模拟页面刷新后的恢复
      const timer2 = createTimer()
      const result = timer2.restoreFromSnapshot(snapshot)

      expect(result).toBe(true)
      expect(timer2.isRunning.value).toBe(true)
      expect(timer2.elapsed.value).toBe(5)

      timer2.cleanup()
    })

    it('应该从快照恢复暂停状态', () => {
      const timer1 = createTimer()
      timer1.start(25 * 60)
      vi.advanceTimersByTime(5000)
      timer1.pause()

      const snapshot = timer1.getSnapshot()
      timer1.cleanup()

      const timer2 = createTimer()
      const result = timer2.restoreFromSnapshot(snapshot)

      expect(result).toBe(true)
      expect(timer2.isRunning.value).toBe(true)
      expect(timer2.isPaused.value).toBe(true)
      expect(timer2.elapsed.value).toBe(5)

      timer2.cleanup()
    })

    it('对于空快照应该返回 false', () => {
      const timer = createTimer()
      const result = timer.restoreFromSnapshot(null)

      expect(result).toBe(false)
    })

    it('对于非运行状态的快照应该返回 false', () => {
      const timer = createTimer()
      const result = timer.restoreFromSnapshot({
        isRunning: false,
        isPaused: false,
        elapsed: 0,
        duration: 25 * 60
      })

      expect(result).toBe(false)
    })

    it('超时快照应该返回 overtime', () => {
      const timer1 = createTimer()
      timer1.start(10) // 10 秒
      vi.advanceTimersByTime(5000)

      const snapshot = timer1.getSnapshot()
      timer1.cleanup()

      // 模拟页面关闭期间时间流逝
      vi.advanceTimersByTime(30000) // 30 秒后

      const timer2 = createTimer()
      const result = timer2.restoreFromSnapshot(snapshot)

      expect(result).toBe('overtime')

      timer2.cleanup()
    })
  })

  describe('cleanup', () => {
    it('应该清理 interval', () => {
      const timer = createTimer()

      timer.start(25 * 60)
      timer.cleanup()

      // 验证 interval 已清理（elapsed 不再更新）
      const elapsedBefore = timer.elapsed.value
      vi.advanceTimersByTime(5000)

      expect(timer.elapsed.value).toBe(elapsedBefore)
    })
  })
})
