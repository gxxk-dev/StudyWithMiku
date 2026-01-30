/**
 * 歌单测试数据
 */

import { onlineSongs, localManagedSongs } from './songs.js'

// ============ 在线歌单引用模式 ============

/**
 * 网易云歌单
 */
export const neteasePlaylist = {
  id: 'playlist-netease-1',
  name: '我的网易云歌单',
  cover: 'https://p1.music.126.net/xxx/playlist-cover.jpg',
  order: 0,
  mode: 'playlist',
  source: 'netease',
  sourceId: '17543418420'
}

/**
 * QQ音乐歌单
 */
export const tencentPlaylist = {
  id: 'playlist-tencent-1',
  name: 'QQ音乐歌单',
  cover: 'https://y.qq.com/music/photo_new/playlist.jpg',
  order: 1,
  mode: 'playlist',
  source: 'tencent',
  sourceId: '8888888888'
}

/**
 * Spotify 歌单
 */
export const spotifyPlaylist = {
  id: 'playlist-spotify-1',
  name: 'Spotify 播放列表',
  cover: null,
  order: 2,
  mode: 'playlist',
  source: 'spotify',
  sourceId: '37i9dQZF1DXcBWIGoYBM5M'
}

// ============ 混合集合模式 ============

/**
 * 包含在线歌曲的集合
 */
export const onlineCollection = {
  id: 'collection-online-1',
  name: '在线歌曲集合',
  cover: 'https://example.com/collection-cover.jpg',
  order: 3,
  mode: 'collection',
  songs: onlineSongs
}

/**
 * 包含本地歌曲的集合
 */
export const localCollection = {
  id: 'collection-local-1',
  name: '本地歌曲集合',
  cover: null,
  order: 4,
  mode: 'collection',
  songs: localManagedSongs
}

/**
 * 混合集合（在线 + 本地）
 */
export const mixedCollection = {
  id: 'collection-mixed-1',
  name: '混合歌曲集合',
  cover: 'https://example.com/mixed-cover.jpg',
  order: 5,
  mode: 'collection',
  songs: [...onlineSongs.slice(0, 1), ...localManagedSongs.slice(0, 1)]
}

/**
 * 空集合
 */
export const emptyCollection = {
  id: 'collection-empty-1',
  name: '空集合',
  cover: null,
  order: 6,
  mode: 'collection',
  songs: []
}

// ============ 测试数据集 ============

/**
 * 多个歌单的列表
 */
export const playlistList = [
  neteasePlaylist,
  tencentPlaylist,
  spotifyPlaylist,
  onlineCollection,
  localCollection
]

/**
 * 用于导入/导出测试的数据
 */
export const exportData = {
  version: 1,
  exportedAt: 1704672000000,
  playlists: [neteasePlaylist, onlineCollection]
}

/**
 * 旧版本导出数据（用于测试版本兼容性）
 */
export const legacyExportData = {
  version: 0,
  exportedAt: 1704672000000,
  playlists: [neteasePlaylist]
}

// ============ 工厂函数 ============

/**
 * 创建在线歌单引用
 */
export const createPlaylistRef = (overrides = {}) => ({
  id: `playlist-${Date.now()}`,
  name: 'Test Playlist',
  cover: null,
  order: 0,
  mode: 'playlist',
  source: 'netease',
  sourceId: '12345678',
  ...overrides
})

/**
 * 创建混合集合
 */
export const createCollection = (songs = [], overrides = {}) => ({
  id: `collection-${Date.now()}`,
  name: 'Test Collection',
  cover: null,
  order: 0,
  mode: 'collection',
  songs,
  ...overrides
})

/**
 * 创建导出数据
 */
export const createExportData = (playlists = [], overrides = {}) => ({
  version: 1,
  exportedAt: Date.now(),
  playlists,
  ...overrides
})

/**
 * 批量创建歌单
 */
export const createPlaylists = (count, template = {}) => {
  return Array.from({ length: count }, (_, i) =>
    createPlaylistRef({
      id: `playlist-${i}`,
      name: `Playlist ${i + 1}`,
      order: i,
      sourceId: `${10000000 + i}`,
      ...template
    })
  )
}

// ============ URL 测试数据 ============

/**
 * 各平台歌单 URL 示例
 */
export const playlistUrls = {
  netease: {
    standard: 'https://music.163.com/playlist?id=17543418420',
    shortPath: 'https://music.163.com/playlist/17543418420',
    withParams: 'https://music.163.com/playlist?id=17543418420&userid=12345'
  },
  tencent: {
    standard: 'https://y.qq.com/n/ryqq/playlist/8888888888',
    withId: 'https://y.qq.com/playlist?id=8888888888',
    mobile: 'https://i.y.qq.com/n2/m/share/details/taoge.html?id=8888888888'
  },
  spotify: {
    standard: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    withParams: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abcdef123456',
    uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
  }
}

/**
 * 无效的歌单 URL
 */
export const invalidPlaylistUrls = [
  'https://example.com/not-a-playlist',
  'https://music.163.com/song?id=12345',
  'https://y.qq.com/n/yqq/singer/12345.html',
  'not-a-url',
  ''
]
