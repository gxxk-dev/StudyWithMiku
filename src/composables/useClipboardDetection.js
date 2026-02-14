/**
 * 剪贴板检测 Composable
 *
 * 自动检测剪贴板中的：
 * 1. 歌单 URL（网易云/QQ音乐/Spotify）
 * 2. 本应用的带参数 URL（包含专注配置）
 *
 * @module composables/useClipboardDetection
 */

import { ref } from 'vue'
import { detectPlatformFromText, extractPlaylistId } from './usePlaylistDetection.js'
import { parseUrlString } from './useUrlParams.js'
import { getConfig } from '../services/runtimeConfig.js'

/**
 * 上次检测到的内容标识（防重复触发）
 */
const lastDetectedKey = ref('')

/**
 * 检测是否为本应用的 URL
 * @param {string} text - 待检测文本
 * @returns {boolean} 是否为本应用 URL
 */
function isAppUrl(text) {
  try {
    const url = new URL(text)

    // 检查协议
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false
    }

    const hostname = url.hostname.toLowerCase()

    // 匹配本地开发环境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true
    }

    // 匹配当前访问的域名
    if (typeof window !== 'undefined' && hostname === window.location.hostname.toLowerCase()) {
      return true
    }

    return false
  } catch {
    // 不是有效的 URL
    return false
  }
}

/**
 * 检测应用 URL 是否包含有效参数
 * @param {string} text - 待检测的 URL 文本
 * @returns {boolean} 是否包含有效参数
 */
function hasValidAppParams(text) {
  try {
    const url = new URL(text)
    const params = url.searchParams

    // 检查是否包含任一有效参数
    const validParams = ['focus', 'short', 'long', 'interval', 'playlist', 'autostart', 'save']
    return validParams.some((param) => params.has(param))
  } catch {
    return false
  }
}

/**
 * 剪贴板检测
 *
 * @returns {Object} { checkClipboard, lastDetectedKey, clearLastDetected }
 */
export function useClipboardDetection() {
  /**
   * 检测剪贴板内容
   * @returns {Promise<Object|null>} 检测结果
   *
   * 返回类型：
   * - 歌单 URL: { type: 'playlist', platform, playlistId, rawText }
   * - 应用 URL: { type: 'appUrl', config, warnings, rawText }
   * - 无效: null
   */
  const checkClipboard = async () => {
    // 检查 Clipboard API 是否可用
    if (!navigator.clipboard?.readText) {
      console.debug('[ClipboardDetection] Clipboard API 不可用')
      return null
    }

    try {
      const text = await navigator.clipboard.readText()

      if (!text || !text.trim()) {
        return null
      }

      const trimmedText = text.trim()

      // 优先检测应用 URL（带参数）
      if (isAppUrl(trimmedText) && hasValidAppParams(trimmedText)) {
        const url = new URL(trimmedText)
        const { config, warnings } = parseUrlString(url.search)

        // 检查是否有有效配置
        if (Object.keys(config).length === 0) {
          console.debug('[ClipboardDetection] 应用 URL 无有效配置')
          return null
        }

        // 生成唯一标识（用于防重复）
        const detectionKey = `appUrl:${url.search}`
        if (detectionKey === lastDetectedKey.value) {
          console.debug('[ClipboardDetection] 已检测过相同的应用 URL，跳过')
          return null
        }

        // 记录本次检测
        lastDetectedKey.value = detectionKey

        console.debug('[ClipboardDetection] 检测到应用 URL:', { config, warnings })
        return { type: 'appUrl', config, warnings, rawText: trimmedText }
      }

      // 检测歌单 URL
      const platform = detectPlatformFromText(trimmedText)
      if (platform) {
        const playlistId = extractPlaylistId(trimmedText, platform)
        if (playlistId) {
          // 防重复：检查是否与上次相同
          const detectionKey = `playlist:${platform}:${playlistId}`
          if (detectionKey === lastDetectedKey.value) {
            console.debug('[ClipboardDetection] 已检测过相同的歌单，跳过')
            return null
          }

          // 记录本次检测
          lastDetectedKey.value = detectionKey

          console.debug('[ClipboardDetection] 检测到歌单:', { platform, playlistId })
          return { type: 'playlist', platform, playlistId, rawText: trimmedText }
        }
      }

      return null
    } catch (error) {
      // 用户拒绝权限或其他错误，静默处理
      if (error.name === 'NotAllowedError') {
        console.debug('[ClipboardDetection] 剪贴板权限被拒绝')
      } else {
        console.debug('[ClipboardDetection] 读取剪贴板失败:', error.message)
      }
      return null
    }
  }

  /**
   * 清除上次检测记录（允许重新检测同一内容）
   */
  const clearLastDetected = () => {
    lastDetectedKey.value = ''
  }

  // 兼容旧 API：lastDetectedUrl 作为 lastDetectedKey 的别名
  const lastDetectedUrl = lastDetectedKey

  return {
    checkClipboard,
    lastDetectedKey,
    lastDetectedUrl,
    clearLastDetected
  }
}

