/**
 * 音乐类型定义
 * 使用 JSDoc 提供类型提示
 */

/**
 * 统一曲目格式
 * @typedef {Object} UnifiedTrack
 * @property {string} id - 唯一标识符
 * @property {string} name - 歌曲名称
 * @property {string} artist - 艺术家
 * @property {string} [album] - 专辑名称
 * @property {string} [cover] - 封面图片 URL
 * @property {string} [url] - 音频流 URL（Spotify 不需要）
 * @property {string} [lrc] - 歌词内容或 URL
 * @property {number} [duration] - 时长（秒）
 * @property {UnifiedTrackMeta} [meta] - 适配器特定元数据
 */

/**
 * 曲目元数据
 * @typedef {Object} UnifiedTrackMeta
 * @property {'netease'|'tencent'|'spotify'|'local'} [source] - 来源平台
 * @property {string} [sourceId] - 来源平台的原始 ID
 * @property {'online'|'local'} [type] - 歌曲类型
 * @property {string} [fileName] - 本地文件名（用于 OPFS）
 * @property {string} [handleKey] - 文件句柄 key（用于引用模式）
 * @property {'managed'|'reference'} [storage] - 本地存储模式
 */

/**
 * APlayer 歌曲格式
 * @typedef {Object} APlayerSong
 * @property {string} name - 歌曲名称
 * @property {string} artist - 艺术家
 * @property {string} url - 音频 URL
 * @property {string} [cover] - 封面图片 URL
 * @property {string} [lrc] - 歌词
 * @property {string} [theme] - 主题色
 */

/**
 * 创建 UnifiedTrack 的工厂函数
 * @param {Partial<UnifiedTrack>} data - 曲目数据
 * @returns {UnifiedTrack}
 */
export function createUnifiedTrack(data) {
  return {
    id: data.id || `track_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: data.name || 'Unknown',
    artist: data.artist || 'Unknown Artist',
    album: data.album || '',
    cover: data.cover || '',
    url: data.url || '',
    lrc: data.lrc || '',
    duration: data.duration || 0,
    meta: data.meta || {}
  }
}

/**
 * 从 APlayer 格式转换为 UnifiedTrack
 * @param {APlayerSong} aplayerSong - APlayer 歌曲对象
 * @param {number} [index] - 索引（用于生成 ID）
 * @returns {UnifiedTrack}
 */
export function fromAPlayerFormat(aplayerSong, index = 0) {
  return createUnifiedTrack({
    id: `aplayer_${index}_${Date.now()}`,
    name: aplayerSong.name,
    artist: aplayerSong.artist,
    cover: aplayerSong.cover,
    url: aplayerSong.url,
    lrc: aplayerSong.lrc,
    meta: {
      type: 'online'
    }
  })
}

/**
 * 转换为 APlayer 格式
 * @param {UnifiedTrack} track - 统一曲目
 * @returns {APlayerSong}
 */
export function toAPlayerFormat(track) {
  return {
    name: track.name,
    artist: track.artist,
    url: track.url || '',
    cover: track.cover || '',
    lrc: track.lrc || ''
  }
}
