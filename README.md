<p align="center"><b><a href="https://github.com/shshouse/StudyWithMiku">上游仓库</a> / <a href="https://github.com/gxxk-dev/StudyWithMiku/wiki">Wiki</a> / <a href="https://swm.frez79.io">快速体验</a> / <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/gxxk-dev/StudyWithMiku.git">自行部署</a> / <a href="https://www.bilibili.com/video/BV18TSWBzE4o">介绍视频</a></b></p>

> [!IMPORTANT]
> **本仓库正在进行大规模重构，目前处于不稳定状态。**
>
> 如需正常使用，请前往上游仓库：
> - 源码：[github.com/shshouse/StudyWithMiku](https://github.com/shshouse/StudyWithMiku/)
> - 在线体验：[study.mikugame.icu](https://study.mikugame.icu/)
>
> 重构期间，已完成开发的模块可通过浏览器 DevTools 或 vConsole 中调用 `swm_dev` 对象进行预览和测试。

# Study with Miku

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/gxxk-dev/StudyWithMiku/pulls)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3(or--later)-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)


一个 **「Study with Miku」** 企划主题的番茄钟应用！让Miku陪你一起学习吧～

<img width="2488" height="1232" alt="image" src="https://github.com/user-attachments/assets/127cdf3d-3832-426d-be46-7fedfce47447" />

## 技术栈

- 前端：Vite / Vue / APlayer
- 后端：Hono.js / Cloudflare Worker(含Durable Object)

## 快速参与开发

- **工作流程**：[GitHub Flow](https://docs.github.com/zh/get-started/using-github/github-flow)(仅在多人协作/大型工程时使用)
- **提交规范**：[约定式提交](https://www.conventionalcommits.org/zh-hans/)

### 对于vibe coding用户

请在commit时尽量不要带上非人类用户的Co-authored-by信息，并使用本仓库提供的 `CLAUDE.md`/`AGENTS.md`文件以确保编码风格的统一。