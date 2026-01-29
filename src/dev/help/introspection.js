/**
 * 运行时反射工具
 * 分析对象结构，提取方法、属性和 Vue Ref 信息
 */

/**
 * 检测值是否为 Vue Ref
 * @param {*} value - 要检测的值
 * @returns {boolean}
 */
const isVueRef = (value) => value && typeof value === 'object' && '__v_isRef' in value

/**
 * 从函数中提取参数签名
 * @param {Function} fn - 函数
 * @returns {string} 参数签名字符串
 */
const extractSignature = (fn) => {
  const fnStr = fn.toString()
  // 匹配函数参数列表
  const match = fnStr.match(/^(?:async\s+)?(?:function\s*)?\w*\s*\(([^)]*)\)/)
  if (match) {
    return match[1].trim() || ''
  }
  // 箭头函数简写形式 param => ...
  const arrowMatch = fnStr.match(/^(?:async\s+)?(\w+)\s*=>/)
  if (arrowMatch) {
    return arrowMatch[1]
  }
  return '...'
}

/**
 * 反射分析对象结构
 * @param {object} obj - 要分析的对象
 * @returns {object} 包含 methods、properties、refs 的分析结果
 */
export const introspect = (obj) => {
  const info = {
    methods: [],
    properties: [],
    refs: []
  }

  if (!obj || typeof obj !== 'object') {
    return info
  }

  for (const key of Object.keys(obj)) {
    // 跳过私有属性和 help 方法
    if (key.startsWith('_') || key === 'help') continue

    const value = obj[key]
    const descriptor = { name: key, type: typeof value }

    if (typeof value === 'function') {
      descriptor.signature = extractSignature(value)
      descriptor.isAsync = value.constructor.name === 'AsyncFunction'
      info.methods.push(descriptor)
    } else if (isVueRef(value)) {
      descriptor.refType = typeof value.value
      descriptor.currentValue = summarizeValue(value.value)
      info.refs.push(descriptor)
    } else {
      descriptor.currentValue = summarizeValue(value)
      info.properties.push(descriptor)
    }
  }

  // 按名称排序
  info.methods.sort((a, b) => a.name.localeCompare(b.name))
  info.properties.sort((a, b) => a.name.localeCompare(b.name))
  info.refs.sort((a, b) => a.name.localeCompare(b.name))

  return info
}

/**
 * 生成值的简短摘要
 * @param {*} value - 值
 * @returns {string} 摘要字符串
 */
function summarizeValue(value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const type = typeof value
  if (type === 'string') {
    return value.length > 30 ? `"${value.slice(0, 30)}..."` : `"${value}"`
  }
  if (type === 'number' || type === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }
  if (type === 'object') {
    const keys = Object.keys(value)
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`
  }
  return type
}
