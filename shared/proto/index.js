import { create, toBinary, fromBinary } from '@bufbuild/protobuf'
import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt'
import {
  FocusRecordsSchema,
  FocusSettingsSchema,
  PlaylistsSchema,
  UserSettingsSchema,
  ShareConfigSchema,
  SyncRequestSchema,
  SyncResponseSchema,
  FocusMode,
  CompletionType,
  PlaylistMode,
  PlaylistSource
} from './gen/studymiku_pb.js'

export const PROTOBUF_PROTOCOL_VERSION = 1

export const DATA_TYPES = {
  FOCUS_RECORDS: 'focus_records',
  FOCUS_SETTINGS: 'focus_settings',
  PLAYLISTS: 'playlists',
  USER_SETTINGS: 'user_settings',
  SHARE_CONFIG: 'share_config'
}

// --- Enum mappings: JS string <-> Proto number ---

const FOCUS_MODE_TO_PROTO = {
  focus: FocusMode.FOCUS,
  shortBreak: FocusMode.SHORT_BREAK,
  longBreak: FocusMode.LONG_BREAK
}

const FOCUS_MODE_FROM_PROTO = {
  [FocusMode.FOCUS]: 'focus',
  [FocusMode.SHORT_BREAK]: 'shortBreak',
  [FocusMode.LONG_BREAK]: 'longBreak'
}

const COMPLETION_TYPE_TO_PROTO = {
  completed: CompletionType.COMPLETED,
  cancelled: CompletionType.CANCELLED,
  skipped: CompletionType.SKIPPED,
  interrupted: CompletionType.INTERRUPTED,
  disabled: CompletionType.DISABLED
}

const COMPLETION_TYPE_FROM_PROTO = {
  [CompletionType.COMPLETED]: 'completed',
  [CompletionType.CANCELLED]: 'cancelled',
  [CompletionType.SKIPPED]: 'skipped',
  [CompletionType.INTERRUPTED]: 'interrupted',
  [CompletionType.DISABLED]: 'disabled'
}

const PLAYLIST_MODE_TO_PROTO = {
  playlist: PlaylistMode.PLAYLIST,
  collection: PlaylistMode.COLLECTION
}

const PLAYLIST_MODE_FROM_PROTO = {
  [PlaylistMode.PLAYLIST]: 'playlist',
  [PlaylistMode.COLLECTION]: 'collection'
}

const PLAYLIST_SOURCE_TO_PROTO = {
  netease: PlaylistSource.NETEASE,
  tencent: PlaylistSource.TENCENT,
  spotify: PlaylistSource.SPOTIFY,
  local: PlaylistSource.LOCAL
}

const PLAYLIST_SOURCE_FROM_PROTO = {
  [PlaylistSource.NETEASE]: 'netease',
  [PlaylistSource.TENCENT]: 'tencent',
  [PlaylistSource.SPOTIFY]: 'spotify',
  [PlaylistSource.LOCAL]: 'local'
}

// --- Timestamp conversion ---

export const msToTimestamp = (ms) => {
  if (ms == null) return undefined
  return timestampFromDate(new Date(ms))
}

export const timestampToMs = (ts) => {
  if (!ts) return undefined
  return timestampDate(ts).getTime()
}

// --- Schema lookup ---

const DATA_TYPE_SCHEMAS = {
  [DATA_TYPES.FOCUS_RECORDS]: FocusRecordsSchema,
  [DATA_TYPES.FOCUS_SETTINGS]: FocusSettingsSchema,
  [DATA_TYPES.PLAYLISTS]: PlaylistsSchema,
  [DATA_TYPES.USER_SETTINGS]: UserSettingsSchema,
  [DATA_TYPES.SHARE_CONFIG]: ShareConfigSchema
}

const DATA_TYPE_ONEOF_FIELD = {
  [DATA_TYPES.FOCUS_RECORDS]: 'focusRecords',
  [DATA_TYPES.FOCUS_SETTINGS]: 'focusSettings',
  [DATA_TYPES.PLAYLISTS]: 'playlists',
  [DATA_TYPES.USER_SETTINGS]: 'userSettings',
  [DATA_TYPES.SHARE_CONFIG]: 'shareConfig'
}