/**
 * 剪贴板检测编排（App 级别）
 *
 * 管理剪贴板权限检查、首次交互检测、页面可见性检测等生命周期
 *
 * @param {Object} deps - 依赖注入
 * @param {Function} deps.checkClipboard - 剪贴板检测函数
 * @param {Function} deps.showToast - Toast 通知函数
 * @param {Function} deps.showConfirm - 确认对话框函数
 * @param {Function} deps.applyUrlPlaylist - 应用 URL 歌单
 * @param {Function} deps.updateFocusSettings - 更新专注设置
 * @param {Function} deps.startFocus - 启动专注
 */
export function setupClipboardDetection(deps) {
  const {
    checkClipboard,
    showToast,
    showConfirm,
    applyUrlPlaylist,
    updateFocusSettings,
    startFocus
  } = deps

  const platformLabels = {
    netease: '网易云',
    tencent: 'QQ音乐',
    spotify: 'Spotify'
  }

  /**
   * 处理检测到的剪贴板歌单
   */
  const handleClipboardPlaylist = async (detected) => {
    const platformLabel = platformLabels[detected.platform] || detected.platform

    showConfirm('检测到歌单链接', `是否切换到 ${platformLabel} 歌单？`, {
      confirmText: '切换',
      cancelText: '取消',
      onConfirm: async () => {
        const playlistConfig = `${detected.platform}:${detected.playlistId}`
        const success = await applyUrlPlaylist(playlistConfig)

        if (success) {
          showToast(
            'success',
            '歌单已切换',
            platformLabel,
            getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
          )
        } else {
          showToast(
            'error',
            '歌单加载失败',
            '请检查链接是否正确',
            getConfig('UI_CONFIG', 'TOAST_ERROR_DURATION')
          )
        }
      }
    })
  }

  /**
   * 处理检测到的应用 URL（带专注配置）
   */
  const handleClipboardAppUrl = async (detected) => {
    const { config, warnings } = detected

    const summaryParts = []

    if (config.focus) {
      const focusParts = []
      if (config.focus.focusDuration) {
        focusParts.push(`专注 ${config.focus.focusDuration / 60} 分钟`)
      }
      if (config.focus.shortBreakDuration !== undefined) {
        focusParts.push(`短休息 ${config.focus.shortBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakDuration !== undefined) {
        focusParts.push(`长休息 ${config.focus.longBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakInterval) {
        focusParts.push(`间隔 ${config.focus.longBreakInterval} 次`)
      }
      if (focusParts.length > 0) {
        summaryParts.push(focusParts.join('、'))
      }
    }

    if (config.playlist) {
      const platformLabel = platformLabels[config.playlist.platform] || config.playlist.platform
      summaryParts.push(`歌单：${platformLabel}`)
    }

    if (config.autostart) {
      summaryParts.push('自动启动专注')
    }

    const summary = summaryParts.join('\n')

    showConfirm('检测到专注配置', summary || '应用分享的配置？', {
      confirmText: '应用并开始',
      cancelText: '取消',
      onConfirm: async () => {
        if (warnings && warnings.length > 0) {
          showToast(
            'warning',
            '部分参数无效',
            warnings.join('；'),
            getConfig('UI_CONFIG', 'TOAST_ERROR_DURATION')
          )
        }

        if (config.playlist) {
          const playlistConfig = `${config.playlist.platform}:${config.playlist.id}`
          const success = await applyUrlPlaylist(playlistConfig)
          if (!success) {
            showToast(
              'error',
              '歌单加载失败',
              '将使用当前歌单',
              getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
            )
          }
        }

        if (config.focus) {
          updateFocusSettings(config.focus)
        }

        if (config.autostart || config.focus) {
          startFocus()
          showToast('success', '专注已启动', '', getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION'))
        }
      }
    })
  }

  /**
   * 执行剪贴板检测
   */
  const performClipboardCheck = async () => {
    const detected = await checkClipboard()
    if (!detected) return

    if (detected.type === 'appUrl') {
      await handleClipboardAppUrl(detected)
    } else if (detected.type === 'playlist') {
      await handleClipboardPlaylist(detected)
    }
  }

  // === 剪贴板权限管理 ===
  let clipboardPermissionGranted = false
  let firstInteractionHandled = false

  const checkClipboardPermission = async () => {
    if (!navigator.permissions) return 'unknown'
    try {
      const result = await navigator.permissions.query({ name: 'clipboard-read' })
      return result.state
    } catch {
      return 'unknown'
    }
  }

  const handleFirstInteraction = async () => {
    if (firstInteractionHandled) return
    firstInteractionHandled = true

    showToast(
      'info',
      '检测剪贴板',
      '如弹出菜单，请点击"粘贴"以启用自动检测',
      getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
    )

    await new Promise((resolve) => setTimeout(resolve, 300))
    await performClipboardCheck()

    const state = await checkClipboardPermission()
    clipboardPermissionGranted = state === 'granted'
  }

  let visibilityCheckTimeout = null
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      if (!firstInteractionHandled) return

      if (!clipboardPermissionGranted) {
        const state = await checkClipboardPermission()
        if (state === 'denied') {
          console.debug('[ClipboardDetection] 权限已被拒绝，跳过 visibilitychange 检测')
          return
        }
        clipboardPermissionGranted = state === 'granted'
      }

      if (visibilityCheckTimeout) {
        clearTimeout(visibilityCheckTimeout)
      }
      visibilityCheckTimeout = setTimeout(() => {
        performClipboardCheck()
        visibilityCheckTimeout = null
      }, 500)
    }
  }

  // 初始化时检查权限状态
  checkClipboardPermission().then((state) => {
    clipboardPermissionGranted = state === 'granted'
    if (state === 'granted') {
      firstInteractionHandled = true
      setTimeout(
        () => {
          performClipboardCheck()
        },
        getConfig('UI_CONFIG', 'APLAYER_LOAD_DELAY') + 500
      )
    } else {
      document.addEventListener('click', handleFirstInteraction, { once: true })
      document.addEventListener('touchstart', handleFirstInteraction, { once: true })
    }
  })

  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 存储清理引用
  window.__clipboardCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('click', handleFirstInteraction)
    document.removeEventListener('touchstart', handleFirstInteraction)
    if (visibilityCheckTimeout) {
      clearTimeout(visibilityCheckTimeout)
    }
  }
}

/**
 * 清理剪贴板检测监听器
 */
export function cleanupClipboardDetection() {
  if (window.__clipboardCleanup) {
    window.__clipboardCleanup()
    delete window.__clipboardCleanup
  }
}
