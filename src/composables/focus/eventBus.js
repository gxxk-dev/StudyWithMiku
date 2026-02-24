/**
 * Focus 事件总线
 * 轻量级 pub/sub，解耦状态机与外部系统（如郊狼控制）
 */

const listeners = new Map()

export const focusEventBus = {
  /**
   * 订阅事件
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(callback)
    return () => listeners.get(event)?.delete(callback)
  },

  /**
   * 发出事件
   * @param {string} event - 事件名
   * @param {*} payload - 事件数据
   */
  emit(event, payload) {
    listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload)
      } catch (e) {
        console.error('[FocusEventBus]', e)
      }
    })
  },

  /**
   * 移除事件的所有监听器（用于测试）
   * @param {string} [event] - 事件名，不传则清除所有
   */
  clear(event) {
    if (event) {
      listeners.delete(event)
    } else {
      listeners.clear()
    }
  }
}