const SERVER_DATA_ONEOF_FIELD = {
  [DATA_TYPES.FOCUS_RECORDS]: 'serverFocusRecords',
  [DATA_TYPES.FOCUS_SETTINGS]: 'serverFocusSettings',
  [DATA_TYPES.PLAYLISTS]: 'serverPlaylists',
  [DATA_TYPES.USER_SETTINGS]: 'serverUserSettings',
  [DATA_TYPES.SHARE_CONFIG]: 'serverShareConfig'
}

// --- JS -> Proto conversion (per data type) ---

const jsToProtoFocusRecord = (r) => ({
  id: r.id || '',
  mode: FOCUS_MODE_TO_PROTO[r.mode] ?? FocusMode.FOCUS_MODE_UNSPECIFIED,
  startTime: msToTimestamp(r.startTime),
  endTime: msToTimestamp(r.endTime),
  duration: r.duration ?? 0,
  elapsed: r.elapsed ?? 0,
  completionType:
    COMPLETION_TYPE_TO_PROTO[r.completionType] ?? CompletionType.COMPLETION_TYPE_UNSPECIFIED,
  updatedAt: msToTimestamp(r.updatedAt)
})

const jsToProtoFocusRecords = (records) => ({
  records: (Array.isArray(records) ? records : []).map(jsToProtoFocusRecord)
})

const jsToProtoFocusSettings = (s) => ({
  focusDuration: s.focusDuration ?? 0,
  shortBreakDuration: s.shortBreakDuration ?? 0,
  longBreakDuration: s.longBreakDuration ?? 0,
  longBreakInterval: s.longBreakInterval ?? 0,
  autoStartBreaks: s.autoStartBreaks ?? false,
  autoStartFocus: s.autoStartFocus ?? false,
  notificationEnabled: s.notificationEnabled ?? false,
  notificationSound: s.notificationSound ?? false
})

const jsToProtoSong = (s) => ({
  id: s.id || '',
  name: s.name || '',
  artist: s.artist,
  url: s.url,
  cover: s.cover,
  lrc: s.lrc
})

const jsToProtoPlaylistItem = (p) => ({
  id: p.id || '',
  name: p.name || '',
  cover: p.cover,
  order: p.order ?? 0,
  mode: PLAYLIST_MODE_TO_PROTO[p.mode] ?? PlaylistMode.PLAYLIST_MODE_UNSPECIFIED,
  source: PLAYLIST_SOURCE_TO_PROTO[p.source] ?? PlaylistSource.PLAYLIST_SOURCE_UNSPECIFIED,
  sourceId: p.sourceId,
  songs: (p.songs || []).map(jsToProtoSong)
})

const jsToProtoPlaylists = (d) => ({
  playlists: (d.playlists || []).map(jsToProtoPlaylistItem),
  currentId: d.currentId,
  defaultId: d.defaultId
})

const jsToProtoMediaSettings = (m) => {
  if (!m) return undefined
  return {
    currentIndex: m.currentIndex ?? 0,
    currentSongIndex: m.currentSongIndex
  }
}

const jsToProtoUserSettings = (s) => ({
  video: jsToProtoMediaSettings(s.video),
  music: jsToProtoMediaSettings(s.music)
})

const jsToProtoShareConfig = (c) => ({
  modules: c.modules
    ? {
        basicStats: c.modules.basicStats ?? c.modules.basic_stats ?? false,
        miniHeatmap: c.modules.miniHeatmap ?? c.modules.mini_heatmap ?? false,
        trendChart: c.modules.trendChart ?? c.modules.trend_chart ?? false
      }
    : undefined,
  showHitokoto: c.showHitokoto ?? c.show_hitokoto ?? false,
  hitokotoCategories: c.hitokotoCategories ?? c.hitokoto_categories ?? []
})

