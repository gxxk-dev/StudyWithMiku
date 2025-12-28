import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const buildMeta = (() => {
  const pad = (value) => value.toString().padStart(2, '0')
  const now = new Date()
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  const seconds = pad(now.getSeconds())
  return {
    version: `${year}${month}${day}`,
    fullTime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(buildMeta.version),
    __BUILD_TIME__: JSON.stringify(buildMeta.fullTime)
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'APlayer.min.js',
        'APlayer.min.css',
        'BreakOrWork.mp3',
        '123.webp',
        '4.webp',
        '1.mp4',
        '2.mp4',
        '3.mp4'
      ],
      manifest: {
        name: 'Study with Miku',
        short_name: 'Study with Miku',
        description:
          '和初音未来一起学习吧！沉浸式学习陪伴网站，提供番茄钟、背景音乐播放等功能，让学习更有趣。',
        theme_color: '#39c5bb',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        categories: ['education', 'productivity', 'entertainment']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,mp3}'],
        runtimeCaching: [
          {
            urlPattern: /\.(mp4|webm|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'video-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          },
          {
            urlPattern: /^https:\/\/studycdn\.mikugame\.icu\/mp4\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-video-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          },
          {
            urlPattern: /\.(webp|png|jpg|jpeg|svg|gif|woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-font-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /\.(mp3|wav|m4a)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          },
          {
            urlPattern: /^https:\/\/api\.injahow\.cn\/meting\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 2 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/.*(\.mp3|\.m4a|music\.126\.net|qq\.com).*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'streaming-music-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          }
        ],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false, 
        type: 'module'
      }
    })
  ],
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: { output: { manualChunks: undefined } }
  },
  server: { port: 3000 },
  publicDir: 'public',
  assetsInclude: ['**/*.mp4', '**/*.webm', '**/*.ogg'],
  optimizeDeps: { include: ['vue'] }
})
