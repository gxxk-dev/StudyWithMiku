/**
 * @module useUpdateChannel
 * @description 更新通道管理 - 控制稳定版/测试版通道切换
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { STORAGE_KEYS, UPDATE_CHANNEL_CONFIG, VERSION_CONFIG } from '../config/constants.js'

/**
 * 更新通道管理 composable
 * @returns {object} 通道管理相关状态和方法
 */
export function useUpdateChannel() {
  const channel = ref(
    localStorage.getItem(STORAGE_KEYS.UPDATE_CHANNEL) || UPDATE_CHANNEL_CONFIG.STABLE
  )
  const latestVersion = ref(null)
  const hasNewRelease = ref(false)

  /** 是否为测试版通道 */
  const isBeta = computed(() => channel.value === UPDATE_CHANNEL_CONFIG.BETA)

  /** 是否为稳定版通道 */
  const isStable = computed(() => channel.value === UPDATE_CHANNEL_CONFIG.STABLE)

  /** 当前是否在版本子路径下 */
  const isVersionedPath = computed(() =>
    window.location.pathname.startsWith(VERSION_CONFIG.VERSION_PATH_PREFIX)
  )

  /** 从路径提取当前版本（如果在版本子路径下） */
  const pathVersion = computed(() => {
    if (!isVersionedPath.value) return null
    const match = window.location.pathname.match(/\/v\/([^/]+)/)
    return match ? match[1] : null
  })

  /**
   * 设置通道
   * @param {string} newChannel - 新通道值
   */
  const setChannel = (newChannel) => {
    channel.value = newChannel
    localStorage.setItem(STORAGE_KEYS.UPDATE_CHANNEL, newChannel)
  }

  /**
   * 清理缓存并导航到指定 URL
   * @param {string} url - 目标 URL
   */
  const cleanCacheAndNavigate = async (url) => {
    if (window.caches) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    window.location.href = url
  }

  /**
   * 切换到测试版
   */
  const switchToBeta = async () => {
    setChannel(UPDATE_CHANNEL_CONFIG.BETA)
    // 清理缓存并跳转到根路径
    await cleanCacheAndNavigate('/')
  }

  /**
   * 切换到稳定版
   */
  const switchToStable = async () => {
    setChannel(UPDATE_CHANNEL_CONFIG.STABLE)
    // 获取最新发布版本并跳转
    const latest = await fetchLatestVersion()
    if (latest) {
      await cleanCacheAndNavigate(`${VERSION_CONFIG.VERSION_PATH_PREFIX}${latest}/`)
    }
  }

  /**
   * 获取最新发布版本号
   * @returns {Promise<string|null>} 最新版本号或 null
   */
  const fetchLatestVersion = async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), UPDATE_CHANNEL_CONFIG.FETCH_TIMEOUT)

      // 从根路径获取 versions.json，绕过版本子路径的缓存
      const response = await fetch(VERSION_CONFIG.VERSIONS_FILE, {
        signal: controller.signal,
        cache: 'no-store'
      })
      clearTimeout(timeout)

      if (!response.ok) return null
      const data = await response.json()
      latestVersion.value = data.latest
      return data.latest
    } catch {
      return null
    }
  }

  /**
   * 检查是否有新发布版本（稳定版用户用）
   * @returns {Promise<boolean>} 是否有新版本
   */
  const checkForNewRelease = async () => {
    if (!isVersionedPath.value || !pathVersion.value) return false

    const latest = await fetchLatestVersion()
    if (latest && latest !== pathVersion.value) {
      hasNewRelease.value = true
      return true
    }
    return false
  }

  /**
   * 升级到最新发布版本
   */
  const upgradeToLatestRelease = async () => {
    if (!latestVersion.value) await fetchLatestVersion()
    if (latestVersion.value) {
      await cleanCacheAndNavigate(`${VERSION_CONFIG.VERSION_PATH_PREFIX}${latestVersion.value}/`)
    }
  }

  // 稳定版用户定期检查新版本
  let checkInterval = null
  onMounted(() => {
    if (isStable.value && isVersionedPath.value) {
      checkForNewRelease()
      checkInterval = setInterval(checkForNewRelease, UPDATE_CHANNEL_CONFIG.VERSION_CHECK_INTERVAL)
    }
  })
  onUnmounted(() => {
    if (checkInterval) clearInterval(checkInterval)
  })

  return {
    channel,
    isBeta,
    isStable,
    isVersionedPath,
    pathVersion,
    latestVersion,
    hasNewRelease,
    setChannel,
    switchToBeta,
    switchToStable,
    fetchLatestVersion,
    checkForNewRelease,
    upgradeToLatestRelease
  }
}
