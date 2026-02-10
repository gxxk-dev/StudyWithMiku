/**
 * @module src/utils/cborClient
 * @description 前端 CBOR 编解码封装
 */

import { encode, decode } from 'cbor-x'
import { compressData, decompressData, CBOR_PROTOCOL_VERSION } from '../../shared/cbor/index.js'

/** CBOR Content-Type */
export const CBOR_CONTENT_TYPE = 'application/cbor'

/**
 * 将数据编码为 CBOR ArrayBuffer
 * @param {string} dataType - 数据类型
 * @param {*} data - 原始数据
 * @returns {ArrayBuffer} CBOR 编码的二进制数据
 */
export const encodeToCbor = (dataType, data) => {
  const compressed = compressData(dataType, data)
  return encode(compressed)
}

/**
 * 从 CBOR ArrayBuffer 解码数据
 * @param {string} dataType - 数据类型
 * @param {ArrayBuffer} buffer - CBOR 二进制数据
 * @returns {*} 解码后的原始数据
 */
export const decodeFromCbor = (dataType, buffer) => {
  const compressed = decode(new Uint8Array(buffer))
  return decompressData(dataType, compressed)
}

/**
 * 创建 CBOR 请求配置
 * @param {string} dataType - 数据类型
 * @param {Object} body - 请求体 { data, version } 或 { changes, version }
 * @returns {Object} fetch 请求配置
 */
export const createCborRequestInit = (dataType, body) => {
  // 如果 body 包含 data 字段，压缩它
  const processedBody = { ...body }
  if (body.data !== undefined) {
    processedBody.data = compressData(dataType, body.data)
  }
  if (Array.isArray(body.changes)) {
    processedBody.changes = body.changes.map((change) => {
      const compressed = { ...change }
      // useSyncEngine 格式: { action, record, timestamp }
      if (change.record) {
        compressed.record = compressData(dataType, [change.record])[0]
      }
      // useDataSync 格式: { type, data, version, operation }
      if (change.data !== undefined) {
        compressed.data = compressData(change.type || dataType, change.data)
      }
      return compressed
    })
  }

  return {
    headers: {
      'Content-Type': CBOR_CONTENT_TYPE,
      Accept: CBOR_CONTENT_TYPE
    },
    body: encode(processedBody)
  }
}

/**
 * 解析 CBOR 响应
 * @param {Response} response - fetch 响应
 * @param {string} dataType - 数据类型（用于解压 data 字段）
 * @returns {Promise<Object>} 解析后的响应数据
 */
export const parseCborResponse = async (response, dataType) => {
  const contentType = response.headers.get('Content-Type') || ''

  if (contentType.includes(CBOR_CONTENT_TYPE)) {
    const buffer = await response.arrayBuffer()
    const decoded = decode(new Uint8Array(buffer))

    // 如果响应包含 data 字段，解压它
    if (decoded.data !== undefined && decoded.data !== null) {
      decoded.data = decompressData(dataType, decoded.data)
    }
    // 如果响应包含 serverData 字段（冲突时），解压它
    if (decoded.serverData !== undefined && decoded.serverData !== null) {
      decoded.serverData = decompressData(dataType, decoded.serverData)
    }

    return decoded
  }

  // 回退到 JSON
  return response.json()
}

/**
 * 获取 CBOR 协议版本
 * @returns {number}
 */
export const getCborProtocolVersion = () => CBOR_PROTOCOL_VERSION

export { CBOR_PROTOCOL_VERSION }
