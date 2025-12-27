import { ref } from 'vue'
import { fetchPlaylist, getStoredConfig, saveConfig, DEFAULT_PLAYLIST_ID, getCachedPlaylist, cachePlaylist } from '../services/meting.js'
import { prefetchPlaylistAudios } from '../utils/audioPrefetch.js'

const songs = ref([])
const loading = ref(false)
const metingConfig = ref(getStoredConfig())
const playlistId = ref(localStorage.getItem('playlist_id') || DEFAULT_PLAYLIST_ID)
const platform = ref(localStorage.getItem('music_platform') || 'netease')

const PLATFORMS = [
  { value: 'netease', label: '网易云' },
  { value: 'tencent', label: 'QQ音乐' }
]

export const useMusic = () => {
  const persistMetingState = (platform, id) => {
    saveConfig(platform, id)
    metingConfig.value = { platform, id }
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
    await loadMetingSongs(metingConfig.value.platform, playlistId.value)
  }

  const updateMetingPlaylist = async (platform, id) => {
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
    await loadMetingSongs(p, id, { forceRefresh: true })
  }

  const resetToDefault = async () => {
    setPlatform('netease')
    resetPlaylistId()
    await loadMetingSongs('netease', DEFAULT_PLAYLIST_ID, { forceRefresh: true })
  }

  return {
    songs,
    loading,
    metingConfig,
    playlistId,
    platform,
    loadSongs,
    updateMetingPlaylist,
    setPlaylistId,
    resetPlaylistId,
    setPlatform,
    applyCustomPlaylist,
    resetToDefault,
    DEFAULT_PLAYLIST_ID,
    PLATFORMS
  }
}