const JS_TO_PROTO = {
  [DATA_TYPES.FOCUS_RECORDS]: jsToProtoFocusRecords,
  [DATA_TYPES.FOCUS_SETTINGS]: jsToProtoFocusSettings,
  [DATA_TYPES.PLAYLISTS]: jsToProtoPlaylists,
  [DATA_TYPES.USER_SETTINGS]: jsToProtoUserSettings,
  [DATA_TYPES.SHARE_CONFIG]: jsToProtoShareConfig
}

// --- Proto -> JS conversion (per data type) ---

const protoToJsFocusRecord = (r) => {
  const result = {
    id: r.id,
    mode: FOCUS_MODE_FROM_PROTO[r.mode] ?? null,
    startTime: timestampToMs(r.startTime),
    endTime: timestampToMs(r.endTime),
    duration: r.duration,
    elapsed: r.elapsed,
    completionType: COMPLETION_TYPE_FROM_PROTO[r.completionType] ?? null
  }
  const updatedAt = timestampToMs(r.updatedAt)
  if (updatedAt !== undefined) {
    result.updatedAt = updatedAt
  }
  return result
}

const protoToJsFocusRecords = (msg) => (msg.records || []).map(protoToJsFocusRecord)

const protoToJsFocusSettings = (s) => ({
  focusDuration: s.focusDuration,
  shortBreakDuration: s.shortBreakDuration,
  longBreakDuration: s.longBreakDuration,
  longBreakInterval: s.longBreakInterval,
  autoStartBreaks: s.autoStartBreaks,
  autoStartFocus: s.autoStartFocus,
  notificationEnabled: s.notificationEnabled,
  notificationSound: s.notificationSound
})

const protoToJsSong = (s) => {
  const result = { id: s.id, name: s.name }
  if (s.artist != null) result.artist = s.artist
  if (s.url != null) result.url = s.url
  if (s.cover != null) result.cover = s.cover
  if (s.lrc != null) result.lrc = s.lrc
  return result
}

const protoToJsPlaylistItem = (p) => {
  const result = {
    id: p.id,
    name: p.name,
    order: p.order,
    mode: PLAYLIST_MODE_FROM_PROTO[p.mode] ?? null,
    songs: (p.songs || []).map(protoToJsSong)
  }
  if (p.cover != null) result.cover = p.cover
  if (p.source != null && p.source !== PlaylistSource.PLAYLIST_SOURCE_UNSPECIFIED) {
    result.source = PLAYLIST_SOURCE_FROM_PROTO[p.source] ?? null
  }
  if (p.sourceId != null) result.sourceId = p.sourceId
  return result
}

const protoToJsPlaylists = (d) => {
  const result = {
    playlists: (d.playlists || []).map(protoToJsPlaylistItem)
  }
  if (d.currentId != null) result.currentId = d.currentId
  if (d.defaultId != null) result.defaultId = d.defaultId
  return result
}

const protoToJsMediaSettings = (m) => {
  if (!m) return undefined
  const result = { currentIndex: m.currentIndex }
  if (m.currentSongIndex != null) result.currentSongIndex = m.currentSongIndex
  return result
}

const protoToJsUserSettings = (s) => {
  const result = {}
  if (s.video) result.video = protoToJsMediaSettings(s.video)
  if (s.music) result.music = protoToJsMediaSettings(s.music)
  return result
}

const protoToJsShareConfig = (c) => ({
  modules: c.modules
    ? {
        basicStats: c.modules.basicStats ?? false,
        miniHeatmap: c.modules.miniHeatmap ?? false,
        trendChart: c.modules.trendChart ?? false
      }
    : { basicStats: false, miniHeatmap: false, trendChart: false },
  showHitokoto: c.showHitokoto ?? false,
  hitokotoCategories: c.hitokotoCategories ?? []
})

const PROTO_TO_JS = {
  [DATA_TYPES.FOCUS_RECORDS]: protoToJsFocusRecords,
  [DATA_TYPES.FOCUS_SETTINGS]: protoToJsFocusSettings,
  [DATA_TYPES.PLAYLISTS]: protoToJsPlaylists,
  [DATA_TYPES.USER_SETTINGS]: protoToJsUserSettings,
  [DATA_TYPES.SHARE_CONFIG]: protoToJsShareConfig
}

