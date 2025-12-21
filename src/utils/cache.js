const cache = {
  scripts: new Set(),
  styles: new Set(),
  videos: new Map(),
  audios: new Map()
}
const ALLOWED_SCRIPT_SOURCES = ['APlayer.min.js']

const isScriptSourceAllowed = (src) => {
  return ALLOWED_SCRIPT_SOURCES.some(allowed => src.includes(allowed))
}

export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (!isScriptSourceAllowed(src)) {
      reject(new Error(`Script source not allowed: ${src}`))
      return
    }

    if (cache.scripts.has(src)) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.onload = () => {
      cache.scripts.add(src)
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const ALLOWED_STYLE_SOURCES = ['APlayer.min.css']

const isStyleSourceAllowed = (href) => {
  return ALLOWED_STYLE_SOURCES.some(allowed => href.includes(allowed))
}

export const loadStyle = (href) => {
  return new Promise((resolve, reject) => {
    if (!isStyleSourceAllowed(href)) {
      reject(new Error(`Style source not allowed: ${href}`))
      return
    }

    if (cache.styles.has(href)) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => {
      cache.styles.add(href)
      resolve()
    }
    link.onerror = reject
    document.head.appendChild(link)
  })
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
    video.onerror = reject
  })
}

export const getAudio = (src) => {
  return new Promise((resolve, reject) => {
    if (cache.audios.has(src)) {
      resolve(cache.audios.get(src))
      return
    }

    const audio = document.createElement('audio')
    audio.src = src
    audio.preload = 'auto'
    audio.onloadeddata = () => {
      cache.audios.set(src, audio)
      resolve(audio)
    }
    audio.onerror = reject
  })
}
export const preloadVideos = (urls) => {
  return Promise.all(urls.map(url => getVideo(url)))
}
export const preloadAudios = (urls) => {
  return Promise.all(urls.map(url => getAudio(url)))
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
  Object.keys(cache).forEach(type => clearCache(type))
}

export { cache }
