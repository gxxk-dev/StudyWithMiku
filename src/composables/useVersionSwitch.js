/**
 * @module useVersionSwitch
 * 版本切换管理 composable
 */

import { ref, computed } from 'vue'
import { VERSION_CONFIG } from '../config/constants.js'
import { migrateTo } from '../services/migration/index.js'

/**
 * 版本切换功能
 * @returns {{
 *   versions: import('vue').Ref<Array<{tag: string, date: string}>>,
 *   currentVersion: import('vue').ComputedRef<string>,
 *   isLoading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string|null>,
 *   fetchVersions: () => Promise<void>,
 *   switchVersion: (targetVersion: string) => Promise<void>
 * }}
 */
export function useVersionSwitch() {
  const versions = ref([])
  const currentVersion = computed(() => __APP_VERSION__)
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * 获取可用版本列表
   */
  const fetchVersions = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(VERSION_CONFIG.VERSIONS_FILE)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      versions.value = data.versions || []
    } catch (e) {
      error.value = '无法加载版本列表'
      versions.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 清理 PWA 缓存和 Service Worker
   */
  const cleanPWACache = async () => {
    if (window.caches) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  }

  /**
   * 切换到指定版本
   * @param {string} targetVersion - 目标版本号
   */
  const switchVersion = async (targetVersion) => {
    // 获取目标版本的 schemaVersion
    const targetInfo = versions.value.find((v) => v.tag === targetVersion)
    const targetSchema = targetInfo?.schemaVersion ?? 0

    // 降级数据到目标 schema
    const result = migrateTo(targetSchema)
    if (!result.success) {
      error.value = `数据迁移失败: ${result.error}`
      return
    }

    await cleanPWACache()
    window.location.href = `${VERSION_CONFIG.VERSION_PATH_PREFIX}${targetVersion}/`
  }

  /**
   * 切换到最新版本（根路径）
   */
  const switchToLatest = async () => {
    await cleanPWACache()
    window.location.href = '/'
  }

  /**
   * 判断当前是否运行在版本子路径下
   */
  const isVersionedPath = computed(() => {
    return window.location.pathname.startsWith(VERSION_CONFIG.VERSION_PATH_PREFIX)
  })

  return {
    versions,
    currentVersion,
    isLoading,
    error,
    fetchVersions,
    switchVersion,
    switchToLatest,
    isVersionedPath
  }
}
