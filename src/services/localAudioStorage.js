/**
 * 本地音频存储服务
 * 支持两种存储模式：
 * - OPFS (Origin Private File System): 托管模式，文件完全由应用管理
 * - FileHandle (File System Access API): 引用模式，保持对用户本地文件的引用
 */

import { PLAYLIST_CONFIG } from '../config/constants.js'
import { getConfig } from './runtimeConfig.js'
import { ErrorTypes } from '../types/playlist.js'

// ============ OPFS 操作 ============

/**
 * 检查 OPFS 是否支持
 * @returns {boolean}
 */
export const isOPFSSupported = () => {
  return 'storage' in navigator && 'getDirectory' in navigator.storage
}

/**
 * 获取 OPFS 音频目录
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
const getOPFSAudioDir = async () => {
  const root = await navigator.storage.getDirectory()
  return await root.getDirectoryHandle(PLAYLIST_CONFIG.OPFS_AUDIO_DIR, { create: true })
}

/**
 * 保存文件到 OPFS
 * @param {File} file - 要保存的文件
 * @param {string} fileName - 存储的文件名
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveToOPFS = async (file, fileName) => {
  if (!isOPFSSupported()) {
    return { success: false, error: ErrorTypes.OPFS_NOT_SUPPORTED }
  }

  if (file.size > PLAYLIST_CONFIG.MAX_LOCAL_FILE_SIZE) {
    return { success: false, error: ErrorTypes.FILE_TOO_LARGE }
  }

  try {
    const audioDir = await getOPFSAudioDir()
    const fileHandle = await audioDir.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file)
    await writable.close()
    return { success: true }
  } catch (err) {
    console.error('[OPFS] 保存文件失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 从 OPFS 读取文件
 * @param {string} fileName - 文件名
 * @returns {Promise<{success: boolean, file?: File, error?: string}>}
 */
