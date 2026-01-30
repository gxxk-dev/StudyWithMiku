/**
 * useHitokoto - 一言 API Composable
 * 获取一言（随机励志语句）
 */

import { ref } from 'vue'

const HITOKOTO_API = 'https://v1.hitokoto.cn/'

// 默认一言（用于降级）
const DEFAULT_HITOKOTO = {
  text: '学习的道路永无止境，坚持就是胜利！',
  from: 'Study with Miku'
}

/**
 * 一言 API 类别
 * a - 动画
 * b - 漫画
 * c - 游戏
 * d - 文学
 * e - 原创
 * f - 来自网络
 * g - 其他
 * h - 影视
 * i - 诗词
 * j - 网易云
 * k - 哲学
 * l - 抖机灵
 */
export const HitokotoCategory = {
  ANIMATION: 'a',
  COMIC: 'b',
  GAME: 'c',
  LITERATURE: 'd',
  ORIGINAL: 'e',
  INTERNET: 'f',
  OTHER: 'g',
  FILM: 'h',
  POETRY: 'i',
  NETEASE: 'j',
  PHILOSOPHY: 'k',
  WITTY: 'l'
}

/**
 * useHitokoto composable
 * @returns {Object} 一言状态和方法
 */
export const useHitokoto = () => {
  const hitokoto = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * 获取一言
   * @param {string|string[]} category - 类别，可以是单个或多个
   */
  const fetchHitokoto = async (category = HitokotoCategory.ANIMATION) => {
    loading.value = true
    error.value = null

    try {
      // 构建 URL
      let url = HITOKOTO_API
      if (Array.isArray(category)) {
        const params = category.map((c) => `c=${c}`).join('&')
        url += `?${params}`
      } else {
        url += `?c=${category}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(url, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()

      hitokoto.value = {
        text: data.hitokoto,
        from: data.from || data.from_who || '未知来源',
        creator: data.creator,
        type: data.type
      }
    } catch (err) {
      error.value = err.name === 'AbortError' ? '请求超时' : err.message

      // 降级使用默认语句
      hitokoto.value = { ...DEFAULT_HITOKOTO }
    } finally {
      loading.value = false
    }
  }

  /**
   * 刷新一言
   * @param {string|string[]} category - 类别
   */
  const refresh = (category = HitokotoCategory.ANIMATION) => {
    return fetchHitokoto(category)
  }

  return {
    hitokoto,
    loading,
    error,
    fetchHitokoto,
    refresh
  }
}

export default useHitokoto
