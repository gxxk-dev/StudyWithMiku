import { ref, computed } from 'vue'

/**
 * URL 参数解析和验证
 *
 * 支持的参数：
 * - playlist: 歌单配置（格式：platform:id）
 *
 * @returns {Object} { urlConfig, hasUrlParams, validationWarnings }
 */
export function useUrlParams() {
  const urlConfig = ref({})
  const validationWarnings = ref([])

  /**
   * 验证歌单参数
   * @param {string} value - 歌单参数值（格式：platform:id）
   * @returns {Object|null} { platform, id } 或 null（无效）
   */
  const validatePlaylist = (value) => {
    const pattern = /^(netease|tencent|spotify):[a-zA-Z0-9_-]+$/
    const decoded = decodeURIComponent(value)

    if (!pattern.test(decoded)) {
      validationWarnings.value.push(`playlist: 无效格式 "${value}"，格式应为 platform:id`)
      return null
    }

    const [platform, id] = decoded.split(':')
    return { platform, id }
  }

  /**
   * 解析 URL 参数
   * @returns {Object} 配置对象
   */
  const parseUrlParams = () => {
    const params = new URLSearchParams(window.location.search)
    const config = {}

    // 解析歌单配置
    const playlist = params.get('playlist')
    if (playlist) {
      const parsed = validatePlaylist(playlist)
      if (parsed) {
        config.playlist = parsed
      }
    }

    return config
  }

  // 解析 URL 参数
  urlConfig.value = parseUrlParams()

  // 输出警告信息
  if (validationWarnings.value.length > 0) {
    console.warn('[URL Params] 参数验证警告:')
    validationWarnings.value.forEach((warning) => console.warn(`  - ${warning}`))
  }

  // 是否有 URL 参数
  const hasUrlParams = computed(() => Object.keys(urlConfig.value).length > 0)

  // 输出解析结果
  if (hasUrlParams.value) {
    console.debug('[URL Params] 解析成功:', urlConfig.value)
  }

  return {
    urlConfig,
    hasUrlParams,
    validationWarnings
  }
}
