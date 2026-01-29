/**
 * Vitest 全局设置文件
 * 配置全局 mock 和测试环境
 */

import { vi } from 'vitest'
import 'fake-indexeddb/auto'

// ============ localStorage Mock ============
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index) => Object.keys(store)[index] ?? null),
    // 测试辅助方法
    __getStore: () => store,
    __setStore: (newStore) => {
      store = newStore
    }
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// ============ sessionStorage Mock ============
const sessionStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index) => Object.keys(store)[index] ?? null)
  }
})()

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
})

// ============ URL.createObjectURL / revokeObjectURL Mock ============
const objectURLs = new Map()
let urlCounter = 0

globalThis.URL.createObjectURL = vi.fn((blob) => {
  const url = `blob:test-${++urlCounter}`
  objectURLs.set(url, blob)
  return url
})

globalThis.URL.revokeObjectURL = vi.fn((url) => {
  objectURLs.delete(url)
})

// 测试辅助方法
globalThis.__getObjectURLs = () => objectURLs

// ============ Fetch Mock（默认，可被 MSW 覆盖）============
globalThis.fetch = vi.fn()

// ============ navigator.storage (OPFS) Mock ============
const createMockOPFSDirectory = () => {
  const files = new Map()
  const directories = new Map()

  return {
    kind: 'directory',
    name: '',
    files,
    directories,

    async getFileHandle(name, options = {}) {
      if (files.has(name)) {
        return files.get(name)
      }
      if (options.create) {
        const fileHandle = createMockFileHandle(name)
        files.set(name, fileHandle)
        return fileHandle
      }
      throw new DOMException('File not found', 'NotFoundError')
    },

    async getDirectoryHandle(name, options = {}) {
      if (directories.has(name)) {
        return directories.get(name)
      }
      if (options.create) {
        const dirHandle = createMockOPFSDirectory()
        dirHandle.name = name
        directories.set(name, dirHandle)
        return dirHandle
      }
      throw new DOMException('Directory not found', 'NotFoundError')
    },

    async removeEntry(name) {
      if (files.has(name)) {
        files.delete(name)
        return
      }
      if (directories.has(name)) {
        directories.delete(name)
        return
      }
      throw new DOMException('Entry not found', 'NotFoundError')
    },

    async *values() {
      for (const handle of files.values()) {
        yield handle
      }
      for (const handle of directories.values()) {
        yield handle
      }
    },

    async *entries() {
      for (const [name, handle] of files.entries()) {
        yield [name, handle]
      }
      for (const [name, handle] of directories.entries()) {
        yield [name, handle]
      }
    }
  }
}

const createMockFileHandle = (name) => {
  let fileContent = new ArrayBuffer(0)
  let fileType = 'application/octet-stream'

  return {
    kind: 'file',
    name,

    async getFile() {
      return new File([fileContent], name, { type: fileType })
    },

    async createWritable() {
      return {
        async write(data) {
          if (data instanceof Blob) {
            fileContent = await data.arrayBuffer()
            fileType = data.type
          } else if (data instanceof ArrayBuffer) {
            fileContent = data
          } else if (typeof data === 'string') {
            const encoder = new TextEncoder()
            fileContent = encoder.encode(data).buffer
          }
        },
        async close() {
          // No-op
        }
      }
    },

    // 测试辅助方法
    __setContent: (content, type = 'application/octet-stream') => {
      fileContent = content
      fileType = type
    }
  }
}

const mockOPFSRoot = createMockOPFSDirectory()

Object.defineProperty(navigator, 'storage', {
  value: {
    getDirectory: vi.fn(async () => mockOPFSRoot),
    estimate: vi.fn(async () => ({
      quota: 1024 * 1024 * 1024,
      usage: 0
    })),
    persist: vi.fn(async () => true),
    persisted: vi.fn(async () => true)
  },
  writable: true
})

// 导出 mock root 供测试使用
globalThis.__mockOPFSRoot = mockOPFSRoot
globalThis.__createMockOPFSDirectory = createMockOPFSDirectory
globalThis.__createMockFileHandle = createMockFileHandle

// ============ Cache API Mock ============
const cacheStorage = new Map()

const createMockCache = (name) => {
  const entries = new Map()

  return {
    name,
    entries,

    async match(request) {
      const url = typeof request === 'string' ? request : request.url
      return entries.get(url) || undefined
    },

    async put(request, response) {
      const url = typeof request === 'string' ? request : request.url
      entries.set(url, response.clone())
    },

    async delete(request) {
      const url = typeof request === 'string' ? request : request.url
      return entries.delete(url)
    },

    async keys() {
      return Array.from(entries.keys()).map((url) => new Request(url))
    },

    async matchAll() {
      return Array.from(entries.values())
    }
  }
}

globalThis.caches = {
  open: vi.fn(async (name) => {
    if (!cacheStorage.has(name)) {
      cacheStorage.set(name, createMockCache(name))
    }
    return cacheStorage.get(name)
  }),

  has: vi.fn(async (name) => cacheStorage.has(name)),

  delete: vi.fn(async (name) => cacheStorage.delete(name)),

  keys: vi.fn(async () => Array.from(cacheStorage.keys())),

  match: vi.fn(async (request) => {
    for (const cache of cacheStorage.values()) {
      const response = await cache.match(request)
      if (response) return response
    }
    return undefined
  })
}

// 测试辅助方法
globalThis.__getCacheStorage = () => cacheStorage
globalThis.__clearCacheStorage = () => cacheStorage.clear()

// ============ Service Worker Mock ============
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      active: {
        postMessage: vi.fn()
      }
    }),
    controller: {
      postMessage: vi.fn()
    },
    register: vi.fn(async () => ({})),
    getRegistration: vi.fn(async () => undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  writable: true
})

// ============ matchMedia Mock ============
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// ============ Notification Mock ============
globalThis.Notification = {
  permission: 'default',
  requestPermission: vi.fn(async () => 'granted')
}

// ============ Audio Mock ============
globalThis.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  paused: true
}))

// ============ 全局测试辅助函数 ============

/**
 * 重置所有 mock 状态
 */
globalThis.__resetAllMocks = () => {
  localStorage.clear()
  sessionStorage.clear()
  objectURLs.clear()
  urlCounter = 0
  cacheStorage.clear()

  // 重置 OPFS
  mockOPFSRoot.files.clear()
  mockOPFSRoot.directories.clear()

  // 清除所有 mock 调用记录
  vi.clearAllMocks()
}

// ============ 每个测试前重置 ============
import { beforeEach } from 'vitest'

beforeEach(() => {
  globalThis.__resetAllMocks()
})
