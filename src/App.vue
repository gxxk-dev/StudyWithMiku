<template>
  <div class="app-container" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <video 
      ref="videoRef" 
      class="video-background" 
      :src="currentVideo" 
      autoplay 
      muted 
      loop
      @loadeddata="onVideoLoaded"
    ></video>
    <div class="overlay"></div>
    <div class="content" :class="{ hidden: !showControls }">
      <h1 class="title">Study with Miku</h1>
      <p class="subtitle">Love by SHSHOUSE</p>
    </div>
    <button class="fullscreen-btn" @click="toggleFullscreen" :class="{ hidden: !showControls }">
      {{ isFullscreen ? '退出全屏' : '全屏' }}
    </button>
    
    <!-- APlayer 播放器 -->
    <div id="aplayer" class="aplayer-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useFullscreen } from '@vueuse/core'
import { getAllSongs } from './data/songs.js'

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const showControls = ref(true)
const inactivityTimer = ref(null)

const onMouseMove = () => {
  showControls.value = true
  document.body.style.cursor = 'default'
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
  }
  inactivityTimer.value = setTimeout(() => {
    showControls.value = false
    document.body.style.cursor = 'none'
  }, 3000)
}

const onMouseLeave = () => {
  showControls.value = false
  document.body.style.cursor = 'none'
}

const videoRef = ref(null)
const videos = [
  './mp4/1.mp4',
  './mp4/2.mp4'
]
const currentVideo = ref(videos[0])

// APlayer 相关变量
const aplayer = ref(null)
const aplayerInitialized = ref(false)

// 获取所有歌曲列表
const getAllSongsForAPlayer = () => {
  const allSongs = getAllSongs()
  
  return allSongs.map(song => ({
    name: song.title,
    artist: song.artist,
    url: song.src,
    cover: ''
  }))
}

const onVideoLoaded = () => {
  console.log('视频加载完成')
}

// 监听显示/隐藏状态变化
watch(showControls, (newValue) => {
  if (aplayer.value && aplayerInitialized.value) {
    const playerElement = document.getElementById('aplayer')
    if (playerElement) {
      if (newValue) {
        // 显示播放器
        playerElement.style.opacity = '1'
        playerElement.style.pointerEvents = 'auto'
      } else {
        // 隐藏播放器
        playerElement.style.opacity = '0'
        playerElement.style.pointerEvents = 'none'
      }
    }
  }
})

onMounted(() => {
  // 动态加载 APlayer CSS 和 JS
  const loadAPlayer = () => {
    // 检查是否已加载
    if (window.APlayer) {
      initAPlayer()
      return
    }
    
    // 加载 CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = './APlayer.min.css'
    document.head.appendChild(link)
    
    // 加载 JS
    const script = document.createElement('script')
    script.src = './APlayer.min.js'
    script.onload = () => {
      initAPlayer()
    }
    document.head.appendChild(script)
  }
  
  // 初始化 APlayer
  const initAPlayer = () => {
    const songs = getAllSongsForAPlayer()
    
    aplayer.value = new APlayer({
      container: document.getElementById('aplayer'),
      fixed: true,
      autoplay: true,
      audio: songs,
      lrcType: 0,
      theme: '#2980b9',
      loop: 'all',
      order: 'list',
      preload: 'auto',
      volume: 0.7,
      mutex: true,
      listFolded: false,
      listMaxHeight: '90px'
    })
    
    // 设置播放器样式
    const playerElement = document.getElementById('aplayer')
    if (playerElement) {
      playerElement.style.position = 'fixed'
      playerElement.style.bottom = '20px'
      playerElement.style.left = '20px'
      playerElement.style.zIndex = '1000'
      playerElement.style.width = '300px'
      playerElement.style.maxWidth = '400px'
      playerElement.style.transition = 'opacity 0.3s ease'
      playerElement.style.opacity = '1'
      playerElement.style.pointerEvents = 'auto'
    }
    aplayerInitialized.value = true
  }
  setTimeout(() => {
    loadAPlayer()
  }, 500)
})

onUnmounted(() => {
  if (aplayer.value) {
    aplayer.value.destroy()
  }
})
</script>

<style scoped>
.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 3;
  transition: opacity 0.3s ease;
}

.content.hidden {
  opacity: 0;
  pointer-events: none;
}

.title {
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.subtitle {
  font-size: 1.2rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.fullscreen-btn.hidden {
  opacity: 0;
  pointer-events: none;
}

.aplayer-container {
  transition: opacity 0.3s ease;
}

.aplayer-container.hidden {
  opacity: 0;
  pointer-events: none;
}

.album-selector {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  transition: opacity 0.3s ease;
}

.album-selector.hidden {
  opacity: 0;
  pointer-events: none;
}

.album-selector select {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 12px;
  border-radius: 5px;
  font-size: 14px;
}

.album-selector select option {
  background: #333;
  color: white;
}
</style>