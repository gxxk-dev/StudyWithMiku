import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './styles/common.scss'

// 数据迁移（必须在应用初始化前执行）
import { runMigrations } from './services/migration.js'

const migrationResult = runMigrations()
if (!migrationResult.success) {
  console.warn('[App] 数据迁移失败:', migrationResult.errors)
  if (migrationResult.rolledBack) {
    console.log('[App] 数据已回滚到迁移前状态')
  }
}

createApp(App).mount('#app')

// PWA Service Worker 注册（仅在 PWA 模式下启用）
import { registerSW } from 'virtual:pwa-register'
import { isPWAMode, watchPWAMode } from './utils/pwaDetector.js'
import { getSwUpdateCallback } from './utils/swCallback.js'

if ('serviceWorker' in navigator && isPWAMode()) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // 触发更新通知而非直接刷新
      const callback = getSwUpdateCallback()
      if (callback) {
        callback()
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
