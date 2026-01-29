import { ref } from 'vue'
import { getConfig } from '../services/runtimeConfig.js'

const originalVolume = ref(getConfig('AUDIO_CONFIG', 'DEFAULT_VOLUME'))

const isHoveringUI = ref(false)

let aplayerInstance = null
let volumeRestoreTimer = null

export const setAPlayerInstance = (instance) => {
  aplayerInstance = instance
}

export const getAPlayerInstance = () => aplayerInstance

const fadeVolume = (targetVolume, duration) => {
  const fadeDuration = duration ?? getConfig('AUDIO_CONFIG', 'DEFAULT_FADE_DURATION')
  const fadeSteps = getConfig('AUDIO_CONFIG', 'VOLUME_FADE_STEPS')

  return new Promise((resolve, reject) => {
    if (!aplayerInstance) {
      resolve()
      return
    }

    const startVolume = aplayerInstance.audio.volume
    const volumeDiff = targetVolume - startVolume
    const stepDuration = fadeDuration / fadeSteps
    let currentStep = 0
    let interval = null

    interval = setInterval(() => {
      currentStep++
      const progress = currentStep / fadeSteps
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const newVolume = startVolume + volumeDiff * easeProgress

      // 添加安全检查
      if (!aplayerInstance) {
        clearInterval(interval)
        reject(new Error('APlayer instance lost'))
        return
      }

      aplayerInstance.audio.volume = Math.max(0, Math.min(1, newVolume))

      if (currentStep >= fadeSteps) {
        clearInterval(interval)
        aplayerInstance.audio.volume = targetVolume
        resolve()
      }
    }, stepDuration)
  })
}

export const duckMusicForNotification = async (notificationDuration) => {
  const duration = notificationDuration ?? getConfig('AUDIO_CONFIG', 'NOTIFICATION_DURATION')

  if (!aplayerInstance) return

  if (volumeRestoreTimer) {
    clearTimeout(volumeRestoreTimer)
    volumeRestoreTimer = null
  }

  originalVolume.value = aplayerInstance.audio.volume
  const duckedVolume = originalVolume.value * getConfig('AUDIO_CONFIG', 'VOLUME_DUCK_RATIO')
  const fadeDuration = getConfig('AUDIO_CONFIG', 'VOLUME_FADE_DURATION')

  await fadeVolume(duckedVolume, fadeDuration)

  volumeRestoreTimer = setTimeout(() => {
    if (!aplayerInstance) {
      volumeRestoreTimer = null
      return
    }
    fadeVolume(originalVolume.value, fadeDuration).catch((err) => {
      console.error('恢复通知后音量失败:', err)
    })
    volumeRestoreTimer = null
  }, duration)
}

export const setHoveringUI = (value) => {
  isHoveringUI.value = value
}

export { isHoveringUI }