// --- Public API: data-level encode/decode ---

export const encodeData = (dataType, jsObject) => {
  const schema = DATA_TYPE_SCHEMAS[dataType]
  if (!schema) throw new Error(`Unknown data type: ${dataType}`)
  const converter = JS_TO_PROTO[dataType]
  const msg = create(schema, converter(jsObject))
  return toBinary(schema, msg)
}

export const decodeData = (dataType, buffer) => {
  const schema = DATA_TYPE_SCHEMAS[dataType]
  if (!schema) throw new Error(`Unknown data type: ${dataType}`)
  const msg = fromBinary(schema, new Uint8Array(buffer))
  return PROTO_TO_JS[dataType](msg)
}

// --- Public API: SyncRequest envelope ---

export const encodeSyncRequest = (dataType, data, version) => {
  const converter = JS_TO_PROTO[dataType]
  const schema = DATA_TYPE_SCHEMAS[dataType]
  if (!converter || !schema) throw new Error(`Unknown data type: ${dataType}`)

  const oneofField = DATA_TYPE_ONEOF_FIELD[dataType]
  const protoData = create(schema, converter(data))

  const req = create(SyncRequestSchema, {
    data: { case: oneofField, value: protoData }
  })
  if (version != null) {
    req.version = version
  }
  return toBinary(SyncRequestSchema, req)
}

export const decodeSyncRequest = (buffer, dataType) => {
  const msg = fromBinary(SyncRequestSchema, new Uint8Array(buffer))
  const result = { version: msg.version }

  if (msg.data?.value) {
    const converter = PROTO_TO_JS[dataType]
    result.data = converter ? converter(msg.data.value) : null
  } else {
    result.data = null
  }

  return result
}

// --- Public API: SyncResponse envelope ---

export const encodeSyncResponse = (responseObj, dataType) => {
  const resp = create(SyncResponseSchema, {
    type: responseObj.type || '',
    version: responseObj.version ?? 0,
    success: responseObj.success ?? false,
    error: responseObj.error,
    code: responseObj.code,
    conflict: responseObj.conflict ?? false,
    serverVersion: responseObj.serverVersion,
    merged: responseObj.merged
  })

  if (responseObj.data != null && dataType) {
    const oneofField = DATA_TYPE_ONEOF_FIELD[dataType]
    const converter = JS_TO_PROTO[dataType]
    const schema = DATA_TYPE_SCHEMAS[dataType]
    if (oneofField && converter && schema) {
      resp.data = { case: oneofField, value: create(schema, converter(responseObj.data)) }
    }
  }

  if (responseObj.serverData != null && dataType) {
    const serverField = SERVER_DATA_ONEOF_FIELD[dataType]
    const converter = JS_TO_PROTO[dataType]
    const schema = DATA_TYPE_SCHEMAS[dataType]
    if (serverField && converter && schema) {
      resp.serverData = {
        case: serverField,
        value: create(schema, converter(responseObj.serverData))
      }
    }
  }

  return toBinary(SyncResponseSchema, resp)
}

export const decodeSyncResponse = (buffer, dataType) => {
  const msg = fromBinary(SyncResponseSchema, new Uint8Array(buffer))
  const result = {
    type: msg.type,
    version: msg.version,
    success: msg.success,
    conflict: msg.conflict
  }

  if (msg.error != null) result.error = msg.error
  if (msg.code != null) result.code = msg.code
  if (msg.serverVersion != null) result.serverVersion = msg.serverVersion
  if (msg.merged != null) result.merged = msg.merged

  if (msg.data?.value && dataType) {
    const converter = PROTO_TO_JS[dataType]
    result.data = converter ? converter(msg.data.value) : null
  } else {
    result.data = null
  }

  if (msg.serverData?.value && dataType) {
    const converter = PROTO_TO_JS[dataType]
    result.serverData = converter ? converter(msg.serverData.value) : null
  }

  return result
}
