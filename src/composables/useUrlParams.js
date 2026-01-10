import { ref, computed } from 'vue'

const VALIDATION_RULES = {
  pomodoro: { min: 1, max: 120, default: 25 },
  shortBreak: { min: 1, max: 60, default: 5 },
  longBreak: { min: 1, max: 120, default: null }
}

/**
 * URL 参数解析和验证
 *
 * 支持的参数：
 * - pomodoro: 专注时长（分钟）
 * - shortBreak: 短休息时长（分钟）
 * - longBreak: 长休息时长（分钟，可选）
 * - autoStart: 自动启动标志
 * - playlist: 歌单配置（格式：platform:id）
 *
 * @returns {Object} { urlConfig, hasUrlParams, validationWarnings }
 */
export function useUrlParams() {
  const urlConfig = ref({})
  const validationWarnings = ref([])

  /**
   * 验证数字参数
   * @param {string} key - 参数名
   * @param {string} value - 参数值
   * @returns {number|null} 验证后的数字，或 null（无效）
   */
  const validateNumber = (key, value) => {
    const num = parseInt(value, 10)
    const rule = VALIDATION_RULES[key]

    if (isNaN(num)) {
      validationWarnings.value.push(`${key}: 无效数字 "${value}"，已忽略`)
      return null
    }

    if (num < rule.min || num > rule.max) {
      const clamped = Math.max(rule.min, Math.min(rule.max, num))
      validationWarnings.value.push(`${key}: ${num} 超出范围 [${rule.min}-${rule.max}]，截断为 ${clamped}`)
      return clamped
    }

    return num
  }

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

    // 解析数字参数（番茄钟时长）
    for (const key of ['pomodoro', 'shortBreak', 'longBreak']) {
      const value = params.get(key)
      if (value !== null && value !== '') {
        const parsed = validateNumber(key, value)
        if (parsed !== null) {
          config[key] = parsed
        }
      }
    }

    // 解析 autoStart（布尔值）
    const autoStart = params.get('autoStart')
    if (autoStart !== null) {
      config.autoStart = ['true', '1', 'yes'].includes(autoStart.toLowerCase())
    }

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
    validationWarnings.value.forEach(warning => console.warn(`  - ${warning}`))
  }

  // 是否有 URL 参数
  const hasUrlParams = computed(() => Object.keys(urlConfig.value).length > 0)

  // 输出解析结果
  if (hasUrlParams.value) {
    console.log('[URL Params] 解析成功:', urlConfig.value)
  }

  return {
    urlConfig,
    hasUrlParams,
    validationWarnings
  }
}
