import { encodeData, decodeData, PROTOBUF_PROTOCOL_VERSION } from '../../shared/proto/index.js'

export const encodeToProtobuf = (dataType, data) => {
  return encodeData(dataType, data)
}

export const decodeFromProtobuf = (dataType, buffer) => {
  return decodeData(dataType, buffer)
}

export const parseStoredData = (dataType, storedData) => {
  if (!storedData) return null
  return decodeFromProtobuf(dataType, storedData)
}

export { PROTOBUF_PROTOCOL_VERSION }
