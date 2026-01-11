import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage.js'
import { API_CONFIG, STORAGE_KEYS } from '../config/constants.js'

const SPOTIFY_PLAYLIST_KEY = STORAGE_KEYS.SPOTIFY_PLAYLIST_ID
const { DEFAULT_SPOTIFY_PLAYLIST_ID } = API_CONFIG

/**
 * 从 Spotify 链接或文本中提取歌单 ID
 * 支持格式：
 * - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 * - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=xxx
 * - spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 * - 37i9dQZF1DXcBWIGoYBM5M (纯 ID)
 */
export const extractSpotifyPlaylistId = (text) => {
  if (!text) return ''
  const trimmed = text.trim()

  // URL 格式
  const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/)
  if (urlMatch) return urlMatch[1]

  // URI 格式
  const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/)
  if (uriMatch) return uriMatch[1]

  // 纯 ID 格式 (Spotify ID 通常为 22 个字符的 base62)
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed

  return trimmed
}

/**
 * 检测文本是否为 Spotify 链接
 */
export const isSpotifyLink = (text) => {
  if (!text) return false
  return /open\.spotify\.com|spotify:playlist:/i.test(text)
}

/**
 * 生成 Spotify Embed URL
 * @param {string} playlistId - Spotify 歌单 ID
 * @param {object} options - 配置选项
 * @param {number} options.theme - 主题 (0=深色, 1=浅色)
 */
export const getSpotifyEmbedUrl = (playlistId, options = {}) => {
  const { theme = 0 } = options
  if (!playlistId) return ''
  return `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=${theme}`
}

/**
 * 保存 Spotify 歌单 ID 到 localStorage
 */
export const saveSpotifyPlaylistId = (playlistId) => {
  safeLocalStorageSet(SPOTIFY_PLAYLIST_KEY, playlistId)
}

/**
 * 获取已保存的 Spotify 歌单 ID
 */
export const getSpotifyPlaylistId = () => {
  return (
    safeLocalStorageGet(SPOTIFY_PLAYLIST_KEY, DEFAULT_SPOTIFY_PLAYLIST_ID) ||
    DEFAULT_SPOTIFY_PLAYLIST_ID
  )
}

/**
 * 重置为默认歌单
 */
export const resetSpotifyPlaylistId = () => {
  safeLocalStorageSet(SPOTIFY_PLAYLIST_KEY, DEFAULT_SPOTIFY_PLAYLIST_ID)
  return DEFAULT_SPOTIFY_PLAYLIST_ID
}

export { DEFAULT_SPOTIFY_PLAYLIST_ID }
