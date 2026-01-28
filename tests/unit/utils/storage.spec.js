/**
 * src/utils/storage.js 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  safeLocalStorageGetJSON,
  safeLocalStorageSetJSON
} from '@/utils/storage.js'

describe('storage.js', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('safeLocalStorageGet', () => {
    it('应该返回存储的值', () => {
      localStorage.setItem('testKey', 'testValue')
      expect(safeLocalStorageGet('testKey')).toBe('testValue')
    })

    it('当键不存在时应该返回 null', () => {
      expect(safeLocalStorageGet('nonExistent')).toBeNull()
    })

    it('当键不存在时应该返回提供的默认值', () => {
      expect(safeLocalStorageGet('nonExistent', 'default')).toBe('default')
    })

    it('当 localStorage 抛出异常时应该返回默认值', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => {
        throw new Error('Storage error')
      })
      expect(safeLocalStorageGet('key', 'fallback')).toBe('fallback')
      spy.mockRestore()
    })

    it('当值存在时不应该使用默认值', () => {
      localStorage.setItem('key', 'existingValue')
      expect(safeLocalStorageGet('key', 'default')).toBe('existingValue')
    })
  })

  describe('safeLocalStorageSet', () => {
    it('应该成功存储值并返回 true', () => {
      const result = safeLocalStorageSet('key', 'value')
      expect(result).toBe(true)
      expect(localStorage.getItem('key')).toBe('value')
    })

    it('当 localStorage 抛出异常时应该返回 false', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })
      expect(safeLocalStorageSet('key', 'value')).toBe(false)
      spy.mockRestore()
    })

    it('应该覆盖已存在的值', () => {
      localStorage.setItem('key', 'oldValue')
      safeLocalStorageSet('key', 'newValue')
      expect(localStorage.getItem('key')).toBe('newValue')
    })
  })

  describe('safeLocalStorageRemove', () => {
    it('应该成功删除键并返回 true', () => {
      localStorage.setItem('key', 'value')
      const result = safeLocalStorageRemove('key')
      expect(result).toBe(true)
      expect(localStorage.getItem('key')).toBeNull()
    })

    it('删除不存在的键也应该返回 true', () => {
      expect(safeLocalStorageRemove('nonExistent')).toBe(true)
    })

    it('当 localStorage 抛出异常时应该返回 false', () => {
      const spy = vi.spyOn(localStorage, 'removeItem').mockImplementationOnce(() => {
        throw new Error('Storage error')
      })
      expect(safeLocalStorageRemove('key')).toBe(false)
      spy.mockRestore()
    })
  })

  describe('safeLocalStorageGetJSON', () => {
    it('应该正确解析 JSON 对象', () => {
      const obj = { name: 'test', value: 123 }
      localStorage.setItem('jsonKey', JSON.stringify(obj))
      expect(safeLocalStorageGetJSON('jsonKey', {})).toEqual(obj)
    })

    it('应该正确解析 JSON 数组', () => {
      const arr = [1, 2, 3, 'test']
      localStorage.setItem('arrayKey', JSON.stringify(arr))
      expect(safeLocalStorageGetJSON('arrayKey', [])).toEqual(arr)
    })

    it('当键不存在时应该返回默认值', () => {
      expect(safeLocalStorageGetJSON('nonExistent', { default: true })).toEqual({
        default: true
      })
    })

    it('当 JSON 解析失败时应该返回默认值', () => {
      localStorage.setItem('invalidJson', 'not valid json {')
      expect(safeLocalStorageGetJSON('invalidJson', { fallback: true })).toEqual({
        fallback: true
      })
    })

    it('当 localStorage 抛出异常时应该返回默认值', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => {
        throw new Error('Storage error')
      })
      expect(safeLocalStorageGetJSON('key', [])).toEqual([])
      spy.mockRestore()
    })

    it('应该正确处理 null 值', () => {
      localStorage.setItem('nullKey', JSON.stringify(null))
      expect(safeLocalStorageGetJSON('nullKey', 'default')).toBeNull()
    })

    it('应该正确处理原始类型', () => {
      localStorage.setItem('numberKey', JSON.stringify(42))
      localStorage.setItem('boolKey', JSON.stringify(true))
      localStorage.setItem('stringKey', JSON.stringify('hello'))

      expect(safeLocalStorageGetJSON('numberKey', 0)).toBe(42)
      expect(safeLocalStorageGetJSON('boolKey', false)).toBe(true)
      expect(safeLocalStorageGetJSON('stringKey', '')).toBe('hello')
    })
  })

  describe('safeLocalStorageSetJSON', () => {
    it('应该正确序列化并存储对象', () => {
      const obj = { name: 'test', items: [1, 2, 3] }
      const result = safeLocalStorageSetJSON('key', obj)
      expect(result).toBe(true)
      expect(JSON.parse(localStorage.getItem('key'))).toEqual(obj)
    })

    it('应该正确序列化并存储数组', () => {
      const arr = ['a', 'b', { c: 1 }]
      safeLocalStorageSetJSON('arrayKey', arr)
      expect(JSON.parse(localStorage.getItem('arrayKey'))).toEqual(arr)
    })

    it('当序列化失败时应该返回 false', () => {
      const circular = {}
      circular.self = circular
      expect(safeLocalStorageSetJSON('key', circular)).toBe(false)
    })

    it('当 localStorage 抛出异常时应该返回 false', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })
      expect(safeLocalStorageSetJSON('key', { data: true })).toBe(false)
      spy.mockRestore()
    })

    it('应该正确处理 null 值', () => {
      safeLocalStorageSetJSON('nullKey', null)
      expect(localStorage.getItem('nullKey')).toBe('null')
    })

    it('应该正确处理原始类型', () => {
      safeLocalStorageSetJSON('numberKey', 42)
      safeLocalStorageSetJSON('boolKey', false)

      expect(localStorage.getItem('numberKey')).toBe('42')
      expect(localStorage.getItem('boolKey')).toBe('false')
    })
  })
})
