import {
  encodeData,
  decodeData,
  encodeSyncRequest,
  decodeSyncResponse,
  PROTOBUF_PROTOCOL_VERSION
} from '../../shared/proto/index.js'

export const PROTOBUF_CONTENT_TYPE = 'application/x-protobuf'

export const encodeToProtobuf = (dataType, data) => {
  return encodeData(dataType, data)
}

export const decodeFromProtobuf = (dataType, buffer) => {
  return decodeData(dataType, buffer)
}

export const createProtobufRequestInit = (dataType, body) => {
  const binary = encodeSyncRequest(dataType, body.data, body.version)
  return {
    headers: {
      'Content-Type': PROTOBUF_CONTENT_TYPE,
      Accept: PROTOBUF_CONTENT_TYPE
    },
    body: binary
  }
}

export const parseProtobufResponse = async (response, dataType) => {
  const buffer = await response.arrayBuffer()
  return decodeSyncResponse(buffer, dataType)
}

export { PROTOBUF_PROTOCOL_VERSION }
