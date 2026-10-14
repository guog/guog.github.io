# Astro Cactus 迁移验收记录

## 基线与范围

- 核验日期：2026 年 10 月 14 日。
- 原始提交：`6a5d72102b114787f9135c9e6aad50ab08176f30`，克隆工作区干净，未覆盖用户修改。
- 工作分支：`feat/astro-cactus-ai-ready`。未直接修改远程 `main`，未合并、部署、创建版本标签或更改仓库设置。
- 固定主题：Astro Cactus `v8.3.0`，提交 `82eabb6151a8e47838cb7f6d12ea29451926bd3e`。MIT 许可保留在 [第三方声明](../THIRD_PARTY_NOTICES.md)。
- 原博客已使用 Astro `7.3.8`，高于主题的 `7.3.2`；保留兼容的已有补丁版本，避免无意义降级。
- 原站 `npm ci`、`npm run build` 和 Pagefind 成功。云执行器的默认 npm/配置缓存不可写，改用临时缓存并关闭 Astro 遥测后通过；未修改系统权限。

## 内容和路由

- 迁移前后均为 3 篇原文。完整文件、正文、元数据和 favicon 的迁移哈希核验通过。
- 旧 `/blog/{slug}/`、首页、归档、搜索、关于、RSS、静态资源均保留。
- 原有“翻译示例”属于仓库历史内容，按保留正文的要求原样保留；未导入任何 Cactus 演示文章。
- Giscus 的仓库、分类 ID、`pathname` 映射和中文语言参数不变。真实第三方服务连通性与本地模拟测试分开验收。
- Pagefind 现在只索引文章，已用真实 JS/WASM 索引验证中文查询；草稿从路由、列表、RSS、Sitemap、搜索索引中排除。
- 内容 ID 在一个公共函数中进行 NFC 规范化，保留大小写与嵌套路径，拒绝歧义分隔符；重复 ID 和构建路由冲突会报错。

## 实际实现

- 以 Cactus 的 Base、Header、Footer、文章 Masthead、TOC、列表、主题机制、色彩与 Expressive Code 为基础，适配为中文无衬线正文和原有 `blog` schema。
- 唯一主题状态为 `data-theme`。默认跟随系统，手动选择可持久化，也可恢复自动模式；评论和代码配色同步。
- 代码行号默认开启；支持按块关闭、从 42 等指定行开始、高亮和不含视觉行号的复制。`ec.config.mjs` 为 Markdown、MDX 和 `Code` 组件的共同入口。
- 站点身份与评论参数集中在 `src/site.config.ts`；没有 Notes、Webmentions、额外前端框架或第二套部署器。
- 统一 Site 工作流校验来源分支、PR 标题、类型、代码、内容、测试、真实产物和浏览器行为。PR 不部署；`main` 验证成功后才部署，部署成功后才运行唯一的轻量 SemVer 发布器。

## 版本

- Node.js：测试环境 `24.19.0`，npm `11.9.0`；`.nvmrc` 固定 Node，项目最低要求 Node `24.0.0`。
- Astro `7.3.8`，Tailwind CSS / Vite 插件 `4.3.3`。
- Astro Expressive Code、行号插件和 Frames 插件均为 `0.44.2`。
- Pagefind `1.5.2`，Playwright Test `1.64.0`。完整解析版本以 `package-lock.json` 为准。
- 原仓库没有 `v*` 标签。无历史规范功能提交时 dry-run 不发布；迁移的 `feat` 提交在合并并成功部署后应产生首个 `v1.0.0`。未实际发布版本。

## 已执行的检查

- 原站安装、构建和 Pagefind：通过。
- 迁移后安装、Astro 类型检查、Biome、内容校验、39 项 Node 单元测试、正式构建、静态产物回归：通过；最终详情以 PR 对应提交的检查日志为准。
- 一次性迁移哈希：3 篇文章及 favicon 一致。此命令不作为日常 CI 门禁，不阻止未来正常改文。
- 隔离的 12 页生产测试构建：MDX、大小写与中文嵌套路径、NFC、显式 slug、草稿过滤、TOC、代码行号开关/偏移、行高亮、`Code` 组件共享配置、复制载荷均通过产物断言。测试文章没有进入正式站点。
- 独立代码审查发现并修复了 Unicode 规范化、重复 ID、Node 最低版本和生成测试报告被类型检查扫描的问题。

