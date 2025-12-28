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
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('读取设置失败，将使用默认设置:', e.message)
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage 存储空间不足')
    }
  }
  return { ...defaultSettings }
}

/**
 * 保存设置
 * @internal 仅供模块内部使用，外部请使用具体的 get/save 函数
 */
const saveSettings = (settings) => {
  try {
    const current = getSettings()
    const merged = { ...current, ...settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch (e) {
    console.warn('保存设置失败:', e.message)
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage 存储空间不足，请清理浏览器缓存')
    } else if (e.name === 'SecurityError') {
      console.warn('浏览器安全策略阻止访问 localStorage（可能处于无痕模式）')
    }
  }
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
