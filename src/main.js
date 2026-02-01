import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './styles/common.scss'
import { STORAGE_KEYS, UPDATE_CHANNEL_CONFIG, VERSION_CONFIG } from './config/constants.js'

// 入口重定向：稳定版用户访问根路径时重定向到版本子路径
const redirectPromise = (async () => {
  const isRootPath = window.location.pathname === '/' || window.location.pathname === '/index.html'
  const channel = localStorage.getItem(STORAGE_KEYS.UPDATE_CHANNEL) || UPDATE_CHANNEL_CONFIG.STABLE

  if (isRootPath && channel === UPDATE_CHANNEL_CONFIG.STABLE) {
    try {
      const response = await fetch(VERSION_CONFIG.VERSIONS_FILE, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        if (data.latest) {
          // 重定向到最新发布版本
          window.location.replace(`${VERSION_CONFIG.VERSION_PATH_PREFIX}${data.latest}/`)
          // 返回 Promise 永不 resolve，阻止后续代码执行
          return new Promise(() => {})
        }
      }
    } catch (e) {
      console.warn('[入口重定向] 获取版本信息失败，继续加载根路径:', e)
    }
  }
  return true
})()

// 等待重定向检查完成后再继续
redirectPromise.then(() => {
  // 在应用挂载前执行数据迁移
  import('./services/migration/index.js').then(({ runMigrations }) => {
    const migrationResult = runMigrations()
    if (!migrationResult.success) {
      console.error('[Migration] 数据迁移失败:', migrationResult.error)
    }
  })

  createApp(App).mount('#app')

  // PWA Service Worker 注册（仅在 PWA 模式下启用）
  import('virtual:pwa-register').then(({ registerSW }) => {
    import('./utils/pwaDetector.js').then(({ isPWAMode, watchPWAMode }) => {
      import('./utils/swCallback.js').then(({ getSwUpdateCallback }) => {
        if ('serviceWorker' in navigator && isPWAMode()) {
          registerSW({
            immediate: true,
            onNeedRefresh() {
              // 版本子路径下不处理 SW 更新（稳定版用户的更新由 checkForNewRelease 处理）
              if (window.location.pathname.startsWith(VERSION_CONFIG.VERSION_PATH_PREFIX)) {
                console.log('[PWA] 版本子路径，跳过 SW 更新提示')
                return
              }

              // 根路径（测试版用户）：正常提示更新
              const callback = getSwUpdateCallback()
              if (callback) {
                callback({ isBetaUpdate: true })
              } else {
                // 如果没有设置回调，使用默认行为
                window.location.reload()
              }
            },
            onOfflineReady() {
              console.log('PWA 离线就绪')
            },
            onRegistered() {
              console.log('Service Worker 已注册')
            },
            onRegisterError(error) {
              console.error('Service Worker 注册失败:', error)
            }
          })
          console.log('PWA 模式：Service Worker 已启用')
        } else {
          console.debug('网页模式：Service Worker 未启用')
        }

        // 监听模式切换（从网页模式安装为 PWA 时提示刷新）
        watchPWAMode((isPWA) => {
          if (isPWA && !navigator.serviceWorker.controller) {
            console.log('检测到 PWA 模式，建议刷新页面以启用 Service Worker')
          }
        })
      })
    })
  })
})
