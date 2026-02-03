# Changelog

## [1.1.0](https://github.com/gxxk-dev/StudyWithMiku/compare/v1.0.0...v1.1.0) (2026-02-03)

各位好！学习辛苦了ww
这次主要追加了几个让学习流程更顺畅/易操作的特性！
主要是 **设置分享** 和 **一些小优化**！
希望大家能喜欢！

（使用过程中遇到任何觉得卡手/打断心流等影响学习的设计问题或bug欢迎**提交Issue**或炮轰**gxxk@duck.com**！）
（当然了，发在上游仓库也是可以的！我有空闲时间的话一定会看，并尽量跟进！）


<details>
<summary>有关新功能选题的碎碎念</summary>
emmmm留言板/聊天室的呼声似乎很大啊 mikumod/bilibili评论区下都有人提（

正在考虑要不要加

（主要是信息治理啥的很难搞，目前也没有什么低成本好用的防治方法）

（并且直接外挂（参考topurl.cn）虽然转移了风险，但是影响还是有的 难搞捏


此外之前翻到了一个点子：把status-pill啥的融入背景视频

这个工作量略大 未来个人项目要是做的比较完美了我会考虑试一试））

大概就是这样 挺纠结的其实（）

~~感觉这个项目快完结了说是（~~
</details>

---

（下方内容是对此次更新的完整总结，考虑到你圈受众并非人人都有高技术力，所以就折叠在这里啦）

<details>

<summary>自动生成的更新日志在此～</summary>

### ✨ 新功能

