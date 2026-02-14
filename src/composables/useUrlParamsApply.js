/**
 * URL 参数应用 Composable
 *
 * 提取自 App.vue onMounted 中的 URL 参数处理逻辑：
 * - 构建配置摘要并显示 Toast
 * - 应用歌单配置
 * - 应用专注配置（含覆盖确认）
 *
 * @module composables/useUrlParamsApply
 */

import { getConfig } from '../services/runtimeConfig.js'
import { FOCUS_STORAGE_KEYS } from './focus/constants.js'
import { safeLocalStorageGetJSON } from '../utils/storage.js'

const platformLabels = {
  netease: '网易云',
  tencent: 'QQ音乐',
  spotify: 'Spotify'
}

/**
 * @param {Object} deps - 依赖注入
 * @param {Function} deps.showToast - Toast 通知函数
 * @param {Function} deps.showConfirm - 确认对话框函数
 * @param {Function} deps.updateFocusSettings - 更新专注设置
 * @param {Function} deps.startFocus - 启动专注
 * @param {Function} deps.applyUrlPlaylist - 应用 URL 歌单
 * @param {import('vue').Ref} deps.urlConfig - URL 配置
 * @param {import('vue').Ref} deps.hasUrlParams - 是否有 URL 参数
 * @param {import('vue').Ref} deps.validationWarnings - 验证警告
 */
export function useUrlParamsApply(deps) {
  const {
    showToast,
    showConfirm,
    updateFocusSettings,
    startFocus,
    applyUrlPlaylist,
    urlConfig,
    hasUrlParams,
    validationWarnings
  } = deps

  /**
   * 构建配置摘要文本
   * @param {Object} config - URL 配置对象
   * @returns {string} 摘要文本
   */
  const buildSummary = (config) => {
    const parts = []
    if (config.playlist) {
      const label = platformLabels[config.playlist.platform] || config.playlist.platform
      parts.push(`歌单：${label} ${config.playlist.id}`)
    }
    if (config.focus) {
      const focusParts = []
      if (config.focus.focusDuration) {
        focusParts.push(`专注 ${config.focus.focusDuration / 60} 分钟`)
      }
      if (config.focus.shortBreakDuration) {
        focusParts.push(`短休息 ${config.focus.shortBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakDuration) {
        focusParts.push(`长休息 ${config.focus.longBreakDuration / 60} 分钟`)
      }
      if (config.focus.longBreakInterval) {
        focusParts.push(`间隔 ${config.focus.longBreakInterval} 次`)
      }
      if (focusParts.length > 0) {
        parts.push(focusParts.join('、'))
      }
    }
    if (config.autostart) {
      parts.push('自动启动')
    }
    if (config.save) {
      parts.push('保存配置')
    }
    return parts.join('，')
  }

  /**
   * 应用歌单配置（延迟执行）
   * @param {Object} playlist - 歌单配置 { platform, id }
   */
  const applyPlaylistConfig = (playlist) => {
    setTimeout(
      async () => {
        try {
          const playlistConfig = `${playlist.platform}:${playlist.id}`
          const success = await applyUrlPlaylist(playlistConfig)
          if (!success) {
            showToast(
              'error',
              '歌单加载失败',
              '将使用默认歌单',
              getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
            )
          }
        } catch (error) {
          console.error('[App] 应用歌单失败:', error)
          showToast(
            'error',
            '歌单加载失败',
            '将使用默认歌单',
            getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
          )
        }
      },
      getConfig('UI_CONFIG', 'PLAYLIST_APPLY_DELAY')
    )
  }

  /**
   * 应用专注配置（含覆盖确认）
   * @param {Object} config - URL 配置对象
   */
  const applyFocusAndAutostart = (config) => {
    setTimeout(
      () => {
        const savedSettings = safeLocalStorageGetJSON(FOCUS_STORAGE_KEYS.SETTINGS, null)
        const hasCustomSettings = savedSettings !== null

        const applyFocusConfig = (saveToLocal) => {
          if (config.focus) {
            const newSettings = { ...config.focus }
            updateFocusSettings(newSettings)
            if (saveToLocal) {
              console.debug('[App] 专注配置已保存:', newSettings)
            } else {
              console.debug('[App] 专注配置已临时应用:', newSettings)
            }
          }

          if (config.autostart) {
            startFocus()
            showToast('success', '专注已启动', '', getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION'))
            console.debug('[App] 专注已自动启动')
          }
        }

        if (config.save && hasCustomSettings) {
          showConfirm('覆盖现有配置？', '检测到您有自定义的专注设置，是否用 URL 参数覆盖？', {
            confirmText: '覆盖',
            cancelText: '仅本次',
            onConfirm: () => {
              applyFocusConfig(true)
              showToast(
                'success',
                '配置已保存',
                '',
                getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
              )
            },
            onCancel: () => {
              applyFocusConfig(false)
            }
          })
        } else if (config.save) {
          applyFocusConfig(true)
        } else {
          applyFocusConfig(false)
        }
      },
      getConfig('UI_CONFIG', 'PLAYLIST_APPLY_DELAY')
    )
  }

  /**
   * 应用全部 URL 参数配置
   */
  const applyUrlParams = () => {
    if (!hasUrlParams.value) return

    const config = urlConfig.value

    // 1. 构建并显示配置摘要
    const summary = buildSummary(config)
    const hasValidConfig = summary.length > 0
    const hasWarnings = validationWarnings.value.length > 0

    if (hasValidConfig) {
      showToast(
        'info',
        '已应用自定义配置',
        summary,
        getConfig('UI_CONFIG', 'TOAST_DEFAULT_DURATION')
      )
    }

    if (hasWarnings) {
      const warningMessage = validationWarnings.value.join('；')
      showToast(
        'error',
        '部分参数无效',
        warningMessage,
        getConfig('UI_CONFIG', 'TOAST_ERROR_DURATION')
      )
    }

    // 2. 应用歌单配置
    if (config.playlist) {
      applyPlaylistConfig(config.playlist)
    }

    // 3. 应用专注配置
    if (config.focus || config.autostart) {
      applyFocusAndAutostart(config)
    }
  }

  return { applyUrlParams }
}
