import { ref } from 'vue'

const VOLUME_FADE_STEPS = 20
const VOLUME_DUCK_RATIO = 0.2
const VOLUME_DUCK_FADE_DURATION = 300

const originalVolume = ref(0.7)

const isHoveringUI = ref(false)

let aplayerInstance = null
let volumeRestoreTimer = null

export const setAPlayerInstance = (instance) => {
  aplayerInstance = instance
}

export const getAPlayerInstance = () => aplayerInstance

const fadeVolume = (targetVolume, duration = 500) => {
  return new Promise((resolve, reject) => {
    if (!aplayerInstance) {
      resolve()
      return
    }

    const startVolume = aplayerInstance.audio.volume
    const volumeDiff = targetVolume - startVolume
    const stepDuration = duration / VOLUME_FADE_STEPS
    let currentStep = 0
    let interval = null

    interval = setInterval(() => {
      currentStep++
      const progress = currentStep / VOLUME_FADE_STEPS
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const newVolume = startVolume + volumeDiff * easeProgress

      // 添加安全检查
      if (!aplayerInstance) {
        clearInterval(interval)
        reject(new Error('APlayer instance lost'))
        return
      }

      aplayerInstance.audio.volume = Math.max(0, Math.min(1, newVolume))

      if (currentStep >= VOLUME_FADE_STEPS) {
        clearInterval(interval)
        aplayerInstance.audio.volume = targetVolume
        resolve()
      }
    }, stepDuration)
  })
}

export const duckMusicForNotification = async (notificationDuration = 3000) => {
  if (!aplayerInstance) return

  if (volumeRestoreTimer) {
    clearTimeout(volumeRestoreTimer)
    volumeRestoreTimer = null
  }

  originalVolume.value = aplayerInstance.audio.volume
  const duckedVolume = originalVolume.value * VOLUME_DUCK_RATIO

  await fadeVolume(duckedVolume, VOLUME_DUCK_FADE_DURATION)

  volumeRestoreTimer = setTimeout(() => {
    if (!aplayerInstance) {
      volumeRestoreTimer = null
      return
    }
    fadeVolume(originalVolume.value, VOLUME_DUCK_FADE_DURATION).catch(err => {
      console.error('恢复通知后音量失败:', err)
    })
    volumeRestoreTimer = null
  }, notificationDuration)
}

export const setHoveringUI = (value) => {
  isHoveringUI.value = value
}

export { isHoveringUI }
