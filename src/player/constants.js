/**
 * 播放器抽象层常量定义
 */

/**
 * 播放状态枚举
 */
export const PlaybackState = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  BUFFERING: 'buffering',
  ENDED: 'ended',
  ERROR: 'error'
}

/**
 * 播放器事件枚举
 */
export const PlayerEvent = {
  PLAY: 'play',
  PAUSE: 'pause',
  STOP: 'stop',
  ENDED: 'ended',
  TIME_UPDATE: 'timeupdate',
  VOLUME_CHANGE: 'volumechange',
  TRACK_CHANGE: 'trackchange',
  ERROR: 'error',
  READY: 'ready',
  PLAYLIST_LOADED: 'playlistloaded',
  STATE_CHANGE: 'statechange'
}

/**
 * 循环模式枚举
 */
export const RepeatMode = {
  NONE: 'none',
  ALL: 'all',
  ONE: 'one'
}

/**
 * 适配器类型枚举
 */
export const AdapterType = {
  APLAYER: 'aplayer',
  SPOTIFY: 'spotify'
}
