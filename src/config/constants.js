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
  USER_SETTINGS: 'swm_settings',
  // 服务器配置
  COUNT_SERVER: 'swm_count_server',
  // 音乐平台
  MUSIC_PLATFORM: 'swm_music_platform',
  MUSIC_ID: 'swm_music_id',
  PLAYLIST_ID: 'swm_playlist_id',
  // Spotify
  SPOTIFY_PLAYLIST_ID: 'swm_spotify_playlist_id',
  // 缓存前缀
  PLAYLIST_CACHE_PREFIX: 'swm_playlist_cache',
  PREFETCH_TIMESTAMP_PREFIX: 'swm_playlist_prefetch',
  // 歌单管理
  PLAYLISTS: 'swm_playlists',
  CURRENT_PLAYLIST: 'swm_current_playlist',
  DEFAULT_PLAYLIST: 'swm_default_playlist',
  // Focus 番茄钟
  FOCUS_RECORDS: 'swm_focus_records',
  FOCUS_SETTINGS: 'swm_focus_settings',
  FOCUS_CURRENT: 'swm_focus_current',
  // 分享卡片
  SHARE_CARD_CONFIG: 'swm_share_card_config',
  // 自定义视频
  CUSTOM_VIDEOS: 'swm_custom_videos'
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

/**
 * 歌单系统配置
 */
export const PLAYLIST_CONFIG = {
  // 导出格式版本
  EXPORT_VERSION: 1,
  // OPFS 音频目录
  OPFS_AUDIO_DIR: 'audio',
  // IndexedDB 配置
  IDB_DATABASE: 'swm-local-audio',
  IDB_VERSION: 1,
  IDB_STORE_HANDLES: 'file-handles',
  // 限制
  MAX_LOCAL_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_PLAYLISTS: 50,
  MAX_SONGS_PER_COLLECTION: 500
}

/**
 * UI 配置常量
 */
export const UI_CONFIG = {
  // Toast 相关
  TOAST_DEFAULT_DURATION: 3000,
  TOAST_ERROR_DURATION: 5000,
  TOAST_ANIMATION_DURATION: 300,
  TOAST_MAX_COUNT: 5, // 最大同时显示数量
  // 控件隐藏延迟
  INACTIVITY_HIDE_DELAY: 3000,
  // APlayer 加载延迟
  APLAYER_LOAD_DELAY: 500,
  // 歌单应用延迟
  PLAYLIST_APPLY_DELAY: 1000,
  // 时间显示更新间隔
  TIME_DISPLAY_UPDATE_INTERVAL: 1000,
  // Media Session
  MEDIA_SEEK_OFFSET: 10,
  // 音频时长获取超时
  AUDIO_DURATION_TIMEOUT: 10000,
  // 缓存统计刷新节流间隔
  CACHE_STATS_THROTTLE: 1000,
  // Media Session 播放进度更新间隔
  MEDIA_POSITION_UPDATE_INTERVAL: 1000
}

/**
 * 音频配置常量
 */
export const AUDIO_CONFIG = {
  // 默认音量
  DEFAULT_VOLUME: 0.7,
  // 音量渐变步数
  VOLUME_FADE_STEPS: 20,
  // 通知时音量降低比例
  VOLUME_DUCK_RATIO: 0.2,
  // 音量渐变时长（毫秒）
  VOLUME_FADE_DURATION: 300,
  // 默认渐变时长（毫秒）
  DEFAULT_FADE_DURATION: 500,
  // 通知默认时长（毫秒）
  NOTIFICATION_DURATION: 3000
}

/**
 * 播放器配置常量
 */
export const PLAYER_CONFIG = {
  // 支持的适配器类型
  ADAPTER_TYPES: ['aplayer', 'spotify'],
  // APlayer 默认配置
  APLAYER_DEFAULTS: {
    fixed: true,
    autoplay: false,
    lrcType: 0,
    theme: '#2980b9',
    loop: 'all',
    order: 'list',
    preload: 'auto',
    mutex: true,
    listFolded: false,
    listMaxHeight: '200px',
    width: '300px'
  }
}
