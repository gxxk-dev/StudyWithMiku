/**
 * 音乐数据源提供者抽象基类
 * 定义统一的数据获取接口
 */

/**
 * @typedef {import('../../types/music.js').UnifiedTrack} UnifiedTrack
 */

/**
 * 数据源提供者抽象基类
 */
export class MusicSourceProvider {
  /**
   * 获取歌单曲目
   * @param {string} id - 歌单 ID
   * @param {Object} [options] - 选项
   * @returns {Promise<UnifiedTrack[]>}
   */
  async fetchPlaylist(_id, _options = {}) {
    throw new Error('子类必须实现 fetchPlaylist 方法')
  }

  /**
   * 是否支持缓存
   * @returns {boolean}
   */
  supportsCaching() {
    return false
  }

  /**
   * 获取数据源类型标识
   * @returns {string}
   */
  getSourceType() {
    throw new Error('子类必须实现 getSourceType 方法')
  }
}
