const cache = {
  scripts: new Set(),
  styles: new Set(),
  videos: new Map(),
  audios: new Map()
}
const ALLOWED_SCRIPT_SOURCES = ['APlayer.min.js', 'vconsole.min.js']

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
    script.onerror = (event) => {
      reject(new Error(`Failed to load script: ${src}${event?.message ? ` - ${event.message}` : ''}`))
    }
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
    link.onerror = (event) => {
      reject(new Error(`Failed to load stylesheet: ${href}${event?.message ? ` - ${event.message}` : ''}`))
    }
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
    video.onerror = (event) => {
      const errorMsg = video.error ?
        `Code ${video.error.code}: ${video.error.message}` :
        'Unknown error'
      reject(new Error(`Failed to load video: ${src} - ${errorMsg}`))
    }
  })
}

export const preloadVideos = (urls) => {
  return Promise.allSettled(urls.map(url => getVideo(url)))
    .then(results => {
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length > 0) {
        console.warn(`${failed.length}/${urls.length} videos failed to load`)
      }
      return results.filter(r => r.status === 'fulfilled').map(r => r.value)
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
  Object.keys(cache).forEach(type => clearCache(type))
}

export { cache }