* **clipboard:** 支持检测应用 URL 并自动应用专注配置 ([ef25a78](https://github.com/gxxk-dev/StudyWithMiku/commit/ef25a78de93b64dbb1102cf18cb710fdbf1615ba))
* **focus:** 添加分享配置功能，支持将专注设置转为可分享 URL ([f0d890b](https://github.com/gxxk-dev/StudyWithMiku/commit/f0d890b59d2f5bd4034b17afd433a7bf6c514f1f))
* **focus:** 允许休息时间设为 0 以禁用休息阶段 ([28097ba](https://github.com/gxxk-dev/StudyWithMiku/commit/28097ba6dd514830e2c2084e1138b46e3a0bab4a))
* **focus:** 支持长按状态徽章跳过休息阶段 ([18cf128](https://github.com/gxxk-dev/StudyWithMiku/commit/18cf128121ed56580d93005dbcd01fa6f377d092))
* **migration:** 实现 localStorage 数据迁移机制 ([8986c9f](https://github.com/gxxk-dev/StudyWithMiku/commit/8986c9f07ca79ea047739f08c02174dda361aec7))
* **playlist:** 将内置默认歌单转为可管理的歌单项目 ([25e42bb](https://github.com/gxxk-dev/StudyWithMiku/commit/25e42bb866a0a21ae97c948737a4f26a009de961))
* **settings:** 在关于页面添加诊断信息 ([9e5f4c8](https://github.com/gxxk-dev/StudyWithMiku/commit/9e5f4c83007845cc4fbf4c36f5b361badd90118f))
* **toast:** 提升 z-index 并支持横屏提示时暂停计时 ([d496fcc](https://github.com/gxxk-dev/StudyWithMiku/commit/d496fccdbf4e88b1bfaf417b9a274a3b4d1e328d))

### 🐛 Bug 修复

* **video:** 禁用视频画中画功能 ([9d6b02f](https://github.com/gxxk-dev/StudyWithMiku/commit/9d6b02f718e8da9cae75f3aba801e6b293806d7a))

</details>

## 1.0.0 (2026-01-31)

大家好！我是gxxk-dev，shshouse/StudyWithMiku 的第一个正式二开上线啦！

这个版本相比上游做了非常大的改动，可以说是"大换血"级别的重构：

- **架构重写**：从单个大组件拆分成 40+ 个模块化组件
- **番茄钟系统**：全新的状态机架构，支持中断恢复、数据持久化
- **统计功能**：GitHub 风格热力图、学习趋势图、数据导出
- **音乐源增强**：支持 Spotify、本地音乐上传，支持自组歌单
- **同步上游**：选择性同步上游内容，完善用户体验
- **工程化**：引入完整测试覆盖、代码规范、依赖更新等内容

------

一些碎碎念：

作为一个开发者，能把自己喜欢的项目重构一遍并且上线，真的很开心

这份项目是我对各类标准框架，vibe coding工具的第一次实践与探索，接下来会尝试开发更大、更好的项目～
~~（当然了也有可能我的其他项目会因为学业压力胎死腹中，毕竟咱初三了，离中考啥的也不远了（（）~~

希望这个版本能给大家带来更好的学习体验，也希望 Miku 能继续陪伴你度过每一个专注的时刻

有问题或建议欢迎在 GitHub 提 Issue，这是一个 PR/Issue-welcomed 项目，期待大家的贡献～

请在悠闲的音乐里和 Miku 一起学习吧~

------

（由于这份更新日志包含了以前的内容，咱觉得不太美观，所以就放到这里啦）

<details>

<summary>自动生成的更新日志在此～</summary>

### ⚠ BREAKING CHANGES

* **settings:** 重构设置ui
* **timer:** 优化计时器状态保存实现

### ✨ 新功能

* 合并歌单/番茄钟页面 ([b23138b](https://github.com/gxxk-dev/StudyWithMiku/commit/b23138b61629d12dfd4b995e36567313b45e2fa2))
* 使计时状态持久化存储 ([2397c62](https://github.com/gxxk-dev/StudyWithMiku/commit/2397c62fdb548db255a8531c2e2e504f31b202db))
* 使status-badge被点击时可暂停计时 ([b7a418e](https://github.com/gxxk-dev/StudyWithMiku/commit/b7a418eab7944f1a1441fd736e7493406a687ad8))
* 添加 Media Session API 支持 ([fcbd97e](https://github.com/gxxk-dev/StudyWithMiku/commit/fcbd97e0c2758d149f928f69c5a9ede5debe2b38))
* 新增功能-切换计数服务器 ([fa316e5](https://github.com/gxxk-dev/StudyWithMiku/commit/fa316e5d5dda1b23dcce798271be1d3bebcb7c21))
* 新增手机竖屏旋转提示遮罩 ([219d9ad](https://github.com/gxxk-dev/StudyWithMiku/commit/219d9adc16b9a481bb131396601a776778bb8b30))
* 优化PWA体验并增添移动端调试工具 ([cc293ce](https://github.com/gxxk-dev/StudyWithMiku/commit/cc293ce67e7f56c9fb5f71e03bad0fc597f3d046))
* 在不支持beforeinstallprompt的设备上新增安装引导并修改少量布局 ([a770308](https://github.com/gxxk-dev/StudyWithMiku/commit/a770308d7e147c7507176857545dae50a549d107))
* 增添更好的PWA面板/缓存管理/安装引导 ([3746551](https://github.com/gxxk-dev/StudyWithMiku/commit/3746551ce114f17affe79be356a855313848494f))
* **app:** 集成状态胶囊和设置面板 ([6f7eaf0](https://github.com/gxxk-dev/StudyWithMiku/commit/6f7eaf0d142b2f2f76ff13d99f675c95a40aba18))
* **build:** 支持通过环境变量配置站点 URL ([3ec6f26](https://github.com/gxxk-dev/StudyWithMiku/commit/3ec6f2603cdf23fc6b00b9ccd95d939fb13b31ea))
* **changelog:** 添加更新日志展示和自动化发布工具链 ([31dcd06](https://github.com/gxxk-dev/StudyWithMiku/commit/31dcd06657a6a1e70fe717c123b27db79107431e))
* **config:** 添加 UI_CONFIG 和 AUDIO_CONFIG 常量 ([c3c84e0](https://github.com/gxxk-dev/StudyWithMiku/commit/c3c84e0b03e30a70b1b6661690fb89af7d06465d))
* **config:** 添加运行时配置服务 ([abc6b95](https://github.com/gxxk-dev/StudyWithMiku/commit/abc6b9594b875b900f5485d86338c7b47a2becac))
* **dev:** 帮助系统添加颜色模式开关 ([88ffe74](https://github.com/gxxk-dev/StudyWithMiku/commit/88ffe74affa82e2e69867246fd5885a780e23487))
* **dev:** 暴露 runtimeConfigService 到 swm_dev.config ([e2298bb](https://github.com/gxxk-dev/StudyWithMiku/commit/e2298bbbab1d20aaf307c2ce615c5df81daece9e))
* **dev:** 添加开发者控制台 swm_dev ([8cd3278](https://github.com/gxxk-dev/StudyWithMiku/commit/8cd3278a141a3f0eae76a758bf0b40135c75590e))
* **dev:** 添加开发者控制台帮助系统 ([bc15c88](https://github.com/gxxk-dev/StudyWithMiku/commit/bc15c88485111cd54d4e65ccc571dc975d5278cc))
* **focus:** 实现 useFocus 番茄钟系统 ([3cd6a39](https://github.com/gxxk-dev/StudyWithMiku/commit/3cd6a39aee355d6ae10d1bd520d32c19700c022d))
* **focus:** 实现专注概览弹窗的圆环计时器和快速控制 ([92eb5b3](https://github.com/gxxk-dev/StudyWithMiku/commit/92eb5b3b2e57419124ce36b8099ec2cd5f365853))
* **focus:** 实现专注设置页面完整 UI ([0e5ac51](https://github.com/gxxk-dev/StudyWithMiku/commit/0e5ac510ff5c641e0c6134975fdeba4443ca7b37))
* **media:** 重构媒体设置，添加视频控制功能 ([272b7d4](https://github.com/gxxk-dev/StudyWithMiku/commit/272b7d4e66b4e84292f2749ba0c4a1976186b7a5))
* **player:** 实现统一播放器适配器架构 ([41a3934](https://github.com/gxxk-dev/StudyWithMiku/commit/41a393483493d1bd34656915ee8856c856133c36))
* **playlist:** 实现歌单管理系统 API 层 ([e4a1cb6](https://github.com/gxxk-dev/StudyWithMiku/commit/e4a1cb6901f180a0ed54f4042a4057d20b5c9fe4))
* **responsive:** 实现完整的横屏适配支持 ([fc99cf9](https://github.com/gxxk-dev/StudyWithMiku/commit/fc99cf96e3bb4a9fdc526692c09ec0a245b1983f))
* **services:** 添加在线服务器连接服务 ([2a11049](https://github.com/gxxk-dev/StudyWithMiku/commit/2a1104964eb4e8d172f2aacc4a2ccc2a9ad2ef88))
* **settings:** 实现关于页面并完善设置面板 ([f1a83c2](https://github.com/gxxk-dev/StudyWithMiku/commit/f1a83c2dec31071770821852bd7098e0615e6827))
* **settings:** 添加设置面板组件 ([e57b095](https://github.com/gxxk-dev/StudyWithMiku/commit/e57b095b7d83b0e8d35115c83090c120f81e679a))
* **share:** 实现可定制分享卡片功能 ([9dd44af](https://github.com/gxxk-dev/StudyWithMiku/commit/9dd44af1497d404d10770dedb4d25e533b12d3f0))
* Spotify支持 ([49108c7](https://github.com/gxxk-dev/StudyWithMiku/commit/49108c7a5058f86283e791be68c670ec5a26314f))
* **stats:** 实现完整统计页面 ([97b85fa](https://github.com/gxxk-dev/StudyWithMiku/commit/97b85fa594884b5ceaba210f40e17f9c9916c733))
* **status-badge:** 规范化快速暂停功能 ([349e182](https://github.com/gxxk-dev/StudyWithMiku/commit/349e182b078e13f99528c93037b7e511df60b703))
* **toast:** 实现 Toast 通知组件 ([b033307](https://github.com/gxxk-dev/StudyWithMiku/commit/b033307c99f6eb2e87e627b1c867d9011b17b58f))
* **toast:** 添加确认对话框功能 ([6c90493](https://github.com/gxxk-dev/StudyWithMiku/commit/6c90493f0b374ec6d88a33902439e133b8fc00ad))
* **toast:** 重构为 KDE 风格堆叠通知系统 ([63636c7](https://github.com/gxxk-dev/StudyWithMiku/commit/63636c709157853feac754cb26b0549747fe91ce))
* **ui:** 添加顶部状态胶囊组件 ([0749ca4](https://github.com/gxxk-dev/StudyWithMiku/commit/0749ca4c1a0f3098aa3faef0fa86d4bffcd87ff3))
* **ui:** 添加专注概览弹窗和状态胶囊交互优化 ([f8f579e](https://github.com/gxxk-dev/StudyWithMiku/commit/f8f579ef3135056e65f64acfceafcda09eaaae36))
* **url-params:** 实现从 URL 参数设定专注配置 ([ae05ab0](https://github.com/gxxk-dev/StudyWithMiku/commit/ae05ab079b37dca1bc65fb52d2c9f78d5528ee90)), closes [#4](https://github.com/gxxk-dev/StudyWithMiku/issues/4)
* **url-params:** 添加专注配置 URL 参数支持 ([84baa75](https://github.com/gxxk-dev/StudyWithMiku/commit/84baa7536bbcc93a1f6233b8f30f552955357d23))

### 🐛 Bug 修复

* 修复内存缓存统计访问不存在属性的错误 ([ccf2267](https://github.com/gxxk-dev/StudyWithMiku/commit/ccf2267c835597433d66423194073ba101438803))
* **audio:** getAudioDuration 添加超时和清理机制 ([0fc7d1f](https://github.com/gxxk-dev/StudyWithMiku/commit/0fc7d1f5b67ebb2d53c85a680d87646dec0e7689))
* **lint:** 修复所有 ESLint 错误和警告并格式化代码 ([271c504](https://github.com/gxxk-dev/StudyWithMiku/commit/271c504fff96cc2cbe14a869a9a5179111f86d05))
* **sw-bust:** 修复sw-bust不可用的bug并修改若干杂项 ([5f8a69a](https://github.com/gxxk-dev/StudyWithMiku/commit/5f8a69a20a1d1ec326bd5beb6b264007086e1036))
* **test:** 修复 StatsCards 测试与组件实现不一致 ([b9ed6c7](https://github.com/gxxk-dev/StudyWithMiku/commit/b9ed6c700d4bdff04b0dba73a03e00f71bd005a3))
* **test:** 修复测试与实现不一致的问题 ([05bd187](https://github.com/gxxk-dev/StudyWithMiku/commit/05bd18715889696c089c58d585dcdcb545077541))
* **usePomodoro.js:** 补充不完整的长休逻辑 ([b34214c](https://github.com/gxxk-dev/StudyWithMiku/commit/b34214ce405116824cc8978d020e3727fa0aa658))

### ⚡ 性能优化

* 精简前端外部资产导入 ([e357b26](https://github.com/gxxk-dev/StudyWithMiku/commit/e357b268240c61ab48569d91dedd2795e64c04e5))
* **timer:** 优化计时器状态保存实现 ([533a170](https://github.com/gxxk-dev/StudyWithMiku/commit/533a1706a9a51caf49ddbbf4f6d87c21ad69b9f9))

### ♻️ 重构

* 优化音乐源 ([5fbe208](https://github.com/gxxk-dev/StudyWithMiku/commit/5fbe208a3fef88f2874ac8e33e356f5a3b438f4b))
* 重构组件架构并优化代码质量 ([2757a7f](https://github.com/gxxk-dev/StudyWithMiku/commit/2757a7fe63aca7cbe964d14cc2c2908815008a41))
* **app:** 使用 runtimeConfig 替换硬编码常量 ([f063c7e](https://github.com/gxxk-dev/StudyWithMiku/commit/f063c7e5da0ca35a800d0ddb55a497d255920fa8))
* **composables:** useCache 和 useToast 使用 runtimeConfig ([4a080d0](https://github.com/gxxk-dev/StudyWithMiku/commit/4a080d0f9f37c1dbf638adf823b700acfee350ad))
* **dev:** 从 vConsole 迁移到 Eruda ([1b34b8f](https://github.com/gxxk-dev/StudyWithMiku/commit/1b34b8fe6c3915a1a495feb2784a091a845f343f))
* **icons:** 迁移至 Iconify 统一图标方案 ([bf4e2d7](https://github.com/gxxk-dev/StudyWithMiku/commit/bf4e2d7c6dde8dbb77d7330ebd1564cddb7b8591))
* **online:** 移除 useOnlineCount，统一使用 onlineServer 服务 ([03539b6](https://github.com/gxxk-dev/StudyWithMiku/commit/03539b661b4eeea7bcf18ad3da8f5495b534e5cf))
* **player:** 迁移组件到新播放器架构 ([4fd6556](https://github.com/gxxk-dev/StudyWithMiku/commit/4fd6556a9196646e084606d6ac1418f1a4211f3f))
* **pwa:** 迁移 PWAPanel 到设置面板缓存管理 Tab ([5d725e3](https://github.com/gxxk-dev/StudyWithMiku/commit/5d725e3df332e7625109163fe28a108b9c8780c5))
* **settings:** 重构设置ui ([bc704cc](https://github.com/gxxk-dev/StudyWithMiku/commit/bc704cc1312e5f6e37a298740fb9a30867fc36e1))
* **storage:** 统一 localStorage 键名前缀并清理未使用字段 ([a453372](https://github.com/gxxk-dev/StudyWithMiku/commit/a453372a2a9b6668e0bd5a78e129b3108e9d271b))
* **utils:** eventBus 和 mediaSession 使用 runtimeConfig ([4e1e107](https://github.com/gxxk-dev/StudyWithMiku/commit/4e1e107d2d292c25199af945b225a282e0a4924c))

### 📝 文档

* 添加重构公告，引导用户至上游仓库 ([ae470e6](https://github.com/gxxk-dev/StudyWithMiku/commit/ae470e621b26506e73412efe8168640bff5baa7d))
* 完善README与vibe coding相关项目提示词 ([adf1d49](https://github.com/gxxk-dev/StudyWithMiku/commit/adf1d49665b89da2046bfcf32c7df515ebb18bd0))
* 在README中展示Wiki ([b62444d](https://github.com/gxxk-dev/StudyWithMiku/commit/b62444dd9f2fb44b788b95b002aebf2e9e5e057e))
* **help:** 完善 JSDoc 注释并增强帮助系统 ([34dfc83](https://github.com/gxxk-dev/StudyWithMiku/commit/34dfc837dfec62d0eeeeb054474e070fea6b1aa2))
* **standards:** 添加 JSDoc 注释规范 ([99440be](https://github.com/gxxk-dev/StudyWithMiku/commit/99440be17a13cc95a8e69a7757d8ef734fa10def))

### ✅ 测试

* 移除未使用的导入和变量 ([ae7bc33](https://github.com/gxxk-dev/StudyWithMiku/commit/ae7bc3372c70f9040752fa1c01faa36de8f5e6ef))
* 引入 Vitest + Playwright 测试框架 ([109cf41](https://github.com/gxxk-dev/StudyWithMiku/commit/109cf4180ac6ac44526b0a8a00a9ebcfc5815044))
* **player:** 添加播放器单元测试 ([b6915a2](https://github.com/gxxk-dev/StudyWithMiku/commit/b6915a2fc47fa0f2798654fa7bf8c2ba6eec1c39))
* **services:** 补充 localAudioStorage 和 playlistImportExport 测试 ([0143893](https://github.com/gxxk-dev/StudyWithMiku/commit/01438937ea1d136fd0c1362b93aff7ecdd9826af))

### 🔧 其他

* 更新开发工具和配置 ([e0521e1](https://github.com/gxxk-dev/StudyWithMiku/commit/e0521e18162e181fd6246011e6620a886b745ddf))
* 启用语义化版本号，移动 jsdoc 插件到 scripts 目录 ([9bcb262](https://github.com/gxxk-dev/StudyWithMiku/commit/9bcb262f66d7ccad5e0fb6f04334f8ef80232f84))
* 日志级别调整和 emoji 移除 ([3a52099](https://github.com/gxxk-dev/StudyWithMiku/commit/3a52099a3011eff93521cdd1aadd4288467d806b))
* 升级Vite等工具的版本并修复一处路径警告 ([56e744a](https://github.com/gxxk-dev/StudyWithMiku/commit/56e744a90e5449691ebc2046d1fdcbe4cfd01748))
* 移除跨域限制 ([5e7c769](https://github.com/gxxk-dev/StudyWithMiku/commit/5e7c769529a31ce3457bc8fcac9b88fd32f6ab5f))
* 重新生成lock文件 ([e7da542](https://github.com/gxxk-dev/StudyWithMiku/commit/e7da542a2fe916e0c40d8dcdf66225ab56f83d6d))
* **tooling:** 配置代码质量工具 ([13b9cd3](https://github.com/gxxk-dev/StudyWithMiku/commit/13b9cd3a472bb6855d9b5b4962b41dc9f99e94c0))

</details>
