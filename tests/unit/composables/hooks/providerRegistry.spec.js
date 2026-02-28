/**
 * hooks/providerRegistry.js 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { providerRegistry } from '@/composables/hooks/providerRegistry.js'

describe('providerRegistry', () => {
  beforeEach(() => {
    providerRegistry.clear()
  })

  it('register 和 get', () => {
    const provider = { id: 'test', name: 'Test' }
    providerRegistry.register(provider)
    expect(providerRegistry.get('test')).toBe(provider)
  })

  it('has 返回是否已注册', () => {
    expect(providerRegistry.has('test')).toBe(false)
    providerRegistry.register({ id: 'test', name: 'Test' })
    expect(providerRegistry.has('test')).toBe(true)
  })

  it('unregister 移除 provider', () => {
    providerRegistry.register({ id: 'test', name: 'Test' })
    providerRegistry.unregister('test')
    expect(providerRegistry.has('test')).toBe(false)
    expect(providerRegistry.get('test')).toBeUndefined()
  })

  it('getAll 返回所有已注册 provider', () => {
    providerRegistry.register({ id: 'a', name: 'A' })
    providerRegistry.register({ id: 'b', name: 'B' })
    const all = providerRegistry.getAll()
    expect(all).toHaveLength(2)
    expect(all.map((p) => p.id).sort()).toEqual(['a', 'b'])
  })

  it('clear 清除所有 provider', () => {
    providerRegistry.register({ id: 'a', name: 'A' })
    providerRegistry.register({ id: 'b', name: 'B' })
    providerRegistry.clear()
    expect(providerRegistry.getAll()).toHaveLength(0)
  })

  it('get 不存在的 provider 返回 undefined', () => {
    expect(providerRegistry.get('nonexistent')).toBeUndefined()
  })

  it('重复注册同一 id 覆盖旧的', () => {
    providerRegistry.register({ id: 'test', name: 'Old' })
    providerRegistry.register({ id: 'test', name: 'New' })
    expect(providerRegistry.get('test').name).toBe('New')
    expect(providerRegistry.getAll()).toHaveLength(1)
  })
})
