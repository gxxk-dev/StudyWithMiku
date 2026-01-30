# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Study with Miku - 一个「Study with Miku」企划主题的番茄钟应用，让 Miku 陪伴学习。

## 常用命令

```bash
# 开发
bun run dev              # 启动 Vite 开发服务器 (端口 3000)
bun run dev:worker       # 构建并启动本地 Cloudflare Worker

# 构建
bun run build            # 生成图标 + Vite 构建 + 复制静态资源

# 部署
bun run deploy:worker    # 部署到 Cloudflare Workers

# 代码质量
bun run lint             # ESLint 检查并自动修复
bun run format           # Prettier 格式化代码

# 测试
bun run test             # 运行单元和集成测试
bun run test:watch       # 监听模式
bun run test:coverage    # 带覆盖率报告
bun run test:e2e         # 运行 E2E 测试
bun run test:e2e:ui      # E2E 测试 UI 模式
bun run test:all         # 运行全部测试
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
  - `useFocus.js` - 番茄钟系统统一入口 (Facade)
  - `focus/` - 番茄钟系统模块
    - `constants.js` - 状态枚举、默认配置、存储键
    - `useTimer.js` - 纯计时器（时间戳差值计算，解决后台节流）
    - `useRecords.js` - 记录 CRUD + 查询方法
    - `useSession.js` - 状态机 + 中断恢复
    - `useStats.js` - 统计计算 + 热力图数据
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
  - `exportUtils.js` - 数据导出工具 (JSON/CSV/Markdown)
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

### 测试 (Vitest + Playwright)

- `vitest.config.js` - Vitest 配置，使用 happy-dom 环境
- `playwright.config.js` - Playwright E2E 测试配置
- `tests/setup/vitest.setup.js` - 全局 mock (localStorage, OPFS, Cache API 等)
- `tests/setup/fixtures/` - 测试数据 (歌曲、歌单、番茄钟记录)
- `tests/unit/` - 单元测试
  - `services/` - 服务层测试 (meting, spotify, localAudioStorage 等)
  - `composables/` - Composables 测试 (useMusic, useCache, usePWA 等)
  - `composables/focus/` - Focus 模块测试 (useTimer, useRecords, useSession, useStats)
  - `utils/` - 工具函数测试
- `tests/integration/` - 集成测试 (歌单流程、缓存流程)
- `tests/e2e/` - E2E 测试 (应用冒烟测试)

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

## 常量管理规范

**所有常量必须写到统一的位置**，禁止在组件或工具函数中硬编码魔法值。

### 存放位置

| 常量类型 | 存放位置 | 示例 |
|---------|---------|------|
| 全局常量 | `src/config/constants.js` | 缓存名称、API 配置、localStorage 键名、重连策略 |
| 模块专用常量 | 模块内 `constants.js` | `src/composables/focus/constants.js` (番茄钟状态枚举、默认配置) |

### 规范要求

- **禁止硬编码**：不要在代码中直接写字符串或数字，应从常量文件导入
- **统一前缀**：localStorage 键名使用 `swm_` 前缀，在 `src/config/constants.js` 的 `STORAGE_KEYS` 中定义
- **语义命名**：常量名应清晰表达用途，使用大写蛇形命名 (UPPER_SNAKE_CASE)

### 示例

```javascript
// ❌ 错误：硬编码
localStorage.getItem('pomodoro_duration')

// ✅ 正确：使用常量
import { STORAGE_KEYS } from 'src/config/constants'
localStorage.getItem(STORAGE_KEYS.POMODORO_DURATION)
```

## UI 适配策略

**本项目仅支持横屏/移动端**，不需要也不会考虑手机端竖屏 UI。

- 所有布局和样式均基于横屏设计
- 不需要编写响应式断点适配竖屏
- 移动端用户应使用横屏模式访问

## 工作流程

- GitHub Flow
- 提交规范：约定式提交 (Conventional Commits)
  - 格式：`<type>(<scope>): <subject>`
  - 示例：`feat(icons): 使用 Iconify 替换硬编码图标`
- 代码规范：使用 ESLint + Prettier 自动格式化
- **提交前务必运行 `bun run lint` 检查代码**
- **提交前运行 `bun run test` 确保测试通过**
