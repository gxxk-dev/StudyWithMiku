/**
 * Estim (电刺激) Provider
 * 通过 DG-Lab 郊狼设备执行电刺激动作
 * hidden: true — 需要解锁才注册
 */

import { coyoteService } from '../../../services/coyoteService.js'
import { CoyoteConnectionState, CoyoteChannel } from '../../coyote/constants.js'

const HookActionType = {
  STRENGTH_SET: 'strength_set',
  STRENGTH_INCREASE: 'strength_increase',
  STRENGTH_DECREASE: 'strength_decrease',
  PULSE: 'pulse',
  CLEAR: 'clear'
}

export const estimProvider = {
  id: 'estim',
  name: '电刺激',
  icon: 'lucide:zap',
  hidden: true,

  actions: [
    {
      type: HookActionType.STRENGTH_SET,
      name: '设置强度',
      params: [
        {
          key: 'channel',
          type: 'select',
          label: '通道',
          default: 'A',
          options: [
            { value: 'A', label: 'A 通道' },
            { value: 'B', label: 'B 通道' },
            { value: 'both', label: '双通道' }
          ]
        },
        { key: 'value', type: 'number', label: '强度值', default: 0, min: 0, max: 200 }
      ]
    },
    {
      type: HookActionType.STRENGTH_INCREASE,
      name: '增加强度',
      params: [
        {
          key: 'channel',
          type: 'select',
          label: '通道',
          default: 'A',
          options: [
            { value: 'A', label: 'A 通道' },
            { value: 'B', label: 'B 通道' },
            { value: 'both', label: '双通道' }
          ]
        },
        { key: 'value', type: 'number', label: '增加量', default: 5, min: 1, max: 100 }
      ]
    },
    {
      type: HookActionType.STRENGTH_DECREASE,
      name: '减少强度',
      params: [
        {
          key: 'channel',
          type: 'select',
          label: '通道',
          default: 'A',
          options: [
            { value: 'A', label: 'A 通道' },
            { value: 'B', label: 'B 通道' },
            { value: 'both', label: '双通道' }
          ]
        },
        { key: 'value', type: 'number', label: '减少量', default: 5, min: 1, max: 100 }
      ]
    },
    {
      type: HookActionType.PULSE,
      name: '发送波形',
      params: [
        {
          key: 'channel',
          type: 'select',
          label: '通道',
          default: 'A',
          options: [
            { value: 'A', label: 'A 通道' },
            { value: 'B', label: 'B 通道' },
            { value: 'both', label: '双通道' }
          ]
        },
        { key: 'patterns', type: 'patterns', label: '波形数据', default: [] },
        {
          key: 'durationMs',
          type: 'number',
          label: '持续时间(ms)',
          default: 3000,
          min: 100,
          max: 30000
        }
      ]
    },
    {
      type: HookActionType.CLEAR,
      name: '清除通道',
      params: [
        {
          key: 'channel',
          type: 'select',
          label: '通道',
          default: 'A',
          options: [
            { value: 'A', label: 'A 通道' },
            { value: 'B', label: 'B 通道' },
            { value: 'both', label: '双通道' }
          ]
        }
      ]
    }
  ],

  isAvailable() {
    return coyoteService.connectionState.value === CoyoteConnectionState.BOUND
  },

  getStatus() {
    const state = coyoteService.connectionState.value
    switch (state) {
      case CoyoteConnectionState.BOUND:
        return { available: true, label: '已连接' }
      case CoyoteConnectionState.CONNECTING:
      case CoyoteConnectionState.WAITING_BIND:
        return { available: false, label: '连接中...' }
      case CoyoteConnectionState.ERROR:
        return { available: false, label: '连接错误' }
      default:
        return { available: false, label: '未连接' }
    }
  },

  execute(hook) {
    const action = hook.action
    if (!action) return

    const channels =
      action.channel === 'both'
        ? [CoyoteChannel.A, CoyoteChannel.B]
        : [action.channel || CoyoteChannel.A]

    // 从 useCoyote 设置中获取 maxStrength 比较复杂，暂用 200 作为硬上限
    const maxStrength = 200
    const value = Math.max(0, Math.min(action.value || 0, maxStrength))

    switch (action.type) {
      case HookActionType.STRENGTH_SET:
        channels.forEach((ch) => coyoteService.setStrength(ch, value, maxStrength))
        break
      case HookActionType.STRENGTH_INCREASE:
        channels.forEach((ch) => coyoteService.increaseStrength(ch, value, maxStrength))
        break
      case HookActionType.STRENGTH_DECREASE:
        channels.forEach((ch) => coyoteService.decreaseStrength(ch, value, maxStrength))
        break
      case HookActionType.PULSE:
        if (action.patterns && action.patterns.length > 0) {
          channels.forEach((ch) => coyoteService.sendPulse(ch, action.patterns))
        }
        break
      case HookActionType.CLEAR:
        channels.forEach((ch) => coyoteService.clearChannel(ch))
        break
    }
  }
}
