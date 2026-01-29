<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePWA } from '../../../composables/usePWA.js'

const { isPWA, isOnline, appVersion, appBuildTime } = usePWA()

const browserInfo = ref('')

const getBrowserInfo = () => {
  const ua = navigator.userAgent
  let browserName = 'Unknown'
  let browserVersion = 'Unknown'

  if (ua.includes('Firefox/')) {
    browserName = 'Firefox'
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge'
    browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome'
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Safari/')) {
    browserName = 'Safari'
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown'
  }

  return `${browserName} ${browserVersion}`
}

const techStack = [
  { name: 'Vue 3', icon: 'mdi:vuejs' },
  { name: 'Vite', icon: 'mdi:lightning-bolt' },
  { name: 'Bun', icon: 'simple-icons:bun' },
  { name: 'PWA', icon: 'mdi:application' },
  { name: 'Cloudflare', icon: 'mdi:cloud' },
  { name: 'APlayer', icon: 'mdi:music-box' }
]

onMounted(() => {
  browserInfo.value = getBrowserInfo()
})
</script>

<template>
  <div class="tab-content">
    <!-- 版本信息 -->
    <div class="settings-section">
      <h3 class="section-title">Version Info</h3>
      <div class="info-list">
        <div class="info-item">
          <Icon icon="mdi:tag" width="16" height="16" />
          <span class="info-label">版本：</span>
          <span class="info-value">{{ appVersion }}</span>
        </div>
        <div class="info-item">
          <Icon icon="mdi:clock-outline" width="16" height="16" />
          <span class="info-label">构建时间：</span>
          <span class="info-value">{{ appBuildTime }}</span>
        </div>
        <div class="info-item">
          <Icon icon="mdi:web" width="16" height="16" />
          <span class="info-label">浏览器：</span>
          <span class="info-value">{{ browserInfo }}</span>
        </div>
        <div class="info-item">
          <Icon icon="mdi:application" width="16" height="16" />
          <span class="info-label">运行模式：</span>
          <span class="info-value">{{ isPWA ? 'PWA' : 'Web' }}</span>
        </div>
        <div class="info-item">
          <Icon icon="mdi:wifi" width="16" height="16" />
          <span class="info-label">网络状态：</span>
          <span class="info-value">{{ isOnline ? '在线' : '离线' }}</span>
        </div>
      </div>

      <h4 class="subsection-title">Tech Stack</h4>
      <div class="tech-stack">
        <div v-for="tech in techStack" :key="tech.name" class="tech-badge">
          <Icon :icon="tech.icon" width="16" height="16" />
          <span>{{ tech.name }}</span>
        </div>
      </div>
    </div>

    <!-- 贡献者 -->
    <div class="settings-section">
      <h3 class="section-title">Credits</h3>
      <div class="credits-text">
        <p>
          <strong>原作者：</strong>松灰酸shshouse
          <a
            href="https://github.com/shshouse"
            target="_blank"
            rel="noopener"
            class="github-link"
            title="访问 shshouse 的 GitHub"
          >
            <Icon icon="mdi:github" width="16" height="16" />
          </a>
        </p>
        <p>
          <strong>Fork 维护者：</strong>gxxk-dev
          <a
            href="https://github.com/gxxk-dev"
            target="_blank"
            rel="noopener"
            class="github-link"
            title="访问 gxxk-dev 的 GitHub"
          >
            <Icon icon="mdi:github" width="16" height="16" />
          </a>
        </p>
      </div>
      <div class="credits-text">
        <p><strong>初音ミク (Hatsune Miku)</strong> © Crypton Future Media, INC.</p>
        <p>本项目为粉丝作品，仅供学习交流使用。</p>
      </div>
    </div>

    <!-- 链接 -->
    <div class="settings-section">
      <h3 class="section-title">Links</h3>
      <div class="link-list">
        <a
          href="https://github.com/gxxk-dev/StudyWithMiku"
          target="_blank"
          rel="noopener"
          class="link-item"
        >
          <Icon icon="mdi:github" width="18" height="18" />
          <span>GitHub 仓库</span>
        </a>
        <a
          href="https://github.com/shshouse/StudyWithMiku"
          target="_blank"
          rel="noopener"
          class="link-item"
        >
          <Icon icon="mdi:source-fork" width="18" height="18" />
          <span>上游仓库</span>
        </a>
      </div>

      <h4 class="subsection-title">License</h4>
      <div class="credits-text">
        <p>
          <Icon icon="mdi:license" width="16" height="16" inline />
          GNU General Public License v3.0 or later
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 24px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.info-label {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  min-width: 100px;
}

.info-value {
  color: rgba(255, 255, 255, 0.6);
}

.subsection-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 16px 0 8px 0;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.tech-badge:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.credits-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 8px 0;
}

.credits-text strong {
  color: rgba(255, 255, 255, 0.85);
}

.credits-text p {
  margin: 4px 0;
}

.github-link {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
  vertical-align: middle;
}

.github-link:hover {
  color: #39c5bb;
  transform: scale(1.1);
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(57, 197, 187, 0.1);
  border: 1px solid rgba(57, 197, 187, 0.3);
  border-radius: 6px;
  color: #39c5bb;
  text-decoration: none;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  width: fit-content;
}

.link-item:hover {
  background: rgba(57, 197, 187, 0.2);
  border-color: rgba(57, 197, 187, 0.5);
  transform: translateX(4px);
}
</style>
