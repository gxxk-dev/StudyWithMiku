import { ref, computed } from 'vue'

/**
 * URL 参数解析和验证
 *
 * 支持的参数：
 * - playlist: 歌单配置（格式：platform:id）
 * - focus: 专注时长（分钟，1-120）
 * - short: 短休息时长（分钟，1-60）
 * - long: 长休息时长（分钟，1-60）
 * - interval: 长休息间隔（1-10）
 * - autostart: 自动启动专注（值为 1 时启用）
 * - save: 保存配置到本地（值为 1 时启用）
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
   * 验证数字范围参数
   * @param {string} name - 参数名
   * @param {string} value - 参数值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number|null} 数值或 null（无效）
   */
  const validateNumber = (name, value, min, max) => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < min || num > max) {
      validationWarnings.value.push(`${name}: 无效值 "${value}"，应为 ${min}-${max} 之间的整数`)
      return null
    }
    return num
  }

  /**
   * 验证布尔标志参数（值为 "1" 时为 true）
   * @param {string} value - 参数值
   * @returns {boolean} 是否启用
   */
  const validateFlag = (value) => {
    return value === '1'
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

    // 解析专注配置
    const focusConfig = {}

    const focus = params.get('focus')
    if (focus) {
      const parsed = validateNumber('focus', focus, 1, 120)
      if (parsed !== null) {
        focusConfig.focusDuration = parsed * 60 // 转换为秒
      }
    }

    const short = params.get('short')
    if (short) {
      const parsed = validateNumber('short', short, 1, 60)
      if (parsed !== null) {
        focusConfig.shortBreakDuration = parsed * 60
      }
    }

    const long = params.get('long')
    if (long) {
      const parsed = validateNumber('long', long, 1, 60)
      if (parsed !== null) {
        focusConfig.longBreakDuration = parsed * 60
      }
    }

    const interval = params.get('interval')
    if (interval) {
      const parsed = validateNumber('interval', interval, 1, 10)
      if (parsed !== null) {
        focusConfig.longBreakInterval = parsed
      }
    }

    // 如果有任何专注配置，添加到 config
    if (Object.keys(focusConfig).length > 0) {
      config.focus = focusConfig
    }

    // 解析标志参数
    const autostart = params.get('autostart')
    if (autostart && validateFlag(autostart)) {
      config.autostart = true
    }

    const save = params.get('save')
    if (save && validateFlag(save)) {
      config.save = true
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