## 浏览器与发布边界

- 本地浏览器安装下载返回无效 ZIP；系统 Chromium 启动被执行器的 socket 限制阻止。沙箱外测试启动也因执行器文件系统挂载失败而未运行。未更改权限或访问受限文件。
- 支持的云浏览器不能访问本地预览端口。不能把构建成功当成浏览器测试成功。
- Playwright 已配置对生产构建执行 375 / 768 / 1440 px、浅深色模式、中文搜索、剪贴板、主题保持、TOC、横向滚动、Giscus 本地消息契约等测试，并保留截图。真实 GitHub 执行结果、截图入口和剩余问题记录在 PR 中。
- 没有合并授权，因此没有新站线上部署或实际 Release 验证。合并前必须检查 PR CI 全绿并完成人工审核。

## 待人工完成与回滚

按照 [贡献指南](CONTRIBUTING.md#github-仓库设置待人工核实) 核验 Pages Source、`main` 保护、必需检查、Squash 设置、Environment 的 `main` 限制和最小 Token 权限。配置文件不会自动创建这些保护规则。

回滚使用新的 `fix/*` 恢复性 PR 或 revert PR，经同一 CI 后重新部署；不强推、不移动旧标签。Release 失败时保留部署与标签，按原 SHA 恢复，不重新覆盖已发布版本。

## PR 阶段补充证据

- 远程草稿 PR：[#1](https://github.com/guog/guog.github.io/pull/1)，目标仍为原始 `main`。三个迁移提交与本地文件树核验一致。
- 对首轮提交 `f6361674c78d74b534e5610e2174fd52f379093e` 的实际 dry-run 推断 `v1.0.0`；没有写入标签或 Release，也没有验证发布 Token 的写权限。
- 隔离回滚演练通过：在临时 detached worktree 中反向应用三个迁移提交且不创建提交，所得文件树与原始 `main` 完全一致，再次 `npm ci` 和构建通过。没有变更主工作区或远程历史。
- GitHub 只读查询确认：`main` 当前 `protected=false`，必需状态检查为空；仓库仍同时允许 Merge、Rebase 和 Squash。保护设置必须由维护者人工完成。
- [首轮 CI](https://github.com/guog/guog.github.io/actions/runs/38557748826) 的安装、类型、内容、39 项测试、构建和真实索引验证通过。浏览器 11 项通过、4 项失败、1 项可选真实 Giscus 检查跳过；失败项分别是 Pagefind 的实际 `textbox` 与测试预期 `searchbox` 不一致，以及装饰性 `#` 进入标题无障碍名称。
- 已按实际渲染语义修正搜索定位，并为装饰标记提供空替代文本，保留对标题、搜索结果和导航的严格断言。未删除或跳过失败测试。后续 CI 结果以 PR 最新提交为准。
- 首轮 6 组尺寸/主题测试全部通过并留下 36 张页面截图：[浏览器证据](https://github.com/guog/guog.github.io/actions/runs/38557748826/artifacts/11890811154)。下载需要仓库访问者登录 GitHub；证据保留 14 天。
- 首轮依赖审计发现一个 CSS 解析器复杂度漏洞沿依赖链产生的 10 个中风险条目；通过精确限定范围的 `postcss-selector-parser@7.1.6` override 修复。Expressive Code 和 postcss-nested 主版本不变；正式构建、12 页测试构建与 39 项单测再次通过，`npm audit` 为 0 个已知漏洞。
- 截图上传 Action 更新到官方 `v7.0.2` 固定 SHA，使用 Node 24，消除首轮 CI 的 Node 20 兼容警告。
