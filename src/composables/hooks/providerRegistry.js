/**
 * Provider 注册表 — Map 单例
 * 管理所有已注册的 Hook Action Provider
 */

const registry = new Map()

export const providerRegistry = {
  /**
   * 注册 provider
   * @param {Object} provider - Provider 对象
   */
  register(provider) {
    if (!provider?.id) throw new Error('Provider must have an id')
    registry.set(provider.id, provider)
    if (provider.init) provider.init()
  },

  /**
   * 注销 provider
   * @param {string} id - Provider ID
   */
  unregister(id) {
    const provider = registry.get(id)
    if (provider?.destroy) provider.destroy()
    registry.delete(id)
  },

  /**
   * 获取 provider
   * @param {string} id - Provider ID
   * @returns {Object|undefined}
   */
  get(id) {
    return registry.get(id)
  },

  /**
   * 获取所有已注册的 providers
   * @returns {Object[]}
   */
  getAll() {
    return [...registry.values()]
  },

  /**
   * 检查 provider 是否已注册
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return registry.has(id)
  },

  /**
   * 清除所有 providers（用于测试）
   */
  clear() {
    for (const provider of registry.values()) {
      if (provider.destroy) provider.destroy()
    }
    registry.clear()
  }
}
