import { safeLocalStorageGet, safeLocalStorageSet } from './storage.js'
import { STORAGE_KEYS } from '../config/constants.js'

const STORAGE_KEY = STORAGE_KEYS.USER_SETTINGS

const defaultSettings = {
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
