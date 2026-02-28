/**
 * 提示音 Provider
 * 通过 Web Audio API 播放提示音
 */

const BUILTIN_SOUNDS = {
  chime: '/sounds/chime.mp3',
  ding: '/sounds/ding.mp3'
}

export const soundProvider = {
  id: 'sound',
  name: '提示音',
  icon: 'lucide:volume-2',
  hidden: false,

  actions: [
    {
      type: 'play_sound',
      name: '播放提示音',
      params: [
        {
          key: 'soundId',
          type: 'select',
          label: '音效',
          default: 'chime',
          options: [
            { value: 'chime', label: '铃声' },
            { value: 'ding', label: '叮咚' }
          ]
        },
        { key: 'volume', type: 'number', label: '音量', default: 0.7, min: 0, max: 1, step: 0.1 }
      ]
    }
  ],

  isAvailable() {
    return typeof Audio !== 'undefined'
  },

  getStatus() {
    if (typeof Audio === 'undefined') {
      return { available: false, label: '不支持' }
    }
    return { available: true, label: '就绪' }
  },

  execute(hook) {
    const action = hook.action || {}
    const soundId = action.soundId || 'chime'
    const volume = action.volume ?? 0.7
    const src = BUILTIN_SOUNDS[soundId] || BUILTIN_SOUNDS.chime

    try {
      const audio = new Audio(src)
      audio.volume = Math.max(0, Math.min(1, volume))
      audio.play().catch(() => {
        // 自动播放策略限制，静默处理
      })
    } catch {
      // 忽略音频错误
    }
  }
}
