/**
 * 检测应用是否在 PWA 独立模式下运行
 * @returns {boolean} true 表示在 PWA 模式，false 表示网页模式
 */
export const isPWAMode = () => {

  // 检测 display-mode: standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  // iOS Safari 特殊处理
  const isIOSStandalone = window.navigator.standalone === true

  return isStandalone || isIOSStandalone
}

/**
 * 监听 PWA 模式变化
 * @param {Function} callback - 模式变化时的回调函数
 * @returns {Function} 清理监听器的函数
 */
export const watchPWAMode = (callback) => {
  const mediaQuery = window.matchMedia('(display-mode: standalone)')

  const handler = (e) => {
    callback(e.matches || window.navigator.standalone === true)
  }

  // 监听变化（某些浏览器支持）
  mediaQuery.addEventListener('change', handler)

  return () => {
    mediaQuery.removeEventListener('change', handler)
  }
}
