/**
 * @module useVideo
 * 视频管理 composable - 提供背景视频的切换、自定义视频管理
 *
 * 使用模块级响应式状态，确保多个组件共享同一状态。
 */

import { ref, computed } from 'vue'
import { getVideoIndex, saveVideoIndex } from '../utils/userSettings.js'
import { STORAGE_KEYS } from '../config/constants.js'
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage.js'
import { preloadVideos } from '../utils/cache.js'

const VIDEO_BASE_URL = 'https://assets.frez79.io/swm/bg-video'

/** @type {Array<{name: string, url: string, builtIn: boolean}>} */
const BUILT_IN_VIDEOS = [
  { name: 'PART 1-3', url: `${VIDEO_BASE_URL}/3.mp4`, builtIn: true },
  { name: 'PART 4', url: `${VIDEO_BASE_URL}/1.mp4`, builtIn: true },
  { name: 'PART SEKAI', url: `${VIDEO_BASE_URL}/2.mp4`, builtIn: true }
]

/**
 * 从 localStorage 加载自定义视频列表
 * @returns {Array<{name: string, url: string, builtIn: boolean}>}
 */
const loadCustomVideos = () => {
  const stored = safeLocalStorageGet(STORAGE_KEYS.CUSTOM_VIDEOS)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.map((v) => ({ ...v, builtIn: false })) : []
  } catch {
    return []
  }
}

/**
 * 保存自定义视频列表到 localStorage
 * @param {Array<{name: string, url: string}>} customVideos
 */
const saveCustomVideos = (customVideos) => {
  const toStore = customVideos.map(({ name, url }) => ({ name, url }))
  safeLocalStorageSet(STORAGE_KEYS.CUSTOM_VIDEOS, JSON.stringify(toStore))
}

// ============ 模块级共享状态 ============

const customVideos = ref(loadCustomVideos())

/** @type {import('vue').ComputedRef<Array<{name: string, url: string, builtIn: boolean}>>} */
const videos = computed(() => [...BUILT_IN_VIDEOS, ...customVideos.value])

const savedIndex = getVideoIndex()
const currentVideoIndex = ref(savedIndex < videos.value.length ? savedIndex : 0)

/** @type {import('vue').ComputedRef<string>} */
const currentVideo = computed(
  () => videos.value[currentVideoIndex.value]?.url ?? BUILT_IN_VIDEOS[0].url
)

/**
 * 视频管理 composable
 * @returns {{
 *   videos: import('vue').ComputedRef<Array<{name: string, url: string, builtIn: boolean}>>,
 *   currentVideoIndex: import('vue').Ref<number>,
 *   currentVideo: import('vue').ComputedRef<string>,
 *   switchVideo: () => void,
 *   selectVideo: (index: number) => void,
 *   addCustomVideo: (url: string, name: string) => void,
 *   removeCustomVideo: (index: number) => void,
 *   isBuiltIn: (index: number) => boolean,
 *   preloadAllVideos: () => Promise<void>
 * }}
 */
export function useVideo() {
  /**
   * 切换到下一个视频
   */
  const switchVideo = () => {
    currentVideoIndex.value = (currentVideoIndex.value + 1) % videos.value.length
    saveVideoIndex(currentVideoIndex.value)
  }

  /**
   * 切换到指定索引的视频
   * @param {number} index - 目标视频索引
   */
  const selectVideo = (index) => {
    if (index >= 0 && index < videos.value.length) {
      currentVideoIndex.value = index
      saveVideoIndex(currentVideoIndex.value)
    }
  }

  /**
   * 添加自定义视频
   * @param {string} url - 视频 URL
   * @param {string} name - 视频名称
   */
  const addCustomVideo = (url, name) => {
    customVideos.value = [...customVideos.value, { name, url, builtIn: false }]
    saveCustomVideos(customVideos.value)
  }

  /**
   * 删除自定义视频
   * @param {number} index - 在完整视频列表中的索引
   */
  const removeCustomVideo = (index) => {
    const customIndex = index - BUILT_IN_VIDEOS.length
    if (customIndex < 0 || customIndex >= customVideos.value.length) return

    customVideos.value = customVideos.value.filter((_, i) => i !== customIndex)
    saveCustomVideos(customVideos.value)

    // 如果删除的是当前视频或当前索引超出范围，回退到第一个
    if (currentVideoIndex.value >= videos.value.length) {
      currentVideoIndex.value = 0
      saveVideoIndex(0)
    } else if (currentVideoIndex.value === index) {
      // 当前视频被删除，保持索引不变（会指向下一个），如果越界则回退
      if (currentVideoIndex.value >= videos.value.length) {
        currentVideoIndex.value = 0
        saveVideoIndex(0)
      }
    }
  }

  /**
   * 判断指定索引的视频是否为内置视频
   * @param {number} index - 视频索引
   * @returns {boolean}
   */
  const isBuiltIn = (index) => {
    return index < BUILT_IN_VIDEOS.length
  }

  /**
   * 预加载所有内置视频
   * @returns {Promise<void>}
   */
  const preloadAllVideos = async () => {
    try {
      const urls = BUILT_IN_VIDEOS.map((v) => v.url)
      await preloadVideos(urls)
      console.debug('所有视频预加载完成')
    } catch (error) {
      console.error('视频预加载失败:', error)
    }
  }

  return {
    videos,
    currentVideoIndex,
    currentVideo,
    switchVideo,
    selectVideo,
    addCustomVideo,
    removeCustomVideo,
    isBuiltIn,
    preloadAllVideos
  }
}
