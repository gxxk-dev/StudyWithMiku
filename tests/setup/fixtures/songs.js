/**
 * 歌曲测试数据
 */

// ============ 在线歌曲 ============

/**
 * 网易云音乐歌曲示例
 */
export const neteaseSongs = [
  {
    name: '初音ミクの消失',
    artist: 'cosMo@暴走P',
    url: 'https://music.163.com/song/media/outer/url?id=22636634.mp3',
    cover: 'https://p1.music.126.net/xxx/109951163111111.jpg',
    lrc: '[00:00.00]初音ミクの消失\n[00:05.00]作词：cosMo'
  },
  {
    name: 'メルト',
    artist: 'ryo (supercell)',
    url: 'https://music.163.com/song/media/outer/url?id=22636635.mp3',
    cover: 'https://p1.music.126.net/xxx/109951163222222.jpg',
    lrc: '[00:00.00]メルト\n[00:05.00]作词：ryo'
  },
  {
    name: 'ワールドイズマイン',
    artist: 'ryo (supercell)',
    url: 'https://music.163.com/song/media/outer/url?id=22636636.mp3',
    cover: 'https://p1.music.126.net/xxx/109951163333333.jpg',
    lrc: '[00:00.00]World is Mine'
  }
]

/**
 * QQ音乐歌曲示例
 */
export const tencentSongs = [
  {
    name: '千本桜',
    artist: '黒うさP',
    url: 'https://ws.stream.qqmusic.qq.com/xxx.mp3',
    cover: 'https://y.qq.com/music/photo_new/xxx.jpg',
    lrc: '[00:00.00]千本桜'
  },
  {
    name: 'Tell Your World',
    artist: 'kz (livetune)',
    url: 'https://ws.stream.qqmusic.qq.com/yyy.mp3',
    cover: 'https://y.qq.com/music/photo_new/yyy.jpg',
    lrc: '[00:00.00]Tell Your World'
  }
]

/**
 * Meting API 响应格式（原始格式）
 */
export const metingApiResponse = [
  {
    title: '初音ミクの消失',
    author: 'cosMo@暴走P',
    url: 'https://music.163.com/song/media/outer/url?id=22636634.mp3',
    pic: 'https://p1.music.126.net/xxx/109951163111111.jpg',
    lrc: '[00:00.00]初音ミクの消失'
  },
  {
    title: 'メルト',
    author: 'ryo (supercell)',
    url: 'https://music.163.com/song/media/outer/url?id=22636635.mp3',
    pic: 'https://p1.music.126.net/xxx/109951163222222.jpg',
    lrc: '[00:00.00]メルト'
  }
]

/**
 * 不完整的歌曲数据（用于测试过滤）
 */
export const incompleteSongs = [
  { name: '无URL歌曲', artist: 'Test Artist' },
  { name: '无Artist歌曲', url: 'https://example.com/test.mp3' },
  { artist: 'Test Artist', url: 'https://example.com/test.mp3' }
]

// ============ 本地歌曲 ============

/**
 * 托管模式本地歌曲
 */
export const localManagedSongs = [
  {
    id: 'local-managed-1',
    name: '本地歌曲1',
    artist: '本地艺术家',
    duration: 180,
    type: 'local',
    storage: 'managed',
    fileName: 'song1.mp3'
  },
  {
    id: 'local-managed-2',
    name: '本地歌曲2',
    artist: '本地艺术家2',
    duration: 240,
    type: 'local',
    storage: 'managed',
    fileName: 'song2.mp3'
  }
]

/**
 * 引用模式本地歌曲
 */
export const localReferenceSongs = [
  {
    id: 'local-ref-1',
    name: '引用歌曲1',
    artist: '引用艺术家',
    duration: 200,
    type: 'local',
    storage: 'reference',
    handleKey: 'handle-key-1'
  }
]

/**
 * 在线歌曲（带类型标识）
 */
export const onlineSongs = [
  {
    id: 'online-1',
    name: '在线歌曲1',
    artist: '在线艺术家',
    cover: 'https://example.com/cover1.jpg',
    type: 'online',
    source: 'netease',
    sourceId: '12345678'
  },
  {
    id: 'online-2',
    name: '在线歌曲2',
    artist: '在线艺术家2',
    cover: 'https://example.com/cover2.jpg',
    type: 'online',
    source: 'tencent',
    sourceId: '87654321'
  }
]

// ============ APlayer 格式歌曲 ============

/**
 * APlayer 需要的歌曲格式
 */
export const aplayerSongs = [
  {
    name: 'Song 1',
    artist: 'Artist 1',
    url: 'https://example.com/song1.mp3',
    cover: 'https://example.com/cover1.jpg',
    lrc: '[00:00.00]Lyrics 1'
  },
  {
    name: 'Song 2',
    artist: 'Artist 2',
    url: 'https://example.com/song2.mp3',
    cover: 'https://example.com/cover2.jpg',
    lrc: '[00:00.00]Lyrics 2'
  }
]

// ============ 工厂函数 ============

/**
 * 创建测试歌曲
 */
export const createSong = (overrides = {}) => ({
  name: 'Test Song',
  artist: 'Test Artist',
  url: 'https://example.com/test.mp3',
  cover: 'https://example.com/cover.jpg',
  lrc: '[00:00.00]Test Lyrics',
  ...overrides
})

/**
 * 创建本地歌曲
 */
export const createLocalSong = (overrides = {}) => ({
  id: `local-${Date.now()}`,
  name: 'Local Test Song',
  artist: 'Local Artist',
  duration: 180,
  type: 'local',
  storage: 'managed',
  fileName: 'test.mp3',
  ...overrides
})

/**
 * 创建在线歌曲
 */
export const createOnlineSong = (overrides = {}) => ({
  id: `online-${Date.now()}`,
  name: 'Online Test Song',
  artist: 'Online Artist',
  cover: 'https://example.com/cover.jpg',
  type: 'online',
  source: 'netease',
  sourceId: '12345678',
  ...overrides
})

/**
 * 批量创建歌曲
 */
export const createSongs = (count, template = {}) => {
  return Array.from({ length: count }, (_, i) =>
    createSong({
      name: `Song ${i + 1}`,
      artist: `Artist ${i + 1}`,
      url: `https://example.com/song${i + 1}.mp3`,
      ...template
    })
  )
}
