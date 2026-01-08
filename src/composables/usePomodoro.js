import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { duckMusicForNotification } from '../utils/eventBus.js'
import { getPomodoroSettings, savePomodoroSettings, saveTimerState, getTimerState, clearTimerState } from '../utils/userSettings.js'

const NOTIFICATION_AUDIO_URL = 'https://assets.frez79.io/swm/BreakOrWork.mp3'

export const STATUS = {
  FOCUS: 'focus',
  BREAK: 'break',
  LONG_BREAK: 'longBreak',
  PAUSED: 'paused'
}

export function usePomodoro() {
  const savedPomodoro = getPomodoroSettings()
  const focusDuration = ref(savedPomodoro.focusDuration)
  const breakDuration = ref(savedPomodoro.breakDuration)
  const timeLeft = ref(focusDuration.value * 60)
  const isRunning = ref(false)
  const currentStatus = ref(STATUS.FOCUS)
  const previousStatus = ref(STATUS.FOCUS) // 保存暂停前的阶段状态
  const completedPomodoros = ref(0)

  const timer = ref(null)
  const notificationAudio = ref(null)
  const endTime = ref(null) // 计时器结束的绝对时间戳(毫秒)

  // Computed properties
  const formattedMinutes = computed(() => {
    return Math.floor(timeLeft.value / 60).toString().padStart(2, '0')
  })

  const formattedSeconds = computed(() => {
    return (timeLeft.value % 60).toString().padStart(2, '0')
  })

  const statusText = computed(() => {
    switch (currentStatus.value) {
      case STATUS.FOCUS: return '专注'
      case STATUS.BREAK: return '休息'
      case STATUS.LONG_BREAK: return '长休'
      case STATUS.PAUSED: return '暂停'
      default: return '专注'
    }
  })

  const statusClass = computed(() => {
    switch (currentStatus.value) {
      case STATUS.FOCUS: return 'focus'
      case STATUS.BREAK: return 'break'
      case STATUS.LONG_BREAK: return 'long-break'
      case STATUS.PAUSED: return 'paused'
      default: return 'focus'
    }
  })

  const totalTime = computed(() => {
    const status = currentStatus.value === STATUS.PAUSED ? previousStatus.value : currentStatus.value
    return status === STATUS.FOCUS
      ? focusDuration.value * 60
      : breakDuration.value * 60
  })

  const circumference = computed(() => 2 * Math.PI * 54)

  const strokeDashoffset = computed(() => {
    const progress = (totalTime.value - timeLeft.value) / totalTime.value
    return circumference.value * (1 - progress)
  })

  // Methods
  const playNotificationSound = async () => {
    duckMusicForNotification(3000)
    await new Promise(resolve => setTimeout(resolve, 200))

    // 复用音频实例
    if (!notificationAudio.value) {
      notificationAudio.value = new Audio(NOTIFICATION_AUDIO_URL)
    }

    notificationAudio.value.currentTime = 0
    notificationAudio.value.play().catch(error => {
      console.warn('Notification sound play failed:', error)
    })
  }

  const showNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('番茄钟', {
        body: `${statusText.value}已完成！`,
        icon: '/favicon.ico'
      })
    }
  }

  const handleTimerComplete = (isSilent = false) => {
    const previousStatus = statusText.value
    endTime.value = null // 确保清理状态

    // 只在实时完成时播放通知和音频
    if (!isSilent) {
      playNotificationSound()
    }

    // 切换到下一阶段，但不自动开始
    if (currentStatus.value === STATUS.FOCUS) {
      completedPomodoros.value++

      if (completedPomodoros.value % 4 === 0) {
        currentStatus.value = STATUS.LONG_BREAK
        timeLeft.value = breakDuration.value * 60 * 2
      } else {
        currentStatus.value = STATUS.BREAK
        timeLeft.value = breakDuration.value * 60
      }
    } else {
      currentStatus.value = STATUS.FOCUS
      timeLeft.value = focusDuration.value * 60
    }

    console.log(`[Pomodoro] ${previousStatus}阶段完成 → 切换到${statusText.value}阶段 (完成计数: ${completedPomodoros.value}, 静默模式: ${isSilent})`)

    // 只在实时完成时显示通知
    if (!isSilent) {
      showNotification()
    }

    // 删除原有的自动开始逻辑
    // 现在需要用户手动点击开始下一阶段
    // 禁止自动累积多个阶段
  }

  const startTimer = () => {
    if (timeLeft.value <= 0) return

    pauseTimer(false) // 内部清理，不设置暂停状态

    // 从暂停状态恢复
    if (currentStatus.value === STATUS.PAUSED) {
      currentStatus.value = previousStatus.value
    }

    // 计算结束时间 (当前时间 + 剩余秒数 * 1000)
    endTime.value = Date.now() + timeLeft.value * 1000
    const endDate = new Date(endTime.value)
    console.log(`[Pomodoro] 计时器启动 - 当前阶段: ${statusText.value}, 剩余时间: ${timeLeft.value}秒, 预计结束时间: ${endDate.toLocaleTimeString()}`)

    isRunning.value = true
    timer.value = setInterval(() => {
      // 基于绝对时间计算剩余时间
      const remaining = Math.ceil((endTime.value - Date.now()) / 1000)

      if (remaining <= 0) {
        timeLeft.value = 0
        clearInterval(timer.value)
        endTime.value = null

        // 检测是否延迟完成 (超过 5 秒)
        const isSilent = remaining < -5
        if (isSilent) {
          console.log(`[Pomodoro] 延迟完成检测 - 延迟 ${Math.abs(remaining)} 秒，静默完成模式`)
        } else {
          console.log(`[Pomodoro] 计时器完成 - 实时完成，播放通知`)
        }
        handleTimerComplete(isSilent)
      } else {
        timeLeft.value = remaining
      }
    }, 1000)
  }

  const pauseTimer = (setPausedStatus = true) => {
    // 只在用户手动暂停且计时器正在运行时设置暂停状态
    if (setPausedStatus && isRunning.value && currentStatus.value !== STATUS.PAUSED) {
      previousStatus.value = currentStatus.value
      currentStatus.value = STATUS.PAUSED
    }
    console.log(`[Pomodoro] 计时器暂停 - 当前阶段: ${statusText.value}, 剩余时间: ${timeLeft.value}秒`)
    isRunning.value = false
    endTime.value = null // 清除绝对时间，保留 timeLeft
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  const resetTimer = () => {
    console.log(`[Pomodoro] 计时器重置`)
    pauseTimer(false) // 重置时不设置暂停状态
    timeLeft.value = focusDuration.value * 60
    currentStatus.value = STATUS.FOCUS
    previousStatus.value = STATUS.FOCUS
  }

  // Watch duration changes
  const stopDurationWatcher = watch([focusDuration, breakDuration], ([newFocus, newBreak]) => {
    const effectiveStatus = currentStatus.value === STATUS.PAUSED ? previousStatus.value : currentStatus.value
    if (effectiveStatus === STATUS.FOCUS && !isRunning.value) {
      timeLeft.value = newFocus * 60
    } else if (effectiveStatus !== STATUS.FOCUS && !isRunning.value) {
      timeLeft.value = newBreak * 60
    }
    savePomodoroSettings(newFocus, newBreak)
  })

  // Lifecycle
  onMounted(async () => {
    // 恢复计时器状态
    const savedState = getTimerState()

    if (savedState?.isRunning && savedState.endTime) {
      // 检查是否已经过期
      const remaining = Math.ceil((savedState.endTime - Date.now()) / 1000)
      const savedDate = new Date(savedState.savedAt)

      console.log(`[Pomodoro] 检测到已保存的计时器状态 - 保存时间: ${savedDate.toLocaleString()}, 剩余: ${remaining}秒`)

      if (remaining > 0) {
        // 恢复状态
        timeLeft.value = remaining
        currentStatus.value = savedState.currentStatus
        completedPomodoros.value = savedState.completedPomodoros
        console.log(`[Pomodoro] 恢复计时器 - 阶段: ${statusText.value}, 剩余: ${remaining}秒`)
        startTimer() // 自动恢复计时
      } else {
        // 已过期，清理状态
        console.log(`[Pomodoro] 计时器已过期 (${Math.abs(remaining)}秒前)，清理状态`)
        clearTimerState()
      }
    } else {
      console.log(`[Pomodoro] 未检测到保存的计时器状态`)
    }

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  })

  onUnmounted(() => {
    // 如果正在运行，保存状态
    if (isRunning.value && endTime.value) {
      console.log(`[Pomodoro] 组件卸载 - 保存计时器状态 (阶段: ${statusText.value}, 剩余: ${timeLeft.value}秒)`)
      saveTimerState({
        endTime: endTime.value,
        isRunning: isRunning.value,
        currentStatus: currentStatus.value,
        completedPomodoros: completedPomodoros.value
      })
    } else {
      console.log(`[Pomodoro] 组件卸载 - 计时器未运行，清理状态`)
    }

    if (timer.value) {
      clearInterval(timer.value)
    }
    if (stopDurationWatcher) {
      stopDurationWatcher()
    }
    // 清理音频元素
    if (notificationAudio.value) {
      notificationAudio.value.pause()
      notificationAudio.value.src = ''
      notificationAudio.value = null
    }
  })

  // 只在状态变化时保存计时器状态（优化：不再每秒触发）
  watch([isRunning, currentStatus, completedPomodoros], () => {
    if (isRunning.value && endTime.value) {
      const state = {
        endTime: endTime.value,
        isRunning: true,
        currentStatus: currentStatus.value,
        completedPomodoros: completedPomodoros.value
      }
      saveTimerState(state)
      console.log(`[Pomodoro] 状态已保存 - 阶段: ${statusText.value}, 结束时间: ${new Date(endTime.value).toLocaleTimeString()}`)
    } else if (!isRunning.value) {
      clearTimerState()
    }
  })

  return {
    // State
    focusDuration,
    breakDuration,
    timeLeft,
    isRunning,
    currentStatus,
    completedPomodoros,
    // Computed
    formattedMinutes,
    formattedSeconds,
    statusText,
    statusClass,
    totalTime,
    circumference,
    strokeDashoffset,
    // Methods
    startTimer,
    pauseTimer,
    resetTimer,
    // Constants
    STATUS
  }
}
