# Changelog

## [1.2.0](https://github.com/gxxk-dev/StudyWithMiku/compare/v1.1.0...v1.2.0) (2026-02-14)

好久不见！这次更新拖了挺久的，因为咱加了一个重量级功能——账号系统和云同步！

记得当初自己开fork的时候就是想补全这一块碎片来着（）

---

**更新内容：**

- 账号系统上线！支持多种方式登录（目前是 微软/Github/谷歌/L站），选一个自己常用的就好
    （然而这个屑开发者只在后台配置了两个平台的登陆模式）
- 登录之后专注记录和歌单以及个人设置会自动同步到云端，换设备也不用担心数据丢了
- 打包了字体文件，不同设备上界面显示统一了
- 修了一堆安全和稳定性的问题并且补全了一些技术组件
    ~~（用户侧感知不大所以懒得写了（x~~

------

碎碎念：

这个版本后端的工作量比前端大很多，基本上是从零开始搞认证+同步，踩了不少 Cloudflare Workers 的坑（

（并且电子邮件服务和密码存储啥的安全性实在不高 这个功能最后还是没上）

然后咱由于学业原因，接下来更新频率可能会慢一些，但有 bug 还是会修的！

此外我最近的所有更新计划都会发到仓库的 Issues 里面 将来大概率会实现的（）

有问题欢迎**提 Issue** 或者发邮件到 **gxxk@duck.com**，都会看的~

请继续和 Miku 一起学习吧！

<details>

<summary>完整更新日志</summary>

### ✨ 新功能

