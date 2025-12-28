import { computed } from 'vue'
import { isSpotifyLink, extractSpotifyPlaylistId } from '../services/spotify.js'

const URL_PATTERNS = {
  netease: [
    /music\.163\.com.*[?&]id=(\d+)/,
    /music\.163\.com\/playlist\/(\d+)/
  ],
  tencent: [
    /y\.qq\.com.*[?&]id=(\d+)/,
    /y\.qq\.com\/n\/ryqq\/playlist\/(\d+)/
  ]
}

/**
 * 从文本中提取歌单ID
 */
export function extractPlaylistId(text, targetPlatform) {
  if (!text) return ''

  const trimmed = text.trim()

  if (targetPlatform === 'spotify') {
    return extractSpotifyPlaylistId(trimmed)
  }

  const patterns = URL_PATTERNS[targetPlatform] || []
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }

  const genericIdMatch = trimmed.match(/[?&]id=(\d+)/)
  if (genericIdMatch) {
    return genericIdMatch[1]
  }

  return trimmed
}

/**
 * 从文本检测平台
 */
export function detectPlatformFromText(text) {
  if (!text) return null
  if (/music\.163\.com/i.test(text)) return 'netease'
  if (/y\.qq\.com|i\.y\.qq\.com/i.test(text)) return 'tencent'
  if (isSpotifyLink(text)) return 'spotify'
  return null
}

/**
 * 使用歌单检测的 composable
 */
export function usePlaylistDetection(inputRef) {
  const detectedPlatformHint = computed(() => {
    const detected = detectPlatformFromText(inputRef.value)
    if (detected === 'netease') return '✓ 检测到网易云歌单'
    if (detected === 'tencent') return '✓ 检测到QQ音乐歌单'
    if (detected === 'spotify') return '✓ 检测到Spotify歌单'
    return ''
  })

  return {
    detectedPlatformHint,
    extractPlaylistId,
    detectPlatformFromText
  }
}
