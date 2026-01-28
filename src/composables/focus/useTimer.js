/**
 * 纯计时器逻辑
 * 使用时间戳差值计算，解决页面后台时 timer 被节流的问题
 */

import { ref, computed, readonly } from 'vue'

/**
 * 创建计时器实例
 * @param {Object} options - 配置选项
 * @param {Function} options.onTick - 每次 tick 回调
 * @param {Function} options.onComplete - 计时完成回调
 * @param {number} options.tickInterval - tick 间隔（毫秒），默认 1000
 * @returns {Object} 计时器 API
 */
export const createTimer = (options = {}) => {
  const { onTick = null, onComplete = null, tickInterval = 1000 } = options

  // 内部状态
  let intervalId = null
  let startTimestamp = null
  let pausedElapsed = 0
  let totalDuration = 0

  // 响应式状态
  const isRunning = ref(false)
  const isPaused = ref(false)
  const elapsed = ref(0)
  const duration = ref(0)

  // 计算属性
  const remaining = computed(() => Math.max(0, duration.value - elapsed.value))
  const progress = computed(() => (duration.value > 0 ? elapsed.value / duration.value : 0))

  /**
   * 内部 tick 处理
   */
  const tick = () => {
    if (!isRunning.value || isPaused.value || startTimestamp === null) {
      return
    }

    // 使用时间戳差值计算，而非累加
    const now = Date.now()
    elapsed.value = pausedElapsed + Math.floor((now - startTimestamp) / 1000)

    // 触发 tick 回调
    if (onTick) {
      onTick({
        elapsed: elapsed.value,
        remaining: remaining.value,
        progress: progress.value
      })
    }

    // 检查是否完成
    if (elapsed.value >= totalDuration) {
      elapsed.value = totalDuration
      stop()
      if (onComplete) {
        onComplete()
      }
    }
  }

  /**
   * 启动计时器
   * @param {number} durationSeconds - 总时长（秒）
   * @param {number} initialElapsed - 初始已过时间（秒），用于恢复
   */
  const start = (durationSeconds, initialElapsed = 0) => {
    if (isRunning.value) {
      return
    }

    totalDuration = durationSeconds
    duration.value = durationSeconds
    pausedElapsed = initialElapsed
    elapsed.value = initialElapsed
    startTimestamp = Date.now()
    isRunning.value = true
    isPaused.value = false

    // 启动 interval
    intervalId = setInterval(tick, tickInterval)

    // 立即执行一次 tick
    tick()
  }

  /**
   * 暂停计时器
   */
  const pause = () => {
    if (!isRunning.value || isPaused.value) {
      return
    }

    // 保存当前已过时间
    const now = Date.now()
    pausedElapsed = pausedElapsed + Math.floor((now - startTimestamp) / 1000)
    elapsed.value = pausedElapsed
    isPaused.value = true

    // 清除 interval
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  /**
   * 恢复计时器
   */
  const resume = () => {
    if (!isRunning.value || !isPaused.value) {
      return
    }

    startTimestamp = Date.now()
    isPaused.value = false

    // 重新启动 interval
    intervalId = setInterval(tick, tickInterval)

    // 立即执行一次 tick
    tick()
  }

  /**
   * 停止计时器
   */
  const stop = () => {
    isRunning.value = false
    isPaused.value = false
    startTimestamp = null

    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  /**
   * 重置计时器
   */
  const reset = () => {
    stop()
    pausedElapsed = 0
    elapsed.value = 0
    duration.value = 0
    totalDuration = 0
  }

  /**
   * 获取当前状态快照（用于持久化）
   */
  const getSnapshot = () => ({
    isRunning: isRunning.value,
    isPaused: isPaused.value,
    elapsed: elapsed.value,
    duration: duration.value,
    startTimestamp,
    pausedElapsed
  })

  /**
   * 从快照恢复（用于页面刷新恢复）
   * @param {Object} snapshot - 状态快照
   */
  const restoreFromSnapshot = (snapshot) => {
    if (!snapshot) {
      return false
    }

    const {
      isRunning: wasRunning,
      isPaused: wasPaused,
      elapsed: savedElapsed,
      duration: savedDuration,
      startTimestamp: savedStartTimestamp,
      pausedElapsed: savedPausedElapsed
    } = snapshot

    if (!wasRunning) {
      return false
    }

    totalDuration = savedDuration
    duration.value = savedDuration

    if (wasPaused) {
      // 暂停状态，直接恢复
      pausedElapsed = savedPausedElapsed
      elapsed.value = savedElapsed
      startTimestamp = null
      isRunning.value = true
      isPaused.value = true
    } else {
      // 运行状态，计算中断期间的时间
      const now = Date.now()
      const elapsedSinceStart = Math.floor((now - savedStartTimestamp) / 1000)
      const totalElapsed = savedPausedElapsed + elapsedSinceStart

      if (totalElapsed >= totalDuration) {
        // 已超时，标记为中断
        elapsed.value = totalDuration
        return 'overtime'
      }

      // 继续运行
      pausedElapsed = savedPausedElapsed
      startTimestamp = savedStartTimestamp
      elapsed.value = totalElapsed
      isRunning.value = true
      isPaused.value = false

      // 启动 interval
      intervalId = setInterval(tick, tickInterval)
    }

    return true
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return {
    // 只读状态
    isRunning: readonly(isRunning),
    isPaused: readonly(isPaused),
    elapsed: readonly(elapsed),
    duration: readonly(duration),
    remaining,
    progress,

    // 操作方法
    start,
    pause,
    resume,
    stop,
    reset,

    // 持久化支持
    getSnapshot,
    restoreFromSnapshot,
    cleanup
  }
}

/**
 * Vue Composable 版本
 */
export const useTimer = (options = {}) => {
  return createTimer(options)
}
