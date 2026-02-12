# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Study with Miku — 初音未来主题番茄钟 Web 应用，支持 PWA、云端数据同步、WebAuthn/OAuth 认证、音乐播放（APlayer/Spotify）。

- 前端：Vue 3 + Vite + Composition API（纯 JavaScript，无 TypeScript）
- 后端：Hono.js on Cloudflare Workers + D1 SQLite（Drizzle ORM）+ Durable Objects
- 包管理器：Bun
- 共享代码：`shared/` 目录（CBOR 编解码）

## 常用命令

```bash
# 开发
bun run dev              # 启动前端开发服务器 (localhost:3000)
bun run dev:worker       # 构建前端 + 启动 Worker 本地开发

# 构建
bun run build            # 完整构建（生成图标 + Vite 构建 + 复制资源）

# 测试
bun run test             # 单元 + 集成测试（Vitest，排除 API 测试）
bun run test:api         # 后端 API 集成测试
bun run test:e2e         # E2E 测试（Playwright，需先启动 dev server）
bun run test:all         # 全部测试 + 覆盖率
bunx vitest run tests/unit/composables/focus/useTimer.spec.js  # 运行单个测试文件

# 代码质量
bun run lint             # ESLint 检查 + 自动修复
bun run lint:check       # ESLint 仅检查
bun run format           # Prettier 格式化
bun run format:check     # Prettier 仅检查

# 数据库
bun run db:generate      # 生成 Drizzle 迁移
bun run db:push          # 推送 schema 到数据库
```

## 代码风格

- 无分号、单引号、无尾逗号、2 空格缩进、100 字符行宽
- 提交规范：约定式提交（Conventional Commits），类型包括 feat/fix/docs/style/refactor/perf/test/chore/revert/build
- 提交时不要带 AI 的 Co-authored-by 信息
- Husky + lint-staged 在提交前自动执行 ESLint 和 Prettier

## 架构

### 前端 (`src/`)

状态管理采用 Vue 3 Composables（无 Vuex/Pinia），关键 composable 均为单例模式：

- `composables/useAuth.js` — 认证状态、Token 刷新调度
- `composables/useDataSync.js` — 云端数据同步、离线队列、冲突解决
- `composables/useFocus.js` — 番茄钟会话管理，内部拆分为 `focus/useSession`、`useTimer`、`useStats`、`useRecords`、`useSyncEngine`
- `composables/useMusic.js` + `usePlayer.js` — 音乐播放，通过 `player/PlayerAdapter.js` 抽象不同播放源

数据流：本地优先（localStorage）→ 认证后自动云端同步 → 版本号冲突检测 → CBOR 二进制编码传输

`services/` 目录为 API 客户端层，`utils/` 为工具函数。

### 后端 (`workers/`)

Hono.js 路由结构：
- `routes/auth.js` — WebAuthn 注册/登录、设备管理、Token 刷新
- `routes/oauth.js` — GitHub/Google/Microsoft OAuth
- `routes/data.js` — 用户数据同步（支持 JSON 和 CBOR）

中间件链：envDefaults → securityHeaders → CORS → rateLimit → requireAuth（JWT 验证）

Durable Objects：
- `OnlineCounter` — 实时在线人数（WebSocket）
- `AuthChallenge` — WebAuthn challenge 存储（防重放）

数据库 schema 定义在 `workers/db/schema.js`（Drizzle ORM），请求验证使用 Zod（`workers/schemas/`）。

### 测试结构

- `tests/unit/` — 组件和 composable 单元测试（Vitest + happy-dom）
- `tests/integration/` — 前端集成测试 + `api/` 子目录下的后端 API 测试
- `tests/e2e/` — Playwright E2E 测试（Chromium + Firefox）
- Mock 使用 MSW（Mock Service Worker）
- 覆盖率阈值：行/函数 60%，分支 50%
