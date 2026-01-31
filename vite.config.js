import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { CACHE_NAMES } from './src/config/constants.js'
import Icons from 'unplugin-icons/vite'
import jsdocHelpExtractor from './scripts/jsdoc-help-extractor.js'
import { execSync } from 'node:child_process'
import { version } from './package.json'

const buildMeta = (() => {
  const pad = (value) => value.toString().padStart(2, '0')
  const now = new Date()
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  const seconds = pad(now.getSeconds())

  let dirty = false
  try {
    execSync('git diff --quiet HEAD', { stdio: 'ignore' })
  } catch {
    dirty = true
  }

  return {
    version: dirty ? `${version}-dirty` : version,
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
    Icons({
      compiler: 'vue3',
      autoInstall: true
    }),
    jsdocHelpExtractor(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
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
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['education', 'productivity', 'entertainment']
      },
      workbox: {
        // 预缓存策略：仅包含核心静态资源（JS/CSS/HTML/图片）
        // 注意：视频和音频文件体积大，不适合预缓存，应使用 runtimeCaching 按需缓存
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          // 本地视频文件缓存（背景视频）
          // CacheFirst: 优先使用缓存，提升加载速度
          // rangeRequests: 支持视频 Range 请求（拖动进度条）
          {
            urlPattern: /\.(mp4|webm|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: CACHE_NAMES.VIDEO,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 10个视频，30天
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          },
          // R2 存储的视频文件（CDN 加速）
          {
            urlPattern: /^https:\/\/assets\.frez79\.io\/mp4\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: CACHE_NAMES.R2_VIDEO,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 5个视频，30天
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          },
          // 图片和字体文件缓存
          {
            urlPattern: /\.(webp|png|jpg|jpeg|svg|gif|woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: CACHE_NAMES.IMAGE_FONT,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } // 60个资源，30天
            }
          },
          // 本地音频文件缓存（如果有本地 MP3）
          // 注意：此规则主要用于本地音频文件，在线音乐流使用下方的 streaming-music-cache
          {
            urlPattern: /\.(mp3|wav|m4a)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: CACHE_NAMES.AUDIO,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30首歌，30天
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          },
          // Meting API 缓存（歌单接口）
          // NetworkFirst: 优先使用网络，保证数据新鲜度；网络失败时使用缓存
          {
            urlPattern: /^https:\/\/api\.injahow\.cn\/meting\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: CACHE_NAMES.API,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 2 }, // 50个接口响应，2小时
              networkTimeoutSeconds: 5, // 网络超时 5 秒后降级到缓存
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // 在线音乐流缓存（网易云音乐、QQ音乐等）
          // 这是主要的音乐缓存策略，用于缓存从音乐平台获取的流媒体
          {
            urlPattern: /^https:\/\/.*(\.mp3|\.m4a|music\.126\.net|qq\.com).*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: CACHE_NAMES.STREAMING_MUSIC,
              // 缓存策略说明：
              // - maxEntries: 50 首歌（假设平均 5MB/首，总共约 250MB）
              // - maxAgeSeconds: 7 天（常听的歌保留，不常听的会被淘汰）
              // - 配合下方 maximumFileSizeToCacheInBytes (50MB) 限制单文件大小
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          }
        ],
        // 单个文件缓存大小限制：50MB
        // 说明：主要用于限制视频和音频文件的缓存大小
        // - 高质量 MP3: 通常 3-8MB
        // - 短视频片段: 通常 10-30MB
        // - 超过此限制的文件不会被缓存（避免占用过多存储空间）
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        cleanupOutdatedCaches: true, // 自动清理旧版本缓存
        skipWaiting: true, // SW 更新后立即激活
        clientsClaim: true // SW 激活后立即控制所有页面
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue'],
          aplayer: ['aplayer']
        }
      }
    }
  },
  server: { port: 3000 },
  publicDir: 'public',
  assetsInclude: ['**/*.mp4', '**/*.webm', '**/*.ogg'],
  optimizeDeps: {
    include: ['vue'],
    esbuildOptions: {
      sourcemap: false
    }
  }
})
