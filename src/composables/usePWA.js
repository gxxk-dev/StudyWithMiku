import { ref, onMounted, onUnmounted } from 'vue'
import { isPWAMode, watchPWAMode } from '../utils/pwaDetector.js'

const formatFullTime = (date = new Date()) => {
  const pad = (value) => value.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export const usePWA = () => {
  const isPWA = ref(isPWAMode())
  const isOnline = ref(navigator.onLine)
  const canInstall = ref(false)
  const hasUpdate = ref(false)
  const appVersion = ref(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : new Date().toISOString().slice(0, 10).replace(/-/g, ''))
  const appBuildTime = ref(typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : formatFullTime())

  // 使用 ref 避免跨实例引用混乱
  const deferredPrompt = ref(null)
  const removePWAModeWatcher = ref(null)

  const updatePWAMode = () => {
    isPWA.value = isPWAMode()
  }

  // 监听安装提示事件
  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    canInstall.value = true
  }

  // 安装 PWA
  const installPWA = async () => {
    if (!deferredPrompt.value) return false
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    deferredPrompt.value = null
    canInstall.value = false
    return outcome === 'accepted'
  }

  // 监听在线状态
  const handleOnline = () => { isOnline.value = true }
  const handleOffline = () => { isOnline.value = false }

  // 监听 PWA 安装完成
  const handleAppInstalled = () => {
    canInstall.value = false
    deferredPrompt.value = null
    updatePWAMode()
  }

  // 设置有更新
  const setHasUpdate = (value) => {
    hasUpdate.value = value
  }

  // 刷新应用
  const refreshApp = async (force = false) => {
    if (!force) {
      window.location.reload()
      return
    }
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(async (registration) => {
          await registration.update()
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        }))
      }
      if (window.caches && typeof window.caches.keys === 'function') {
        const keys = await window.caches.keys()
        await Promise.all(keys.map((key) => window.caches.delete(key)))
      }
    } catch (error) {
      console.warn('强制刷新时清理缓存失败:', error)
    }
    const url = new URL(window.location.href)
    url.searchParams.set('sw-bust', Date.now().toString())
    window.location.replace(url.toString())
  }

  // 统一的事件监听器管理
  const eventListeners = [
    { event: 'beforeinstallprompt', handler: handleBeforeInstallPrompt },
    { event: 'online', handler: handleOnline },
    { event: 'offline', handler: handleOffline },
    { event: 'visibilitychange', handler: updatePWAMode },
    { event: 'pageshow', handler: updatePWAMode },
    { event: 'appinstalled', handler: handleAppInstalled }
  ]

  const addEventListeners = () => {
    eventListeners.forEach(({ event, handler }) => {
      window.addEventListener(event, handler)
    })
  }

  const removeEventListeners = () => {
    eventListeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler)
    })
  }

  onMounted(() => {
    updatePWAMode()
    addEventListeners()

    removePWAModeWatcher.value = watchPWAMode((value) => {
      isPWA.value = value
    })
  })

  onUnmounted(() => {
    removeEventListeners()
    if (removePWAModeWatcher.value) {
      removePWAModeWatcher.value()
      removePWAModeWatcher.value = null
    }
  })

  return {
    isPWA,
    isOnline,
    canInstall,
    hasUpdate,
    appVersion,
    appBuildTime,
    installPWA,
    setHasUpdate,
    refreshApp
  }
}
