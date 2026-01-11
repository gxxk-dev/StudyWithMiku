const cache = {
  videos: new Map(),
  audios: new Map()
}

export const getVideo = (src) => {
  return new Promise((resolve, reject) => {
    if (cache.videos.has(src)) {
      resolve(cache.videos.get(src))
      return
    }

    const video = document.createElement('video')
    video.src = src
    video.preload = 'auto'
    video.onloadeddata = () => {
      cache.videos.set(src, video)
      resolve(video)
    }
    video.onerror = () => {
      const errorMsg = video.error
        ? `Code ${video.error.code}: ${video.error.message}`
        : 'Unknown error'
      reject(new Error(`Failed to load video: ${src} - ${errorMsg}`))
    }
  })
}

export const preloadVideos = (urls) => {
  return Promise.allSettled(urls.map((url) => getVideo(url))).then((results) => {
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      console.warn(`${failed.length}/${urls.length} videos failed to load`)
    }
    return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
  })
}

export const clearCache = (type) => {
  if (cache[type]) {
    if (type === 'videos' || type === 'audios') {
      cache[type].forEach((media) => {
        if (media && typeof media.remove === 'function') {
          media.remove()
        }
      })
      cache[type].clear()
    } else {
      cache[type].clear()
    }
  }
}
export const clearAllCache = () => {
  Object.keys(cache).forEach((type) => clearCache(type))
}

export { cache }
