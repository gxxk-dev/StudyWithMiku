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

vi.mock('../../shared/cbor/index.js', () => ({
  compressData: vi.fn((_type, data) => data),
  decompressData: vi.fn((_type, data) => data),
  CBOR_PROTOCOL_VERSION: 1
}))

let mod

beforeEach(async () => {
  vi.clearAllMocks()
  mod = await import('@/utils/cborClient.js')
})

describe('cborClient', () => {
  describe('CBOR_CONTENT_TYPE', () => {
    it('值为 application/cbor', () => {
      expect(mod.CBOR_CONTENT_TYPE).toBe('application/cbor')
    })
  })

  describe('encodeToCbor / decodeFromCbor', () => {
    it('编码后解码保持数据一致', () => {
      const data = { records: [{ id: '1', mode: 'focus' }] }
      const encoded = mod.encodeToCbor('focus_records', data)
      expect(encoded).toBeInstanceOf(Uint8Array)

      const decoded = mod.decodeFromCbor('focus_records', encoded)
      expect(decoded).toEqual(data)
    })

    it('编码和解码调用正确', () => {
      const data = { test: true }

      const encoded = mod.encodeToCbor('focus_settings', data)
      expect(encoded).toBeInstanceOf(Uint8Array)

      const decoded = mod.decodeFromCbor('focus_settings', encoded)
      expect(decoded).toEqual(data)
    })
  })

  describe('createCborRequestInit', () => {
    it('生成正确的 fetch 配置', () => {
      const body = { data: { focusDuration: 1500 }, version: 1 }
      const result = mod.createCborRequestInit('focus_settings', body)

      expect(result.headers).toBeDefined()
      expect(result.headers['Content-Type']).toBe('application/cbor')
      expect(result.headers['Accept']).toBe('application/cbor')
      expect(result.body).toBeInstanceOf(Uint8Array)
    })

    it('包含 data 字段时正常处理', () => {
      const body = { data: [{ id: '1' }], version: 2 }
      const result = mod.createCborRequestInit('focus_records', body)
      expect(result.body).toBeInstanceOf(Uint8Array)
    })

    it('处理 body.changes 数组', () => {
      const body = {
        changes: [
          { type: 'focus_records', data: [{ id: '1' }] },
          { type: 'focus_settings', data: { focusDuration: 1500 } }
        ]
      }

      const result = mod.createCborRequestInit('focus_records', body)
      expect(result.body).toBeInstanceOf(Uint8Array)
    })
  })

  describe('parseCborResponse', () => {
    it('解析 CBOR 响应', async () => {
      const responseData = { type: 'focus_records', data: [{ id: '1' }], version: 1 }
      const encoded = mod.encodeToCbor('focus_records', responseData)

      const mockResponse = {
        headers: {
          get: vi.fn((name) => (name.toLowerCase() === 'content-type' ? 'application/cbor' : null))
        },
        arrayBuffer: vi.fn().mockResolvedValue(encoded.buffer),
        ok: true,
        status: 200
      }

      const result = await mod.parseCborResponse(mockResponse, 'focus_records')
      expect(mockResponse.arrayBuffer).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('JSON 回退：非 CBOR content-type 使用 response.json()', async () => {
      const responseData = { type: 'focus_records', data: [], version: 0 }
      const mockResponse = {
        headers: {
          get: vi.fn(() => 'application/json')
        },
        json: vi.fn().mockResolvedValue(responseData),
        ok: true,
        status: 200
      }

      const result = await mod.parseCborResponse(mockResponse, 'focus_records')
      expect(mockResponse.json).toHaveBeenCalled()
      expect(result).toEqual(responseData)
    })

    it('无 content-type 时回退到 JSON', async () => {
      const responseData = { error: 'not found' }
      const mockResponse = {
        headers: {
          get: vi.fn(() => null)
        },
        json: vi.fn().mockResolvedValue(responseData),
        ok: false,
        status: 404
      }

      const result = await mod.parseCborResponse(mockResponse, 'focus_records')
      expect(mockResponse.json).toHaveBeenCalled()
      expect(result).toEqual(responseData)
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
