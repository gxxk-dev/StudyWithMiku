import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('cbor-x', () => ({
  encode: vi.fn((data) => {
    const str = JSON.stringify(data)
    return new Uint8Array(str.split('').map((c) => c.charCodeAt(0)))
  }),
  decode: vi.fn((buffer) => {
    const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    return JSON.parse(String.fromCharCode(...arr))
  })
}))

vi.mock('../../../shared/cbor/index.js', () => ({
  compressData: vi.fn((_type, data) => data),
  decompressData: vi.fn((_type, data) => data),
  CBOR_PROTOCOL_VERSION: 1
}))

let mod

beforeEach(async () => {
  vi.clearAllMocks()
  mod = await import('../../../../workers/utils/cborServer.js')
})

describe('workers/utils/cborServer', () => {
  describe('encodeToCbor / decodeFromCbor', () => {
    it('编码后解码保持数据一致', () => {
      const data = [{ id: '1', mode: 'focus', startTime: 1700000000 }]
      const encoded = mod.encodeToCbor('focus_records', data)
      expect(encoded).toBeInstanceOf(Uint8Array)

      const decoded = mod.decodeFromCbor('focus_records', encoded)
      expect(decoded).toEqual(data)
    })

    it('编码和解码调用正确', () => {
      const data = { focusDuration: 1500 }
      const encoded = mod.encodeToCbor('focus_settings', data)
      expect(encoded).toBeInstanceOf(Uint8Array)

      const decoded = mod.decodeFromCbor('focus_settings', encoded)
      expect(decoded).toEqual(data)
    })
  })

  describe('detectDataFormat', () => {
    it('字符串检测为 JSON', () => {
      expect(mod.detectDataFormat('{"key":"value"}')).toBe('json')
    })

    it('Uint8Array 检测为 CBOR', () => {
      expect(mod.detectDataFormat(new Uint8Array([1, 2, 3]))).toBe('cbor')
    })

    it('ArrayBuffer 检测为 CBOR', () => {
      expect(mod.detectDataFormat(new ArrayBuffer(8))).toBe('cbor')
    })

    it('null 检测为 JSON', () => {
      expect(mod.detectDataFormat(null)).toBe('json')
    })

    it('undefined 检测为 JSON', () => {
      expect(mod.detectDataFormat(undefined)).toBe('json')
    })

    it('普通对象检测为 JSON', () => {
      expect(mod.detectDataFormat({ key: 'value' })).toBe('json')
    })
  })

  describe('parseStoredData', () => {
    it('自动检测并解析 JSON 字符串', () => {
      const data = { focusDuration: 1500 }
      const result = mod.parseStoredData('focus_settings', JSON.stringify(data))
      expect(result).toEqual(data)
    })

    it('自动检测并解析 CBOR 二进制', () => {
      const data = [{ id: '1' }]
      const encoded = mod.encodeToCbor('focus_records', data)
      const result = mod.parseStoredData('focus_records', encoded)
      expect(result).toEqual(data)
    })

    it('null 输入返回 null', () => {
      expect(mod.parseStoredData('focus_records', null)).toBeNull()
    })

    it('undefined 输入返回 null', () => {
      expect(mod.parseStoredData('focus_records', undefined)).toBeNull()
    })
  })

  describe('getCborProtocolVersion', () => {
    it('返回协议版本号', () => {
      expect(mod.getCborProtocolVersion()).toBe(1)
    })

    it('返回数字类型', () => {
      expect(typeof mod.getCborProtocolVersion()).toBe('number')
    })
  })
})
