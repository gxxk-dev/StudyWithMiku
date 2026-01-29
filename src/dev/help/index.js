/**
 * 帮助系统核心
 * 结合构建时提取的 JSDoc 元数据和运行时反射，提供完整的帮助信息
 */
import { introspect } from './introspection.js'
import { printOverview, printModuleDetail, setColorMode, getColorMode } from './formatter.js'

let helpMetadata = null
let metadataLoading = null

/**
 * 预加载帮助元数据
 * @returns {Promise<object>} 帮助元数据
 */
function preloadMetadata() {
  if (helpMetadata) return Promise.resolve(helpMetadata)
  if (metadataLoading) return metadataLoading

  metadataLoading = fetch('/help-metadata.json')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })
    .then((data) => {
      helpMetadata = data
      return data
    })
    .catch((e) => {
      console.warn('[help] 无法加载帮助元数据:', e.message)
      helpMetadata = {}
      return {}
    })

  return metadataLoading
}

/**
 * 创建帮助系统
 * @param {object} modules - 所有模块对象
 * @returns {object} 包含 help 函数和 injectModuleHelp 方法
 */
export const createHelpSystem = (modules) => {
  const introspectionCache = new Map()

  // 立即开始预加载元数据
  preloadMetadata()

  /**
   * 获取模块的反射信息（带缓存）
   * @param {string} name - 模块名称
   * @returns {object} 反射分析结果
   */
  const getIntrospection = (name) => {
    if (!introspectionCache.has(name)) {
      introspectionCache.set(name, introspect(modules[name]))
    }
    return introspectionCache.get(name)
  }

  /**
   * 帮助函数（同步）
   * @param {string} [moduleName] - 模块名称，不传则显示概览
   * @param {object} [options] - 选项
   * @param {boolean} [options.color] - 是否使用颜色模式
   */
  const help = (moduleName, options = {}) => {
    // 如果元数据还没加载完，使用空对象
    const metadata = helpMetadata || {}

    if (!moduleName) {
      printOverview(modules, metadata, options)
      return
    }

    // 如果第一个参数是对象，当作 options 处理
    if (typeof moduleName === 'object') {
      printOverview(modules, metadata, moduleName)
      return
    }

    if (!(moduleName in modules)) {
      console.error(`未知模块: ${moduleName}`)
      console.log(
        '可用模块:',
        Object.keys(modules)
          .filter((k) => k !== 'help')
          .join(', ')
      )
      return
    }

    const introspected = getIntrospection(moduleName)
    const meta = metadata[moduleName] || {}
    printModuleDetail(moduleName, modules[moduleName], introspected, meta, options)
  }

  /**
   * 为每个模块注入 help 方法
   */
  const injectModuleHelp = () => {
    for (const [name, module] of Object.entries(modules)) {
      if (name === 'help' || typeof module !== 'object' || module === null) continue
      if (typeof module.help === 'function') continue

      // 尝试注入 help 方法，如果对象不可扩展则跳过
      try {
        Object.defineProperty(module, 'help', {
          value: (options) => help(name, options),
          writable: false,
          enumerable: false,
          configurable: false
        })
      } catch {
        // 对象不可扩展（如 Proxy），跳过注入
      }
    }
  }

  return { help, injectModuleHelp, setColorMode, getColorMode }
}
