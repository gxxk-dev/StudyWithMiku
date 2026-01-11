/**
 * 安全的 localStorage 操作工具函数
 * 统一处理 localStorage 的异常情况
 */

/**
 * 安全获取 localStorage 值
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值（当获取失败或不存在时返回）
 * @returns {string|null|*} 存储的值或默认值
 */
export const safeLocalStorageGet = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key)
    return value !== null ? value : defaultValue
  } catch (err) {
    console.warn(`localStorage.getItem 失败 (${key}):`, err)
    return defaultValue
  }
}

/**
 * 安全设置 localStorage 值
 * @param {string} key - 存储键名
 * @param {string} value - 要存储的值
 * @returns {boolean} 是否成功
 */
export const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    console.warn(`localStorage.setItem 失败 (${key}):`, err)
    return false
  }
}

/**
 * 安全删除 localStorage 值
 * @param {string} key - 存储键名
 * @returns {boolean} 是否成功
 */
export const safeLocalStorageRemove = (key) => {
  try {
    localStorage.removeItem(key)
    return true
  } catch (err) {
    console.warn(`localStorage.removeItem 失败 (${key}):`, err)
    return false
  }
}
