/**
 * 运行时配置服务
 * 允许高级用户在运行时修改配置常量
 *
 * 使用方式：
 *   swm_dev.config.get('UI_CONFIG')           - 获取配置组
 *   swm_dev.config.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 5000)  - 修改配置
 *   swm_dev.config.reset()                    - 重置所有配置
 *   swm_dev.config.reset('UI_CONFIG')         - 重置指定配置组
 */

import { reactive, readonly } from 'vue'
import {
  UI_CONFIG as DEFAULT_UI_CONFIG,
  AUDIO_CONFIG as DEFAULT_AUDIO_CONFIG,
  CACHE_CONFIG as DEFAULT_CACHE_CONFIG,
  WS_CONFIG as DEFAULT_WS_CONFIG,
  RECONNECT_CONFIG as DEFAULT_RECONNECT_CONFIG,
  API_CONFIG as DEFAULT_API_CONFIG
} from '../config/constants.js'

// 深拷贝默认配置
const cloneConfig = (config) => JSON.parse(JSON.stringify(config))

// 运行时配置（响应式）
const runtimeConfig = reactive({
  UI_CONFIG: cloneConfig(DEFAULT_UI_CONFIG),
  AUDIO_CONFIG: cloneConfig(DEFAULT_AUDIO_CONFIG),
  CACHE_CONFIG: cloneConfig(DEFAULT_CACHE_CONFIG),
  WS_CONFIG: cloneConfig(DEFAULT_WS_CONFIG),
  RECONNECT_CONFIG: cloneConfig(DEFAULT_RECONNECT_CONFIG),
  API_CONFIG: cloneConfig(DEFAULT_API_CONFIG)
})

// 默认配置备份（用于重置）
const defaultConfigs = {
  UI_CONFIG: DEFAULT_UI_CONFIG,
  AUDIO_CONFIG: DEFAULT_AUDIO_CONFIG,
  CACHE_CONFIG: DEFAULT_CACHE_CONFIG,
  WS_CONFIG: DEFAULT_WS_CONFIG,
  RECONNECT_CONFIG: DEFAULT_RECONNECT_CONFIG,
  API_CONFIG: DEFAULT_API_CONFIG
}

/**
 * 获取配置组
 * @param {string} group - 配置组名称
 * @returns {Object} 配置对象
 */
const get = (group) => {
  if (!group) {
    return { ...runtimeConfig }
  }
  if (!(group in runtimeConfig)) {
    console.warn(`[RuntimeConfig] 未知的配置组: ${group}`)
    return null
  }
  return { ...runtimeConfig[group] }
}

/**
 * 设置配置值
 * @param {string} group - 配置组名称
 * @param {string} key - 配置键名
 * @param {*} value - 配置值
 * @returns {boolean} 是否成功
 */
const set = (group, key, value) => {
  if (!(group in runtimeConfig)) {
    console.error(`[RuntimeConfig] 未知的配置组: ${group}`)
    return false
  }
  if (!(key in runtimeConfig[group])) {
    console.error(`[RuntimeConfig] 未知的配置键: ${group}.${key}`)
    return false
  }

  const oldValue = runtimeConfig[group][key]
  runtimeConfig[group][key] = value
  console.log(`[RuntimeConfig] ${group}.${key}: ${oldValue} → ${value}`)
  return true
}

/**
 * 重置配置
 * @param {string} [group] - 配置组名称，不传则重置所有
 */
const reset = (group) => {
  if (group) {
    if (!(group in defaultConfigs)) {
      console.error(`[RuntimeConfig] 未知的配置组: ${group}`)
      return false
    }
    Object.assign(runtimeConfig[group], cloneConfig(defaultConfigs[group]))
    console.log(`[RuntimeConfig] 已重置 ${group}`)
    return true
  }

  // 重置所有
  Object.keys(defaultConfigs).forEach((g) => {
    Object.assign(runtimeConfig[g], cloneConfig(defaultConfigs[g]))
  })
  console.log('[RuntimeConfig] 已重置所有配置')
  return true
}

/**
 * 列出所有配置
 */
const list = () => {
  console.log('%c[RuntimeConfig] 当前配置:', 'color: #39c5bb; font-weight: bold')
  Object.entries(runtimeConfig).forEach(([group, config]) => {
    console.group(group)
    Object.entries(config).forEach(([key, value]) => {
      const defaultValue = defaultConfigs[group][key]
      const isModified = value !== defaultValue
      if (isModified) {
        console.log(`%c${key}: ${value} (默认: ${defaultValue})`, 'color: #ff9800')
      } else {
        console.log(`${key}: ${value}`)
      }
    })
    console.groupEnd()
  })
}

/**
 * 导出配置 API
 */
export const runtimeConfigService = {
  // 响应式配置（只读引用，防止直接赋值）
  UI_CONFIG: readonly(runtimeConfig.UI_CONFIG),
  AUDIO_CONFIG: readonly(runtimeConfig.AUDIO_CONFIG),
  CACHE_CONFIG: readonly(runtimeConfig.CACHE_CONFIG),
  WS_CONFIG: readonly(runtimeConfig.WS_CONFIG),
  RECONNECT_CONFIG: readonly(runtimeConfig.RECONNECT_CONFIG),
  API_CONFIG: readonly(runtimeConfig.API_CONFIG),

  // 内部可写引用（供内部模块使用）
  _writable: runtimeConfig,

  // API 方法
  get,
  set,
  reset,
  list,

  // 帮助信息
  help() {
    console.log(
      `%c[RuntimeConfig] 配置管理 API:

  swm_dev.config.list()                    - 列出所有配置
  swm_dev.config.get('UI_CONFIG')          - 获取配置组
  swm_dev.config.set(group, key, value)    - 修改配置
  swm_dev.config.reset()                   - 重置所有配置
  swm_dev.config.reset('UI_CONFIG')        - 重置指定配置组

配置组:
  UI_CONFIG       - UI 相关配置（Toast、延迟等）
  AUDIO_CONFIG    - 音频相关配置（音量、渐变等）
  CACHE_CONFIG    - 缓存相关配置
  WS_CONFIG       - WebSocket 配置
  RECONNECT_CONFIG - 重连配置
  API_CONFIG      - API 配置

示例:
  swm_dev.config.set('UI_CONFIG', 'TOAST_DEFAULT_DURATION', 5000)
  swm_dev.config.set('AUDIO_CONFIG', 'DEFAULT_VOLUME', 0.5)
`,
      'color: #39c5bb'
    )
  }
}

// 导出便捷访问器（用于其他模块）
export const getConfig = (group, key) => {
  if (key) {
    return runtimeConfig[group]?.[key]
  }
  return runtimeConfig[group]
}

export default runtimeConfigService