* **auth:** 多源头像支持 + 用户资料编辑 (PATCH /auth/me) ([b8c32bf](https://github.com/gxxk-dev/StudyWithMiku/commit/b8c32bf150b0b22dec51b3625724629b7e29088a))
* **auth:** 接入 LINUX DO OAuth + 前端 Provider 模板化重构 ([813313f](https://github.com/gxxk-dev/StudyWithMiku/commit/813313f17c082c53acaa544ba484308bd303d787))
* **auth:** 认证互通 — oauth_accounts 表 + 统一凭证管理 ([6ec75d9](https://github.com/gxxk-dev/StudyWithMiku/commit/6ec75d9bae6a2d962f96c04d6780170832bc338c))
* **auth:** 实现 WebAuthn/FIDO2 账号系统后端 ([6807ed0](https://github.com/gxxk-dev/StudyWithMiku/commit/6807ed02e69bc2cfe4889ba5bf775fc76fe90bd9))
* **auth:** 实现前端账号系统与数据同步功能 ([d3fcb08](https://github.com/gxxk-dev/StudyWithMiku/commit/d3fcb087f100b50a51d2ed07bf7cf0737022a550))
* **auth:** 账号关联冲突检测 + 跨账号合并功能 ([48c3e25](https://github.com/gxxk-dev/StudyWithMiku/commit/48c3e25bec907a6277db45f8fc9256a1b85a73ef))
* **auth:** 自动检测 WebAuthn RP ID 和 OAuth 回调 URL ([89a8303](https://github.com/gxxk-dev/StudyWithMiku/commit/89a8303c1f60e966f198b71a6a862af8760eabcd))
* **dev:** 暴露 auth/sync/authStorage 到 swm_dev 开发者控制台 ([6e812b5](https://github.com/gxxk-dev/StudyWithMiku/commit/6e812b593feb83209a68143d9a6706d51d8ae7a2))
* **font:** 打包 Inter 和 Fira Code woff2 字体，统一跨平台字体渲染 ([37fd0e7](https://github.com/gxxk-dev/StudyWithMiku/commit/37fd0e78dd90cbb66980f7baf265a7a5abc2af2b))
* **merge:** 为专注记录和歌单增加"合并两边"选项 ([41e4f54](https://github.com/gxxk-dev/StudyWithMiku/commit/41e4f54a756793bb391ccbf3e68ee52d4faeae60))
* **worker:** CORS 自动从请求 URL 推导同源 origin ([c0091de](https://github.com/gxxk-dev/StudyWithMiku/commit/c0091deeaac95c2545e4142d171b22cd634cd4b3))

### 🐛 Bug 修复

* **auth:** 统一 OAuth 回调 URL，解决关联账号 redirect_uri 不匹配问题 ([eac16c9](https://github.com/gxxk-dev/StudyWithMiku/commit/eac16c954582a7952a2dec1d9dc4752c3f384904))
* **auth:** 修复前后端 API 不匹配问题并优化账户功能 ([dc0b943](https://github.com/gxxk-dev/StudyWithMiku/commit/dc0b9436fb8cb7ce8f7c83603c53209a435a8da7))
* **auth:** 允许有安全密钥的 OAuth 用户通过 WebAuthn 登录 ([df773a5](https://github.com/gxxk-dev/StudyWithMiku/commit/df773a5078fd2d97c8b5f659752aa2e1f5b39ab0))
* **auth:** mergeToken 延迟消费，避免错误用户请求导致 token 失效 ([a6fef5b](https://github.com/gxxk-dev/StudyWithMiku/commit/a6fef5b5f604da6330d60e1d9a5f57456e1a7011)), closes [#7](https://github.com/gxxk-dev/StudyWithMiku/issues/7)
* **auth:** mergeTokens 从内存 Map 迁移到 Durable Object 持久化存储 ([f46b9c8](https://github.com/gxxk-dev/StudyWithMiku/commit/f46b9c86732bad20b0dc86523cde7b4af25bde78))
* **auth:** refresh token 迁移到 HttpOnly Cookie ([d739ae4](https://github.com/gxxk-dev/StudyWithMiku/commit/d739ae4766d4d416ee11cf39bfcfd011af8b31f8)), closes [#11](https://github.com/gxxk-dev/StudyWithMiku/issues/11)
* **lint:** 清理全部 5 个 ESLint warning ([93c2d67](https://github.com/gxxk-dev/StudyWithMiku/commit/93c2d67e4f9a02320786d3661e3a4a7a3096abd7))
* **security:** 修复内存泄漏、竞态条件和安全问题 ([027218a](https://github.com/gxxk-dev/StudyWithMiku/commit/027218a6847a6ae4c50fca6f249ddc13a5d156c2))
* **sync:** 修复 13 个前后端 API 不一致和功能缺失问题 ([e5ef34f](https://github.com/gxxk-dev/StudyWithMiku/commit/e5ef34f3a0a5943ace893b7e85b2b728a60ff781))
* **test:** 新增 wrangler.test.toml 解决 CI 找不到 wrangler.toml 的问题 ([c049c43](https://github.com/gxxk-dev/StudyWithMiku/commit/c049c43117db576186d603720372a2f89d078055))
* **test:** 修复 24 个 E2E 测试失败 ([bdbf2ff](https://github.com/gxxk-dev/StudyWithMiku/commit/bdbf2ffee98d89b2a8cede67cf525b9cf86d20ec))
* **test:** 修复 refresh token API 集成测试 ([7b558b5](https://github.com/gxxk-dev/StudyWithMiku/commit/7b558b541b51d70a1a95cd0de948b34babd65f5c))
* **test:** 修复 WebAuthn E2E 登录和添加设备测试 ([6416495](https://github.com/gxxk-dev/StudyWithMiku/commit/6416495626a7b6d666f25d0c828a11b4a026afd1))
* **test:** 增加 E2E 导航超时和本地重试以减少间歇性失败 ([8b00be8](https://github.com/gxxk-dev/StudyWithMiku/commit/8b00be80215d0de7dfd68448d5f67d4f88790fd9))
* **test:** API 测试 initDatabase 先 DROP 旧表避免 schema 不一致 ([87b7cd1](https://github.com/gxxk-dev/StudyWithMiku/commit/87b7cd19d1804f0f97d362e5f9ae1fbaf9628c1a))
* **test:** API 测试使用绝对路径 + 补充 RateLimiter 导出 ([fbe5e8e](https://github.com/gxxk-dev/StudyWithMiku/commit/fbe5e8e0e5275c38e57aa2fd8d99f004f0434192))
* **test:** API 集成测试支持可配置 host/port 及启动重试 ([4bb1914](https://github.com/gxxk-dev/StudyWithMiku/commit/4bb1914ce7a090995c8d66f8581f430a92818d70)), closes [#15](https://github.com/gxxk-dev/StudyWithMiku/issues/15)
* **worker:** CORS 添加 Origin 白名单控制 ([a4c81ac](https://github.com/gxxk-dev/StudyWithMiku/commit/a4c81ac7dbc6aa58f65a104b7cd16331eef36585)), closes [#12](https://github.com/gxxk-dev/StudyWithMiku/issues/12)
* **worker:** rateLimit 迁移到 Durable Object 实现跨实例共享 ([9cf11d0](https://github.com/gxxk-dev/StudyWithMiku/commit/9cf11d08697d1ca2632d195c031c4185cae61fb8)), closes [#9](https://github.com/gxxk-dev/StudyWithMiku/issues/9)

### ⚡ 性能优化

* **build:** 优化构建产物 chunk 拆分 ([0f20cbe](https://github.com/gxxk-dev/StudyWithMiku/commit/0f20cbe3ff573f4174a86c988d2e01fc705386ec)), closes [#16](https://github.com/gxxk-dev/StudyWithMiku/issues/16)
* **sync:** 使用 CBOR 格式优化云存档存储和传输 ([8dfcf5f](https://github.com/gxxk-dev/StudyWithMiku/commit/8dfcf5f3fa296102b56b8fc91401247b83e4f292))
* **sync:** 重构专注记录同步架构 ([9759015](https://github.com/gxxk-dev/StudyWithMiku/commit/9759015d7f41fb22689204a1b807dca6b6c4bc6a))

### ♻️ 重构

* **auth:** 拆分 auth.js 为子路由模块 ([d7c598a](https://github.com/gxxk-dev/StudyWithMiku/commit/d7c598a43fc91bcd1cd7c4310a16b7c7c74d89b3)), closes [#14](https://github.com/gxxk-dev/StudyWithMiku/issues/14)
* **auth:** 头像选择器改为可视化选中模式 ([772c212](https://github.com/gxxk-dev/StudyWithMiku/commit/772c212f35e846441d685bb158d96337f71ca3be))
* **auth:** LINUX DO icon 改用自定义 SVG 替代 simple-icons:discourse ([733509a](https://github.com/gxxk-dev/StudyWithMiku/commit/733509a0f5d7c023749ca3c806fb616bb416f3fa))
* **db:** 合并迁移文件并修复 Wrangler DO 配置 ([cb06528](https://github.com/gxxk-dev/StudyWithMiku/commit/cb06528b339b0ad110d6d4b8422556b0c0863544))
* **frontend:** App.vue 拆分为独立 composable ([c69bf9b](https://github.com/gxxk-dev/StudyWithMiku/commit/c69bf9b06365e80f2e7edb949a844bebb0c7a3e1)), closes [#13](https://github.com/gxxk-dev/StudyWithMiku/issues/13)
* **sync:** 简化数据同步架构，删除 delta/batch sync，修复 9 个前后端 Bug ([b08c230](https://github.com/gxxk-dev/StudyWithMiku/commit/b08c230b62caf38d4128546f43fff78b5ca4ba35))
* **test:** 精简 E2E 测试，移除与单元测试重复的用例 ([8c664ad](https://github.com/gxxk-dev/StudyWithMiku/commit/8c664ad532c88b34d7db7a505ad08cc86f761bf9))
* **workers:** 使用 Drizzle ORM 替换原始 SQL 查询 ([3e42d19](https://github.com/gxxk-dev/StudyWithMiku/commit/3e42d19cc45925269bee084bc6c4af5309e60324))

### 📝 文档

* **AICoding:** 重新生成AI工具的Project Memory ([faaad79](https://github.com/gxxk-dev/StudyWithMiku/commit/faaad7999cdb1403430050ec262dd4e146d7978f))

### ✅ 测试

* **api:** 添加前后端 API 集成测试，修复 2 个数据同步 Bug ([2e3ae0c](https://github.com/gxxk-dev/StudyWithMiku/commit/2e3ae0ce7a257b2db15071d9653cd168918bc93f))
* **auth:** 添加 auth/sync 系统前后端单元测试 (17 文件, ~390 cases) ([e6576e2](https://github.com/gxxk-dev/StudyWithMiku/commit/e6576e2bfd4f2e9fdfb3da866764f9514965c6f2))
* **e2e:** 添加 auth/sync E2E 测试 (6 文件, ~27 cases) ([042827d](https://github.com/gxxk-dev/StudyWithMiku/commit/042827d85bc3ecad0d4ae1600e75b44fb47c8e8d))

### 🔧 其他

* 将 wrangler.toml 重命名为示例文件并加入 gitignore ([09dd517](https://github.com/gxxk-dev/StudyWithMiku/commit/09dd5174cae92df140a51ffa0fbd476b6aadade4))
* 迁移文件合并 + triggerSync 改为完整双向同步 ([13bd31a](https://github.com/gxxk-dev/StudyWithMiku/commit/13bd31accbfb4d31eaad096fd4917a4b31f741d9))
* 增加 CI 工作流（lint/test/build/e2e） ([4352c67](https://github.com/gxxk-dev/StudyWithMiku/commit/4352c6709c18aecb6d66503c8b9df0d9d8367ea6)), closes [#8](https://github.com/gxxk-dev/StudyWithMiku/issues/8)
* **lint:** 清理 ESLint 13 条 warning ([2e5c1a4](https://github.com/gxxk-dev/StudyWithMiku/commit/2e5c1a42979a0bc01065ad82c3a5389393538508)), closes [#17](https://github.com/gxxk-dev/StudyWithMiku/issues/17)

</details>

## [1.1.0](https://github.com/gxxk-dev/StudyWithMiku/compare/v1.0.0...v1.1.0) (2026-02-03)

各位好！学习辛苦了ww
这次主要追加了几个让学习流程更顺畅/易操作的特性！
主要是 **设置分享** 和 **一些小优化**！
希望大家能喜欢！

（使用过程中遇到任何问题欢迎**提交Issue**或炮轰**gxxk@duck.com**！）
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
