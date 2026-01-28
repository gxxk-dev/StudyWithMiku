/**
 * SWM 开发者控制台
 * 暴露内部 API 供控制台测试和高级用户使用
 *
 * 使用方式：
 *   swm_dev.help()  - 查看所有可用模块
 *   swm_dev.xxx     - 访问具体模块
 *
 * 添加模块：
 *   swm_dev.myModule = { ... }
 */

import { usePlaylistManager } from '../composables/usePlaylistManager.js'
import { useMusic } from '../composables/useMusic.js'
import * as localAudioStorage from '../services/localAudioStorage.js'
import * as playlistImportExport from '../services/playlistImportExport.js'

// 初始化 playlistManager
const playlistManager = usePlaylistManager()
playlistManager.initialize()

// 创建 swm_dev 对象
window.swm_dev = {
  // 歌单管理
  playlist: playlistManager,

  // 本地音频存储
  audio: localAudioStorage,

  // 导入导出
  io: playlistImportExport,

  // 音乐播放
  music: useMusic(),

  // 帮助函数 - 自动发现并列出所有模块
  help() {
    const getIcon = (val) => {
      if (typeof val === 'function') return 'ƒ'
      if (val && typeof val === 'object') return '○'
      return '●'
    }

    const printTree = (obj, indent = '') => {
      const keys = Object.keys(obj).filter((k) => k !== 'help')
      keys.forEach((key, i) => {
        const isLast = i === keys.length - 1
        const val = obj[key]
        console.log(`${indent}${isLast ? '└─' : '├─'} ${getIcon(val)} ${key}`)
      })
    }

    console.log('swm_dev')
    const modules = Object.keys(this).filter((k) => k !== 'help')
    if (modules.length === 0) {
      console.log('└─ (空)')
      return
    }
    modules.forEach((mod, i) => {
      const isLast = i === modules.length - 1
      console.log(`${isLast ? '└─' : '├─'} ${mod}`)
      if (this[mod] && typeof this[mod] === 'object') {
        printTree(this[mod], isLast ? '   ' : '│  ')
      }
    })
  }
}

console.log('%c[swm_dev] 开发者控制台已加载，输入 swm_dev.help() 查看可用 API', 'color: #39c5bb')
