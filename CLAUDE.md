# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Study with Miku - 一个「Study with Miku」企划主题的番茄钟应用，让 Miku 陪伴学习。

## 常用命令

```bash
# 开发
npm run dev              # 启动 Vite 开发服务器 (端口 3000)
npm run dev:worker       # 构建并启动本地 Cloudflare Worker

# 构建
npm run build            # 生成图标 + Vite 构建 + 复制静态资源

# 部署
npm run deploy:worker    # 部署到 Cloudflare Workers
```

## 架构

### 前端 (Vue 3 + Vite)

- `src/App.vue` - 主应用：视频背景、APlayer 音乐播放器、全屏控制
- `src/components/PomodoroTimer.vue` - 番茄钟组件：计时器、设置面板(番茄钟/歌单/缓存)、服务器选择
- `src/composables/` - Vue Composables
  - `useMusic.js` - 音乐源管理，支持本地歌曲和 Meting API (网易云/QQ音乐等)
  - `usePomodoro.js` - 番茄钟核心逻辑：计时、状态管理、通知
  - `useOnlineCount.js` - WebSocket 在线人数
  - `useServerConfig.js` - 计数服务器配置
  - `useCache.js` - 缓存管理 (Service Worker/localStorage/内存)
  - `usePWA.js` - PWA 安装和更新提示
  - `usePlaylistDetection.js` - 歌单 URL 检测和解析
- `src/config/` - 配置文件
  - `constants.js` - 统一常量配置（缓存名称、API配置、存储键、重连策略等）
- `src/services/` - 服务层
  - `meting.js` - Meting API 封装，获取歌单
  - `spotify.js` - Spotify 歌单 ID 管理和解析
- `src/utils/` - 工具函数
  - `eventBus.js` - 事件总线，管理 APlayer 实例和 UI 交互状态
  - `userSettings.js` - 用户设置持久化 (番茄钟时长、视频/音乐索引)
  - `cache.js` - 资源加载和预加载
  - `audioPrefetch.js` - 音频预加载和缓存管理
  - `storage.js` - localStorage 安全封装，提供容错机制
  - `pwaDetector.js` - PWA 模式检测 (独立窗口/浏览器标签页)
  - `swCallback.js` - Service Worker 更新回调处理
- `src/styles/` - 样式文件
  - `common.scss` - 全局公共样式和 Vue 过渡动画定义
  - `pomodoro.scss` - 番茄钟组件专用样式

### 后端 (Cloudflare Workers + Durable Objects)

- `workers/index.js` - Hono 路由入口
  - `GET /ws` - WebSocket 连接
  - `GET /count` - 获取在线人数
- `workers/online-counter.js` - Durable Object 实现在线计数
- `workers/middleware/cors.js` - CORS 中间件
- `workers/services/counter.js` - Counter 服务封装
- `wrangler.toml` - Worker 配置，包含 Durable Objects 绑定

### PWA

- `vite.config.js` 中配置 VitePWA 插件
- Service Worker 缓存策略：视频/音频 CacheFirst，API NetworkFirst
- 支持离线使用

## 图标使用规范

**本项目使用 Iconify 作为统一的图标解决方案**，禁止使用 Unicode emoji 或硬编码 SVG。

### 使用方式

```vue
<script setup>
import { Icon } from '@iconify/vue'
</script>

<template>
  <!-- 基础用法 -->
  <Icon icon="mdi:play" />

  <!-- 指定尺寸 -->
  <Icon icon="lucide:settings" width="20" height="20" />

  <!-- 内联文本 -->
  <Icon icon="ph:timer" inline />
</template>
```

### 推荐图标集

- **MDI (Material Design Icons)**: `mdi:*` - 最全面，适合功能按钮
- **Lucide**: `lucide:*` - 现代简洁，适合 UI 导航
- **Phosphor**: `ph:*` - 优雅轻量，适合装饰性图标

### 常用图标映射

| 功能 | Iconify 图标 | ❌ 禁止使用 |
|------|-------------|-----------|
| 播放 | `mdi:play` | ▶ |
| 暂停 | `mdi:pause` | ⏸ |
| 设置 | `lucide:settings` | ⚙️ |
| 音乐 | `lucide:music` | 🎵 |
| 统计 | `lucide:bar-chart-3` | 📊 |
| 关闭 | `mdi:close` | × |

### 特殊情况

- **功能性 SVG**（如进度圆环、动态图表）可保留硬编码 SVG
- **所有装饰性图标**必须使用 Iconify

### 技术优势

- ✅ PWA 离线支持（图标内联到 bundle）
- ✅ 视觉一致性（统一的线性图标风格）
- ✅ 跨平台一致性（避免 emoji 在不同系统显示差异）
- ✅ 易于维护（更换图标只需改字符串）

## 工作流程

- GitHub Flow
- 提交规范：约定式提交 (Conventional Commits)