export const readFromOPFS = async (fileName) => {
  if (!isOPFSSupported()) {
    return { success: false, error: ErrorTypes.OPFS_NOT_SUPPORTED }
  }

  try {
    const audioDir = await getOPFSAudioDir()
    const fileHandle = await audioDir.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    return { success: true, file }
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: ErrorTypes.FILE_NOT_FOUND }
    }
    console.error('[OPFS] 读取文件失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 从 OPFS 删除文件
 * @param {string} fileName - 文件名
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteFromOPFS = async (fileName) => {
  if (!isOPFSSupported()) {
    return { success: false, error: ErrorTypes.OPFS_NOT_SUPPORTED }
  }

  try {
    const audioDir = await getOPFSAudioDir()
    await audioDir.removeEntry(fileName)
    return { success: true }
  } catch (err) {
    if (err.name === 'NotFoundError') {
      // 文件不存在，视为删除成功
      return { success: true }
    }
    console.error('[OPFS] 删除文件失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 列出 OPFS 中的所有音频文件
 * @returns {Promise<{success: boolean, files?: string[], error?: string}>}
 */
export const listOPFSFiles = async () => {
  if (!isOPFSSupported()) {
    return { success: false, error: ErrorTypes.OPFS_NOT_SUPPORTED }
  }

  try {
    const audioDir = await getOPFSAudioDir()
    const files = []
    for await (const entry of audioDir.values()) {
      if (entry.kind === 'file') {
        files.push(entry.name)
      }
    }
    return { success: true, files }
  } catch (err) {
    console.error('[OPFS] 列出文件失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

// ============ FileHandle 操作 (IndexedDB) ============

/**
 * 检查 FileHandle 是否支持
 * @returns {boolean}
 */
export const isFileHandleSupported = () => {
  return 'showOpenFilePicker' in window
}

/**
 * 打开 IndexedDB 数据库
 * @returns {Promise<IDBDatabase>}
 */
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PLAYLIST_CONFIG.IDB_DATABASE, PLAYLIST_CONFIG.IDB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(PLAYLIST_CONFIG.IDB_STORE_HANDLES)) {
        db.createObjectStore(PLAYLIST_CONFIG.IDB_STORE_HANDLES)
      }
    }
  })
}

/**
 * 保存 FileHandle 到 IndexedDB
 * @param {string} key - 存储键名
 * @param {FileSystemFileHandle} handle - 文件句柄
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveFileHandle = async (key, handle) => {
  if (!isFileHandleSupported()) {
    return { success: false, error: ErrorTypes.FILE_HANDLE_NOT_SUPPORTED }
  }

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(PLAYLIST_CONFIG.IDB_STORE_HANDLES, 'readwrite')
      const store = tx.objectStore(PLAYLIST_CONFIG.IDB_STORE_HANDLES)
      const request = store.put(handle, key)

      request.onerror = () => {
        console.error('[IDB] 保存 FileHandle 失败:', request.error)
        resolve({ success: false, error: ErrorTypes.STORAGE_ERROR })
      }
      request.onsuccess = () => resolve({ success: true })

      tx.oncomplete = () => db.close()
    })
  } catch (err) {
    console.error('[IDB] 打开数据库失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 从 IndexedDB 获取 FileHandle
 * @param {string} key - 存储键名
 * @returns {Promise<{success: boolean, handle?: FileSystemFileHandle, error?: string}>}
 */
export const getFileHandle = async (key) => {
  if (!isFileHandleSupported()) {
    return { success: false, error: ErrorTypes.FILE_HANDLE_NOT_SUPPORTED }
  }

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(PLAYLIST_CONFIG.IDB_STORE_HANDLES, 'readonly')
      const store = tx.objectStore(PLAYLIST_CONFIG.IDB_STORE_HANDLES)
      const request = store.get(key)

      request.onerror = () => {
        console.error('[IDB] 获取 FileHandle 失败:', request.error)
        resolve({ success: false, error: ErrorTypes.STORAGE_ERROR })
      }
      request.onsuccess = () => {
        if (request.result) {
          resolve({ success: true, handle: request.result })
        } else {
          resolve({ success: false, error: ErrorTypes.FILE_NOT_FOUND })
        }
      }

      tx.oncomplete = () => db.close()
    })
  } catch (err) {
    console.error('[IDB] 打开数据库失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 从 IndexedDB 删除 FileHandle
 * @param {string} key - 存储键名
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteFileHandle = async (key) => {
  if (!isFileHandleSupported()) {
    return { success: false, error: ErrorTypes.FILE_HANDLE_NOT_SUPPORTED }
  }

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(PLAYLIST_CONFIG.IDB_STORE_HANDLES, 'readwrite')
      const store = tx.objectStore(PLAYLIST_CONFIG.IDB_STORE_HANDLES)
      const request = store.delete(key)

      request.onerror = () => {
        console.error('[IDB] 删除 FileHandle 失败:', request.error)
        resolve({ success: false, error: ErrorTypes.STORAGE_ERROR })
      }
      request.onsuccess = () => resolve({ success: true })

      tx.oncomplete = () => db.close()
    })
  } catch (err) {
    console.error('[IDB] 打开数据库失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 从 FileHandle 获取文件（含权限检查）
 * @param {FileSystemFileHandle} handle - 文件句柄
 * @returns {Promise<{success: boolean, file?: File, error?: string}>}
 */
export const getFileFromHandle = async (handle) => {
  if (!handle) {
    return { success: false, error: ErrorTypes.FILE_NOT_FOUND }
  }

  try {
    // 检查权限
    const permission = await handle.queryPermission({ mode: 'read' })
    if (permission === 'denied') {
      return { success: false, error: ErrorTypes.PERMISSION_DENIED }
    }

    // 如果需要请求权限
    if (permission === 'prompt') {
      const requestResult = await handle.requestPermission({ mode: 'read' })
      if (requestResult !== 'granted') {
        return { success: false, error: ErrorTypes.PERMISSION_DENIED }
      }
    }

    const file = await handle.getFile()
    return { success: true, file }
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: ErrorTypes.FILE_NOT_FOUND }
    }
    if (err.name === 'NotAllowedError') {
      return { success: false, error: ErrorTypes.PERMISSION_DENIED }
    }
    console.error('[FileHandle] 获取文件失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

// ============ 工具函数 ============

/**
 * 生成 OPFS 文件名
 * 使用时间戳 + 随机字符串 + 原始扩展名
 * @param {string} originalName - 原始文件名
 * @returns {string}
 */
export const generateOPFSFileName = (originalName) => {
  const ext = originalName.split('.').pop() || 'audio'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}.${ext}`
}

/**
 * 生成 FileHandle 存储键
 * @returns {string}
 */
export const generateHandleKey = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `handle_${timestamp}_${random}`
}

/**
 * 获取本地音频的播放 URL
 * 根据存储模式从 OPFS 或 FileHandle 获取文件并创建 Object URL
 * @param {import('../types/playlist.js').LocalSong} song - 本地歌曲对象
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const getLocalAudioURL = async (song) => {
  if (song.type !== 'local') {
    return { success: false, error: ErrorTypes.INVALID_DATA }
  }

  let fileResult

  if (song.storage === 'managed') {
    // 托管模式：从 OPFS 读取
    fileResult = await readFromOPFS(song.fileName)
  } else if (song.storage === 'reference') {
    // 引用模式：从 FileHandle 获取
    const handleResult = await getFileHandle(song.handleKey)
    if (!handleResult.success) {
      return handleResult
    }
    fileResult = await getFileFromHandle(handleResult.handle)
  } else {
    return { success: false, error: ErrorTypes.INVALID_DATA }
  }

  if (!fileResult.success) {
    return fileResult
  }

  try {
    const url = URL.createObjectURL(fileResult.file)
    return { success: true, url }
  } catch (err) {
    console.error('[LocalAudio] 创建 Object URL 失败:', err)
    return { success: false, error: ErrorTypes.STORAGE_ERROR }
  }
}

/**
 * 获取音频文件的时长
 * @param {File} file - 音频文件
 * @returns {Promise<number|null>} 时长（秒），失败返回 null
 */
export const getAudioDuration = (file) => {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    let resolved = false
    let timeoutId = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('error', onError)
      URL.revokeObjectURL(url)
      audio.src = ''
    }

    const safeResolve = (value) => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve(value)
    }

    const onLoadedMetadata = () => {
      const duration = audio.duration
      if (!isFinite(duration) || duration <= 0) {
        safeResolve(null)
        return
      }
      safeResolve(Math.round(duration))
    }

    const onError = () => {
      safeResolve(null)
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('error', onError)

    timeoutId = setTimeout(
      () => {
        console.warn('[getAudioDuration] 获取音频时长超时')
        safeResolve(null)
      },
      getConfig('UI_CONFIG', 'AUDIO_DURATION_TIMEOUT')
    )

    audio.src = url
  })
}

/**
 * 从文件名解析歌曲信息
 * 尝试解析 "艺术家 - 歌曲名.ext" 格式
 * @param {string} fileName - 文件名
 * @returns {{name: string, artist: string}}
 */
export const parseFileNameToSongInfo = (fileName) => {
  // 移除扩展名
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

  // 尝试解析 "艺术家 - 歌曲名" 格式
  const separators = [' - ', ' – ', '－', '-']
  for (const sep of separators) {
    const index = nameWithoutExt.indexOf(sep)
    if (index > 0) {
      return {
        artist: nameWithoutExt.substring(0, index).trim(),
        name: nameWithoutExt.substring(index + sep.length).trim()
      }
    }
  }

  // 无法解析，使用文件名作为歌曲名
  return {
    name: nameWithoutExt,
    artist: '未知艺术家'
  }
}
