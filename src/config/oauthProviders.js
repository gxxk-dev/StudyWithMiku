/**
 * OAuth Provider 注册表
 * 所有组件从此读取 provider 元数据，新增 provider 只需在此添加一行
 */
import { addIcon } from '@iconify/vue'
import linuxdoIcon from '../assets/icons/linuxdo.js'

addIcon('custom:linuxdo', linuxdoIcon)

export const OAUTH_PROVIDERS = {
  github: {
    label: 'GitHub',
    icon: 'mdi:github',
    hoverBg: 'rgba(36, 41, 46, 0.8)',
    hoverColor: null
  },
  google: {
    label: 'Google',
    icon: 'flat-color-icons:google',
    hoverBg: 'rgba(255, 255, 255, 0.9)',
    hoverColor: '#333'
  },
  microsoft: {
    label: 'Microsoft',
    icon: 'mdi:microsoft-windows',
    hoverBg: 'rgba(0, 164, 239, 0.8)',
    hoverColor: null
  },
  linuxdo: {
    label: 'LINUX DO',
    icon: 'custom:linuxdo',
    hoverBg: 'rgba(33, 150, 243, 0.8)',
    hoverColor: null
  }
}

export const OAUTH_PROVIDER_KEYS = Object.keys(OAUTH_PROVIDERS)

export const getProviderMeta = (provider) =>
  OAUTH_PROVIDERS[provider] || { label: provider, icon: 'mdi:account' }
