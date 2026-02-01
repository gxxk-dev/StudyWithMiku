/**
 * Service Worker 更新回调管理
 * 用于解决 main.js 和 App.vue 之间的循环依赖问题
 */

let swUpdateCallback = null

/**
 * 设置 SW 更新回调
 * @param {function({isBetaUpdate?: boolean, newVersion?: string}): void} callback - 更新回调函数
 */
export const setSwUpdateCallback = (callback) => {
  swUpdateCallback = callback
}

/**
 * 获取 SW 更新回调
 * @returns {function|null} 回调函数或 null
 */
export const getSwUpdateCallback = () => swUpdateCallback
