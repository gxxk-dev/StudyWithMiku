/**
 * @module workers/utils/cborServer
 * @description 后端 CBOR 编解码封装
 */

import { encode, decode } from 'cbor-x'
import { compressData, decompressData, CBOR_PROTOCOL_VERSION } from '../../shared/cbor/index.js'

/**
 * 将数据编码为 CBOR 二进制
 * @param {string} dataType - 数据类型
 * @param {*} data - 原始数据
 * @returns {Uint8Array} CBOR 编码的二进制数据
 */
export const encodeToCbor = (dataType, data) => {
  const compressed = compressData(dataType, data)
  return encode(compressed)
}

/**
 * 从 CBOR 二进制解码数据
 * @param {string} dataType - 数据类型
 * @param {Uint8Array|ArrayBuffer} buffer - CBOR 二进制数据
 * @returns {*} 解码后的原始数据
 */
export const decodeFromCbor = (dataType, buffer) => {
  const compressed = decode(buffer)
  return decompressData(dataType, compressed)
}

/**
 * 检测数据格式（JSON 或 CBOR）
 * @param {string|Uint8Array|ArrayBuffer} data - 存储的数据
 * @returns {'json'|'cbor'} 数据格式
 */
export const detectDataFormat = (data) => {
  if (typeof data === 'string') {
    return 'json'
  }
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return 'cbor'
  }
  return 'json'
}

/**
 * 解析存储的数据（自动检测格式）
 * @param {string} dataType - 数据类型
 * @param {string|Uint8Array|ArrayBuffer} storedData - 存储的数据
 * @returns {*} 解析后的数据
 */
export const parseStoredData = (dataType, storedData) => {
  if (!storedData) return null

  const format = detectDataFormat(storedData)

  if (format === 'json') {
    return JSON.parse(storedData)
  }

  return decodeFromCbor(dataType, storedData)
}

/**
 * 获取 CBOR 协议版本
 * @returns {number}
 */
export const getCborProtocolVersion = () => CBOR_PROTOCOL_VERSION

export { CBOR_PROTOCOL_VERSION }
