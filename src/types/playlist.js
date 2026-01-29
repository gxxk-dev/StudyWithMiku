/**
 * 歌单系统类型定义
 * 使用 JSDoc 提供类型提示
 */

// ============ 基础类型 ============

/**
 * 音乐源平台
 * @typedef {'netease' | 'tencent' | 'spotify'} MusicSource
 */

/**
 * 歌单模式
 * - playlist: 在线歌单引用，直接使用第三方平台的歌单
 * - collection: 混合集合，可包含在线歌曲和本地音频
 * @typedef {'playlist' | 'collection'} PlaylistMode
 */

/**
 * 歌曲类型
 * @typedef {'online' | 'local'} SongType
 */

/**
 * 本地音频存储模式
 * - managed: 托管模式，文件存储在 OPFS 中
 * - reference: 引用模式，存储 FileHandle 引用本地文件
 * @typedef {'managed' | 'reference'} LocalStorageMode
 */

// ============ 歌曲类型 ============

/**
 * 在线歌曲
 * @typedef {Object} OnlineSong
 * @property {string} id - 歌曲唯一标识
 * @property {string} name - 歌曲名称
 * @property {string} artist - 艺术家
 * @property {string} [cover] - 封面图片 URL
 * @property {'online'} type - 歌曲类型
 * @property {MusicSource} source - 音乐源平台
 * @property {string} sourceId - 源平台歌曲 ID
 */

/**
 * 本地歌曲 - 托管模式
 * 文件存储在 OPFS 中，由应用完全管理
 * @typedef {Object} LocalSongManaged
 * @property {string} id - 歌曲唯一标识
 * @property {string} name - 歌曲名称
 * @property {string} artist - 艺术家
 * @property {number} [duration] - 时长（秒）
 * @property {'local'} type - 歌曲类型
 * @property {'managed'} storage - 存储模式
 * @property {string} fileName - OPFS 中的文件名
 */

/**
 * 本地歌曲 - 引用模式
 * 通过 FileHandle 引用用户本地文件
 * @typedef {Object} LocalSongReference
 * @property {string} id - 歌曲唯一标识
 * @property {string} name - 歌曲名称
 * @property {string} artist - 艺术家
 * @property {number} [duration] - 时长（秒）
 * @property {'local'} type - 歌曲类型
 * @property {'reference'} storage - 存储模式
 * @property {string} handleKey - IndexedDB 中 FileHandle 的键名
 */

/**
 * 本地歌曲（联合类型）
 * @typedef {LocalSongManaged | LocalSongReference} LocalSong
 */

/**
 * 歌曲（联合类型）
 * @typedef {OnlineSong | LocalSong} Song
 */

// ============ 歌单类型 ============

/**
 * 歌单基础属性
 * @typedef {Object} PlaylistBase
 * @property {string} id - 歌单唯一标识
 * @property {string} name - 歌单名称
 * @property {string} [cover] - 封面图片 URL
 * @property {number} order - 排序序号
 */

/**
 * 在线歌单引用模式
 * 直接引用第三方平台的歌单，歌曲由平台 API 提供
 * @typedef {PlaylistBase & {
 *   mode: 'playlist',
 *   source: MusicSource,
 *   sourceId: string
 * }} PlaylistModePlaylist
 */

/**
 * 混合集合模式
 * 可包含在线歌曲和本地音频的自定义集合
 * @typedef {PlaylistBase & {
 *   mode: 'collection',
 *   songs: Song[]
 * }} CollectionModePlaylist
 */

/**
 * 歌单（联合类型）
 * @typedef {PlaylistModePlaylist | CollectionModePlaylist} Playlist
 */

// ============ 操作结果类型 ============

/**
 * 操作结果基础类型
 * @template T
 * @typedef {Object} OperationResult
 * @property {boolean} success - 操作是否成功
 * @property {T} [data] - 返回的数据
 * @property {string} [error] - 错误信息
 */

/**
 * 错误类型常量
 * @readonly
 * @enum {string}
 */
export const ErrorTypes = {
  OPFS_NOT_SUPPORTED: 'OPFS_NOT_SUPPORTED',
  FILE_HANDLE_NOT_SUPPORTED: 'FILE_HANDLE_NOT_SUPPORTED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PLAYLIST_NOT_FOUND: 'PLAYLIST_NOT_FOUND',
  SONG_NOT_FOUND: 'SONG_NOT_FOUND',
  MAX_PLAYLISTS_REACHED: 'MAX_PLAYLISTS_REACHED',
  MAX_SONGS_REACHED: 'MAX_SONGS_REACHED',
  INVALID_PLAYLIST_MODE: 'INVALID_PLAYLIST_MODE',
  INVALID_DATA: 'INVALID_DATA',
  STORAGE_ERROR: 'STORAGE_ERROR',
  IMPORT_VERSION_MISMATCH: 'IMPORT_VERSION_MISMATCH',
  PARSE_ERROR: 'PARSE_ERROR'
}

// ============ 导入/导出类型 ============

/**
 * 导出数据格式
 * @typedef {Object} ExportData
 * @property {number} version - 导出格式版本
 * @property {number} exportedAt - 导出时间戳
 * @property {Playlist[]} playlists - 歌单列表
 */

/**
 * 导入选项
 * @typedef {Object} ImportOptions
 * @property {'merge' | 'replace'} [mode='merge'] - 导入模式
 * @property {boolean} [skipDuplicates=true] - 是否跳过重复歌单
 */

/**
 * 合并统计
 * @typedef {Object} MergeStats
 * @property {number} added - 新增数量
 * @property {number} skipped - 跳过数量
 * @property {number} replaced - 替换数量
 */
