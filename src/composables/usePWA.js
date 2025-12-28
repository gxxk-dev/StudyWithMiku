import { ref, onMounted, onUnmounted } from 'vue'
import { isPWAMode } from '../utils/pwaDetector.js'

export const usePWA = () => {
  const isPWA = ref(isPWAMode())
  const isOnline = ref(navigator.onLine)
  const canInstall = ref(false)
  const hasUpdate = ref(false)
  const appVersion = ref(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : new Date().toISOString().slice(0, 10).replace(/-/g, ''))

  let deferredPrompt = null

  // 监听安装提示事件
  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
  }

  // 安装 PWA
  const installPWA = async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    canInstall.value = false
    return outcome === 'accepted'
  }

  // 监听在线状态
  const handleOnline = () => { isOnline.value = true }
  const handleOffline = () => { isOnline.value = false }

  // 设置有更新
  const setHasUpdate = (value) => {
    hasUpdate.value = value
  }

  // 刷新应用
  const refreshApp = () => {
    window.location.reload()
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 监听 PWA 安装完成
    window.addEventListener('appinstalled', () => {
      canInstall.value = false
      deferredPrompt = null
    })
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    isPWA,
    isOnline,
    canInstall,
    hasUpdate,
    appVersion,
    installPWA,
    setHasUpdate,
    refreshApp
  }
}
