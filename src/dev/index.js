/**
 * SWM 开发者控制台
 * 暴露内部 API 供控制台测试和高级用户使用
 *
 * 使用方式：
 *   swm_dev.help()           - 查看所有可用模块
 *   swm_dev.help("playlist") - 查看模块详情
 *   swm_dev.playlist.help()  - 模块内置帮助
 *   swm_dev.xxx              - 访问具体模块
 */

import { usePlaylistManager } from '../composables/usePlaylistManager.js'
import { useMusic } from '../composables/useMusic.js'
import { usePlayer } from '../composables/usePlayer.js'
import { useFocus } from '../composables/useFocus.js'
import { useToast } from '../composables/useToast.js'
import { useAuth } from '../composables/useAuth.js'
import { useDataSync } from '../composables/useDataSync.js'
import { useCoyote } from '../composables/useCoyote.js'
import { useHooks } from '../composables/hooks/useHooks.js'
import { providerRegistry } from '../composables/hooks/providerRegistry.js'
import * as localAudioStorage from '../services/localAudioStorage.js'
import * as playlistImportExport from '../services/playlistImportExport.js'
import * as exportUtils from '../utils/exportUtils.js'
import * as authStorage from '../utils/authStorage.js'
import { onlineServer } from '../services/onlineServer.js'
import { runtimeConfigService } from '../services/runtimeConfig.js'
import { createHelpSystem } from './help/index.js'
import { HOOKS_STORAGE_KEYS } from '../composables/hooks/constants.js'
import { safeLocalStorageSet, safeLocalStorageRemove } from '../utils/storage.js'

// 初始化 playlistManager
const playlistManager = usePlaylistManager()
playlistManager.initialize()

// 初始化 toast（添加 show/confirm 别名便于调用）
const toastApi = useToast()
toastApi.show = toastApi.showToast
toastApi.confirm = toastApi.showConfirm

// 初始化 coyote（连接调试用）
const coyoteApi = useCoyote()

// 初始化 hooks（添加 estim unlock/lock）
const hooksApi = useHooks()
hooksApi.estim = {
  unlock: () => {
    safeLocalStorageSet(HOOKS_STORAGE_KEYS.ESTIM_UNLOCKED, 'true')
    import('../composables/hooks/providers/estim.js').then(({ estimProvider }) => {
      if (!providerRegistry.has('estim')) {
        providerRegistry.register(estimProvider)
      }
    })
    toastApi.show('success', '电刺激 Provider 已解锁，请刷新页面')
  },
  lock: () => {
    safeLocalStorageRemove(HOOKS_STORAGE_KEYS.ESTIM_UNLOCKED)
    providerRegistry.unregister('estim')
    toastApi.show('info', '电刺激 Provider 已锁定，请刷新页面')
  }
}
// 保持旧的 unlock/lock 入口兼容
coyoteApi.unlock = hooksApi.estim.unlock
coyoteApi.lock = hooksApi.estim.lock

// 创建 swm_dev 对象
const swm_dev = {
  playlist: playlistManager,
  audio: localAudioStorage,
  io: playlistImportExport,
  music: useMusic(),
  player: usePlayer(),
  focus: useFocus(),
  toast: toastApi,
  exportUtils,
  auth: useAuth(),
  sync: useDataSync(),
  authStorage,
  server: onlineServer,
  config: runtimeConfigService,
  coyote: coyoteApi,
  hooks: hooksApi
}

// 创建帮助系统并注入
const { help, injectModuleHelp, setColorMode, getColorMode } = createHelpSystem(swm_dev)
injectModuleHelp()
swm_dev.help = help
swm_dev.setColorMode = setColorMode
swm_dev.getColorMode = getColorMode

window.swm_dev = swm_dev

console.log('%c[swm_dev] 开发者控制台已加载，输入 swm_dev.help() 查看可用 API', 'color: #39c5bb')
