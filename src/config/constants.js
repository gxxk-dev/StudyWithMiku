/**
 * 项目统一常量配置
 */

/**
 * 缓存名称常量
 */
export const CACHE_NAMES = {
  VIDEO: 'video-cache',
  R2_VIDEO: 'r2-video-cache',
  IMAGE_FONT: 'image-font-cache',
  AUDIO: 'audio-cache',
  API: 'api-cache',
  STREAMING_MUSIC: 'streaming-music-cache',
  PLAYLIST_API: 'playlist-api-cache',
  PLAYLIST: 'meting-playlist-cache'
}

/**
 * 所有缓存名称数组
 */
export const ALL_CACHE_NAMES = Object.values(CACHE_NAMES)

/**
 * localStorage 键名
 */
export const STORAGE_KEYS = {
  // 用户设置
  USER_SETTINGS: 'study_with_miku_settings',
  // 服务器配置
  COUNT_SERVER: 'countServer',
  // 音乐平台
  MUSIC_PLATFORM: 'music_platform',
  MUSIC_ID: 'music_id',
  PLAYLIST_ID: 'playlist_id',
  // Spotify
  SPOTIFY_PLAYLIST_ID: 'spotify_playlist_id',
  // 缓存前缀
  PLAYLIST_CACHE_PREFIX: 'meting_playlist_cache',
  PREFETCH_TIMESTAMP_PREFIX: 'meting_playlist_prefetch'
}

/**
 * 重连配置
 */
export const RECONNECT_CONFIG = {
  MAX_ATTEMPTS: 10,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000
}

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  PLAYLIST_DURATION: 1000 * 60 * 60 * 12, // 12小时
  PREFETCH_DURATION: 1000 * 60 * 60 * 12, // 12小时
  PREFETCH_TIMEOUT: 60000, // 60秒
  MAX_PREFETCH_SONGS: 12
}

/**
 * API 配置
 */
export const API_CONFIG = {
  METING_API: 'https://api.injahow.cn/meting/',
  FETCH_TIMEOUT: 10000, // 10秒
  DEFAULT_PLAYLIST_ID: '17543418420',
  DEFAULT_SPOTIFY_PLAYLIST_ID: '37i9dQZF1DXcBWIGoYBM5M'
}

/**
 * WebSocket 配置
 */
export const WS_CONFIG = {
  PING_INTERVAL: 30000, // 30秒
  CONNECTION_TIMEOUT: 5000 // 5秒
}
