import { computed, reactive, toRefs } from 'vue'

const STORAGE_KEY = 'countServer'

const DEFAULT_CONFIG = {
  selectedServerId: 'default',
  customServerUrl: '',
  autoFallback: true
}

// 预设服务器列表
const predefinedServers = [
  {
    id: 'default',
    name: '默认服务器',
    url: null, // null = 自动检测当前域名
    description: '自动根据当前域名连接'
  },
  {
    id: 'custom',
    name: '自定义服务器',
    url: '', // 用户输入
    description: '自定义 WebSocket 地址'
  }
]

// 加载配置
const loadConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : { ...DEFAULT_CONFIG }
  } catch (e) {
    console.error('Failed to load server config:', e)
    return { ...DEFAULT_CONFIG }
  }
}

// 保存配置
const saveConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Failed to save server config:', e)
  }
}

// 解析默认 WebSocket URL（自动检测）
const resolveDefaultWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  if (typeof window === 'undefined') return 'ws://localhost:8787/ws'
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

// 连接测试
const testConnection = async (url) => {
  return new Promise((resolve) => {
    let ws = null
    let timeout = null
    const startTime = Date.now()

    // 清理函数：关闭连接并移除所有事件处理器
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      if (ws) {
        try {
          ws.onopen = null
          ws.onerror = null
          ws.onclose = null
          ws.close()
        } catch (err) {
          console.warn('Cleanup error:', err)
        }
        ws = null
      }
    }

    timeout = setTimeout(() => {
      cleanup()
      resolve({ success: false, error: '连接超时' })
    }, 5000)

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        const latency = Date.now() - startTime
        cleanup()
        resolve({ success: true, latency })
      }

      ws.onerror = () => {
        cleanup()
        resolve({ success: false, error: '连接失败' })
      }
    } catch (err) {
      cleanup()
      resolve({ success: false, error: err.message })
    }
  })
}

// 导出 composable
export function useServerConfig() {
  // 使用 reactive 包装配置对象以保持响应性
  const state = reactive(loadConfig())

  const persistConfig = () => {
    saveConfig({
      selectedServerId: state.selectedServerId,
      customServerUrl: state.customServerUrl,
      autoFallback: state.autoFallback
    })
  }

  // 服务器列表
  const serverList = computed(() => predefinedServers)

  // 获取当前激活的服务器 URL
  const getActiveServerUrl = (serverId = null) => {
    const id = serverId || state.selectedServerId

    if (id === 'default') {
      return resolveDefaultWsUrl()
    } else if (id === 'custom') {
      const targetUrl = state.customServerUrl || resolveDefaultWsUrl()
      return targetUrl
    }

    // 查找预设服务器
    const server = predefinedServers.find((s) => s.id === id)
    if (!server) {
      return resolveDefaultWsUrl()
    }
    const targetUrl = server.url || resolveDefaultWsUrl()
    return targetUrl
  }

  // 选择服务器
  const selectServer = (serverId) => {
    state.selectedServerId = serverId
    persistConfig()
  }

  // 设置自定义服务器 URL
  const setCustomServerUrl = (url) => {
    state.customServerUrl = url
    persistConfig()
  }

  // 切换自动回退
  const toggleAutoFallback = (value) => {
    state.autoFallback = value
    persistConfig()
  }

  // 验证 URL 格式
  const validateServerUrl = (url) => {
    if (!url) return { valid: false, error: 'URL 不能为空' }
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      return { valid: false, error: 'WebSocket 地址必须以 ws:// 或 wss:// 开头' }
    }
    return { valid: true }
  }

  return {
    serverList,
    ...toRefs(state), // 使用 toRefs 解构 reactive 对象以保持响应性
    getActiveServerUrl,
    selectServer,
    setCustomServerUrl,
    toggleAutoFallback,
    testConnection,
    validateServerUrl
  }
}
