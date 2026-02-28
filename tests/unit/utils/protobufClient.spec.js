import { describe, it, expect, vi } from 'vitest'
import {
  PROTOBUF_CONTENT_TYPE,
  encodeToProtobuf,
  decodeFromProtobuf,
  createProtobufRequestInit,
  parseProtobufResponse,
  PROTOBUF_PROTOCOL_VERSION
} from '../../../src/utils/protobufClient.js'
import { DATA_TYPES, encodeSyncResponse } from '../../../shared/proto/index.js'

describe('protobufClient', () => {
  describe('constants', () => {
    it('Content-Type 应该是 application/x-protobuf', () => {
      expect(PROTOBUF_CONTENT_TYPE).toBe('application/x-protobuf')
    })

    it('协议版本应该是 1', () => {
      expect(PROTOBUF_PROTOCOL_VERSION).toBe(1)
    })
  })

  describe('encodeToProtobuf / decodeFromProtobuf', () => {
    it('focus_settings 编解码往返', () => {
      const settings = {
        focusDuration: 1500,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: false
      }

      const binary = encodeToProtobuf(DATA_TYPES.FOCUS_SETTINGS, settings)
      expect(binary).toBeInstanceOf(Uint8Array)

      const decoded = decodeFromProtobuf(DATA_TYPES.FOCUS_SETTINGS, binary)
      expect(decoded).toEqual(settings)
    })
  })

  describe('createProtobufRequestInit', () => {
    it('应该返回正确的 headers 和 binary body', () => {
      const body = {
        data: {
          focusDuration: 1500,
          shortBreakDuration: 300,
          longBreakDuration: 900,
          longBreakInterval: 4,
          autoStartBreaks: false,
          autoStartFocus: false
        },
        version: 1
      }

      const init = createProtobufRequestInit(DATA_TYPES.FOCUS_SETTINGS, body)

      expect(init.headers['Content-Type']).toBe('application/x-protobuf')
      expect(init.headers.Accept).toBe('application/x-protobuf')
      expect(init.body).toBeInstanceOf(Uint8Array)
    })
  })

  describe('parseProtobufResponse', () => {
    it('应该解码 Protobuf 响应', async () => {
      const settings = {
        focusDuration: 1500,
        shortBreakDuration: 300,
        longBreakDuration: 900,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: false
      }

      const responseBinary = encodeSyncResponse(
        {
          type: 'focus_settings',
          version: 1,
          success: true,
          data: settings
        },
        DATA_TYPES.FOCUS_SETTINGS
      )

      const mockResponse = {
        arrayBuffer: vi.fn().mockResolvedValue(responseBinary.buffer)
      }

      const result = await parseProtobufResponse(mockResponse, DATA_TYPES.FOCUS_SETTINGS)

      expect(result.type).toBe('focus_settings')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(settings)
    })
  })
})
