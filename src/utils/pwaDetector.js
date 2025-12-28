/**
 * 检测应用是否在 PWA 独立模式下运行
 * @returns {boolean} true 表示在 PWA 模式，false 表示网页模式
 */
export const isPWAMode = () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
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

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler)
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handler)
    return () => {
      mediaQuery.removeListener(handler)
    }
  } else {
    return () => {}
  }
}
