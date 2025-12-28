/**
 * Service Worker 更新回调管理
 * 用于解决 main.js 和 App.vue 之间的循环依赖问题
 */

let swUpdateCallback = null

export const setSwUpdateCallback = (callback) => {
  swUpdateCallback = callback
}

export const getSwUpdateCallback = () => swUpdateCallback
