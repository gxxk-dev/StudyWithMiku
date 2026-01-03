import { safeLocalStorageGet, safeLocalStorageSet } from './storage.js'

const STORAGE_KEY = 'study_with_miku_settings'

const defaultSettings = {
  pomodoro: {
    focusDuration: 25,
    breakDuration: 5
  },
  video: {
    currentIndex: 0
  },
  music: {
    currentSongIndex: 0
  }
}

/**
 * 获取所有设置
 * @internal 仅供模块内部使用，外部请使用具体的 get/save 函数
 */
const getSettings = () => {
  const stored = safeLocalStorageGet(STORAGE_KEY)
  if (stored) {
    try {
      return { ...defaultSettings, ...JSON.parse(stored) }
    } catch (e) {
      console.warn('读取设置失败，将使用默认设置:', e.message)
      return { ...defaultSettings }
    }
  }
  return { ...defaultSettings }
}

/**
 * 保存设置
 * @internal 仅供模块内部使用，外部请使用具体的 get/save 函数
 */
const saveSettings = (settings) => {
  const current = getSettings()
  const merged = { ...current, ...settings }
  safeLocalStorageSet(STORAGE_KEY, JSON.stringify(merged))
}

export const savePomodoroSettings = (focusDuration, breakDuration) => {
  const settings = getSettings()
  settings.pomodoro = { focusDuration, breakDuration }
  saveSettings(settings)
}

export const getPomodoroSettings = () => {
  return getSettings().pomodoro
}

export const saveVideoIndex = (index) => {
  const settings = getSettings()
  settings.video = { currentIndex: index }
  saveSettings(settings)
}

export const getVideoIndex = () => {
  return getSettings().video.currentIndex
}

export const saveMusicIndex = (index) => {
  const settings = getSettings()
  settings.music = { currentSongIndex: index }
  saveSettings(settings)
}

export const getMusicIndex = () => {
  return getSettings().music.currentSongIndex
}

export const saveTimerState = (state) => {
  const settings = getSettings()
  settings.timerState = {
    endTime: state.endTime,
    isRunning: state.isRunning,
    currentStatus: state.currentStatus,
    completedPomodoros: state.completedPomodoros,
    savedAt: Date.now()
  }
  saveSettings(settings)
}

export const getTimerState = () => {
  try {
    return getSettings().timerState || null
  } catch (e) {
    console.error('[Settings] 读取计时器状态失败:', e.message)
    return null
  }
}

export const clearTimerState = () => {
  try {
    const settings = getSettings()
    delete settings.timerState
    saveSettings(settings)
    console.log('[Settings] 计时器状态已清理')
  } catch (e) {
    console.error('[Settings] 清理计时器状态失败:', e.message)
  }
}
