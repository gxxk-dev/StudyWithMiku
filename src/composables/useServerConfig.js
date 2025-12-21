import { ref, computed } from 'vue'

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
    const startTime = Date.now()

    const timeout = setTimeout(() => {
      if (ws) ws.close()
      resolve({ success: false, error: '连接超时' })
    }, 5000)

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        const latency = Date.now() - startTime
        clearTimeout(timeout)
        ws.close()
        resolve({ success: true, latency })
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        resolve({ success: false, error: '连接失败' })
      }
    } catch (err) {
      clearTimeout(timeout)
      resolve({ success: false, error: err.message })
    }
  })
}

// 导出 composable
export function useServerConfig() {
  const config = loadConfig()

  const selectedServerId = ref(config.selectedServerId)
  const customServerUrl = ref(config.customServerUrl)
  const autoFallback = ref(config.autoFallback)

  const persistConfig = () => {
    saveConfig({
      selectedServerId: selectedServerId.value,
      customServerUrl: customServerUrl.value,
      autoFallback: autoFallback.value
    })
  }

  // 服务器列表
  const serverList = computed(() => predefinedServers)

  // 获取当前激活的服务器 URL
  const getActiveServerUrl = (serverId = null) => {
    const id = serverId || selectedServerId.value

    if (id === 'default') {
      return resolveDefaultWsUrl()
    } else if (id === 'custom') {
      const targetUrl = customServerUrl.value || resolveDefaultWsUrl()
      return targetUrl
    }

    // 查找预设服务器
    const server = predefinedServers.find(s => s.id === id)
    if (!server) {
      return resolveDefaultWsUrl()
    }
    const targetUrl = server.url || resolveDefaultWsUrl()
    return targetUrl
  }

  // 选择服务器
  const selectServer = (serverId) => {
    selectedServerId.value = serverId
    persistConfig()
  }

  // 设置自定义服务器 URL
  const setCustomServerUrl = (url) => {
    customServerUrl.value = url
    persistConfig()
  }

  // 切换自动回退
  const toggleAutoFallback = (value) => {
    autoFallback.value = value
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
    selectedServerId,
    customServerUrl,
    autoFallback,
    getActiveServerUrl,
    selectServer,
    setCustomServerUrl,
    toggleAutoFallback,
    testConnection,
    validateServerUrl
  }
}
