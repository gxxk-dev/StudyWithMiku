import { ref } from 'vue'
import { fetchPlaylist, getStoredConfig, saveConfig, DEFAULT_PLAYLIST_ID, getCachedPlaylist, cachePlaylist } from '../services/meting.js'
import { getAllSongs } from '../data/songs.js'
import { prefetchPlaylistAudios } from '../utils/audioPrefetch.js'

const MUSIC_SOURCE = {
  LOCAL: 'local',
  METING: 'meting'
}

const ALBUM_IMAGE_BASE_URL = 'https://assets.frez79.io/swm/album-img'
const SEKAI_COVER_URL = `${ALBUM_IMAGE_BASE_URL}/for-SEKAI.webp`
const DEFAULT_COVER_URL = `${ALBUM_IMAGE_BASE_URL}/other.webp`

const songs = ref([])
const loading = ref(false)
const currentSource = ref(localStorage.getItem('music_source') || MUSIC_SOURCE.METING)
const metingConfig = ref(getStoredConfig())
const playlistId = ref(localStorage.getItem('playlist_id') || DEFAULT_PLAYLIST_ID)
const platform = ref(localStorage.getItem('music_platform') || 'netease')

const PLATFORMS = [
  { value: 'netease', label: '网易云' },
  { value: 'tencent', label: 'QQ音乐' },
  { value: 'kugou', label: '酷狗' },
  { value: 'kuwo', label: '酷我' }
]

export const useMusic = () => {
  const persistMetingState = (platform, id) => {
    saveConfig(platform, id)
    metingConfig.value = { platform, id }
  }

  const loadLocalSongs = () => {
    const allSongs = getAllSongs()
    songs.value = allSongs.map(song => ({
      name: song.title,
      artist: song.artist,
      url: song.src,
      cover: song.album && song.album.includes('SEKAI') ? SEKAI_COVER_URL : DEFAULT_COVER_URL
    }))
    prefetchPlaylistAudios(songs.value, { platform: MUSIC_SOURCE.LOCAL, id: 'local' })
  }

  const loadMetingSongs = async (platform, id, options = {}) => {
    const { forceRefresh = false } = options
    loading.value = true

    const startPrefetch = (playlistSongs) => {
      if (!playlistSongs?.length) return
      prefetchPlaylistAudios(playlistSongs, { platform, id, force: forceRefresh })
    }

    const cachedEntry = getCachedPlaylist(platform, id)
    const hasCachedSongs = Boolean(cachedEntry?.songs?.length)

    if (hasCachedSongs) {
      songs.value = cachedEntry.songs
      persistMetingState(platform, id)
      startPrefetch(cachedEntry.songs)
      if (!forceRefresh && !cachedEntry.isExpired) {
        loading.value = false
        return
      }
    }

    try {
      const playlist = await fetchPlaylist(platform, id)
      if (playlist.length > 0) {
        songs.value = playlist
        cachePlaylist(platform, id, playlist)
        persistMetingState(platform, id)
        startPrefetch(playlist)
      } else if (hasCachedSongs) {
        persistMetingState(platform, id)
        startPrefetch(cachedEntry.songs)
      }
    } catch (error) {
      console.error('Load meting songs error:', error)
      if (hasCachedSongs) {
        persistMetingState(platform, id)
        startPrefetch(cachedEntry.songs)
      }
    } finally {
      loading.value = false
    }
  }

  const loadSongs = async () => {
    if (currentSource.value === MUSIC_SOURCE.METING) {
      await loadMetingSongs(metingConfig.value.platform, playlistId.value)
    } else {
      loadLocalSongs()
    }
  }

  const switchSource = async (source) => {
    currentSource.value = source
    localStorage.setItem('music_source', source)
    await loadSongs()
  }

  const updateMetingPlaylist = async (platform, id) => {
    currentSource.value = MUSIC_SOURCE.METING
    localStorage.setItem('music_source', MUSIC_SOURCE.METING)
    await loadMetingSongs(platform, id, { forceRefresh: true })
  }

  const setPlaylistId = (id) => {
    playlistId.value = id
    localStorage.setItem('playlist_id', id)
  }

  const resetPlaylistId = () => {
    playlistId.value = DEFAULT_PLAYLIST_ID
    localStorage.setItem('playlist_id', DEFAULT_PLAYLIST_ID)
  }

  const setPlatform = (p) => {
    platform.value = p
    localStorage.setItem('music_platform', p)
  }

  const applyCustomPlaylist = async (p, id) => {
    setPlatform(p)
    setPlaylistId(id)
    currentSource.value = MUSIC_SOURCE.METING
    localStorage.setItem('music_source', MUSIC_SOURCE.METING)
    await loadMetingSongs(p, id, { forceRefresh: true })
  }

  const resetToLocal = async () => {
    currentSource.value = MUSIC_SOURCE.METING
    localStorage.setItem('music_source', MUSIC_SOURCE.METING)
    setPlatform('netease')
    resetPlaylistId()
    await loadMetingSongs('netease', DEFAULT_PLAYLIST_ID, { forceRefresh: true })
  }

  return {
    songs,
    loading,
    currentSource,
    metingConfig,
    playlistId,
    platform,
    loadSongs,
    switchSource,
    updateMetingPlaylist,
    setPlaylistId,
    resetPlaylistId,
    setPlatform,
    applyCustomPlaylist,
    resetToLocal,
    DEFAULT_PLAYLIST_ID,
    PLATFORMS,
    MUSIC_SOURCE
  }
}
