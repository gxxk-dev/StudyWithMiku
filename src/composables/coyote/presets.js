/**
 * 钩子预设
 * 内置常用钩子配置，用户可一键导入
 */

import { HookTrigger, HookActionType } from './constants.js'

export const PRESETS = [
  {
    name: '暂停惩罚',
    description: '暂停专注时发送 3s 电击',
    hook: {
      name: '暂停惩罚',
      enabled: true,
      trigger: HookTrigger.FOCUS_PAUSE,
      action: {
        type: HookActionType.PULSE,
        channel: 'A',
        patterns: Array(30).fill('64640a0a'),
        durationMs: 3000
      }
    }
  },
  {
    name: '取消惩罚',
    description: '取消专注时发送更强电击',
    hook: {
      name: '取消惩罚',
      enabled: true,
      trigger: HookTrigger.FOCUS_CANCELLED,
      action: {
        type: HookActionType.PULSE,
        channel: 'A',
        patterns: Array(50).fill('c8640a0a'),
        durationMs: 5000
      }
    }
  },
  {
    name: '完成奖励',
    description: '完成番茄钟后发送舒适波形',
    hook: {
      name: '完成奖励',
      enabled: true,
      trigger: HookTrigger.FOCUS_COMPLETED,
      action: {
        type: HookActionType.STRENGTH_SET,
        channel: 'both',
        value: 30
      }
    }
  },
  {
    name: '专注渐增',
    description: '专注期间每 5 分钟增加强度 5',
    hook: {
      name: '专注渐增',
      enabled: true,
      trigger: HookTrigger.FOCUS_TICK,
      tickInterval: 300,
      action: {
        type: HookActionType.STRENGTH_INCREASE,
        channel: 'A',
        value: 5
      }
    }
  }
]
