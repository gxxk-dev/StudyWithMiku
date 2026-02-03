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
