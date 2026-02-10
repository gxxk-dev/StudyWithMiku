import { safeLocalStorageGet, safeLocalStorageSet } from './storage.js'
import { STORAGE_KEYS, AUTH_CONFIG } from '../config/constants.js'
import { useAuth } from '../composables/useAuth.js'
import { useDataSync } from '../composables/useDataSync.js'

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

  // 如果用户已登录，自动上传到服务器
  const { isAuthenticated } = useAuth()
  const { uploadData } = useDataSync()

  if (isAuthenticated.value) {
    uploadData(AUTH_CONFIG.DATA_TYPES.USER_SETTINGS, merged).catch((error) => {
      console.error('上传用户设置失败:', error)
      // 不影响本地保存，错误会被加入离线队列
    })
  }
}

/**
 * 初始化用户设置
 * 如果用户已登录，从服务器下载并合并设置
 */
export const initializeUserSettings = async () => {
  try {
    const { isAuthenticated } = useAuth()
    const { downloadData } = useDataSync()

    if (isAuthenticated.value) {
      try {
        const serverSettings = await downloadData(AUTH_CONFIG.DATA_TYPES.USER_SETTINGS)
        if (serverSettings && typeof serverSettings === 'object') {
          // 合并服务器设置（服务器优先）
          const localSettings = getSettings()
          const merged = { ...defaultSettings, ...localSettings, ...serverSettings }
          safeLocalStorageSet(STORAGE_KEY, JSON.stringify(merged))
        }
      } catch (error) {
        console.error('下载用户设置失败:', error)
        // 不影响初始化流程，继续使用本地设置
      }
    }
  } catch (error) {
    console.error('初始化用户设置失败:', error)
  }
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
