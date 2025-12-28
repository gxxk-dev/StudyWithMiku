import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { duckMusicForNotification } from '../utils/eventBus.js'
import { getPomodoroSettings, savePomodoroSettings } from '../utils/userSettings.js'

const NOTIFICATION_AUDIO_URL = 'https://assets.frez79.io/swm/BreakOrWork.mp3'

export const STATUS = {
  FOCUS: 'focus',
  BREAK: 'break',
  LONG_BREAK: 'longBreak'
}

export function usePomodoro() {
  const savedPomodoro = getPomodoroSettings()
  const focusDuration = ref(savedPomodoro.focusDuration)
  const breakDuration = ref(savedPomodoro.breakDuration)
  const timeLeft = ref(focusDuration.value * 60)
  const isRunning = ref(false)
  const currentStatus = ref(STATUS.FOCUS)
  const completedPomodoros = ref(0)

  const timer = ref(null)
  const notificationAudio = ref(null)

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
      default: return '专注'
    }
  })

  const statusClass = computed(() => {
    switch (currentStatus.value) {
      case STATUS.FOCUS: return 'focus'
      case STATUS.BREAK: return 'break'
      case STATUS.LONG_BREAK: return 'long-break'
      default: return 'focus'
    }
  })

  const totalTime = computed(() => {
    return currentStatus.value === STATUS.FOCUS
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

  const handleTimerComplete = () => {
    playNotificationSound()

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

    showNotification()

    setTimeout(() => {
      startTimer()
    }, 1000)
  }

  const startTimer = () => {
    if (timeLeft.value <= 0) return

    pauseTimer()

    isRunning.value = true
    timer.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        clearInterval(timer.value)
        handleTimerComplete()
      }
    }, 1000)
  }

  const pauseTimer = () => {
    isRunning.value = false
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  const resetTimer = () => {
    pauseTimer()
    timeLeft.value = focusDuration.value * 60
    currentStatus.value = STATUS.FOCUS
  }

  // Watch duration changes
  const stopDurationWatcher = watch([focusDuration, breakDuration], ([newFocus, newBreak]) => {
    if (currentStatus.value === STATUS.FOCUS && !isRunning.value) {
      timeLeft.value = newFocus * 60
    } else if (currentStatus.value !== STATUS.FOCUS && !isRunning.value) {
      timeLeft.value = newBreak * 60
    }
    savePomodoroSettings(newFocus, newBreak)
  })

  // Lifecycle
  onMounted(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  })

  onUnmounted(() => {
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
