# Astro Cactus 迁移验收记录

本文件保留分阶段的历史验收记录。当前实现与本次检查见文末“2026-10-22：Cactus 原版布局与 favicon 更新”，现行规则以架构与设计规范为准。

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

## 2026-10-22：Cactus 原版布局与 favicon 更新

本节追加记录本次重构，前文保留首次迁移时的历史结论，不代表当前布局或本次验证结果。

- 主题固定提交更新为 `728f1f4eeb80208398649261d7635f311cafa011`，还原等宽字体、英文界面、导航、页脚、年份归档、标签页面、响应式目录和搜索弹窗。
- 3 篇现有文章、17 张配图、文章 URL、canonical、Giscus 参数及 CI/CD 保持不变。实施前记录文件清单和哈希，交付前复核。
- favicon 更换为用户指定的 RealFaviconGenerator 资源包，安装在 `public/` 根目录，声明统一放在 `BaseHead.astro`，版本为 `20261022`。旧迁移基线保留，不要求新图标与历史图标哈希一致。
- 同步 `AGENTS.md`、README、架构、设计、内容、贡献、测试和来源说明，使规范与实际实现一致。

本次本地验证结果如下：

| 检查                      | 结果                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm ci`                  | 通过，使用现有锁文件干净安装                                                                    |
| `npm run check`           | 通过，48 个文件，0 错误、0 警告、0 提示；Prettier 检查通过                                      |
| `npm run lint:names`      | 通过，20 个 Git 管理的正式内容文件                                                              |
| `npm run lint:content`    | 通过，3 篇文章元数据，0 篇正文改动                                                              |
| `npm test`                | 45 项通过                                                                                       |
| `npm run build`           | 通过，15 个 HTML 页面，Pagefind 索引 3 篇文章                                                   |
| `npm run test:built`      | 通过，文章、资源、锚点、favicon、manifest、RSS、Sitemap 和中文搜索均通过                        |
| `npm run test:e2e`        | 20 项通过，真实 Giscus 用例默认跳过；随后单独启用并通过                                         |
| `npm audit`               | 0 个已知漏洞                                                                                    |
| `npm run release:dry-run` | 通过，只读分析既有提交，没有创建标签或 Release                                                  |
| 内容与配置基线            | 33 个受保护文件哈希一致，包含 3 篇文章、17 张配图及既有工程配置；npm scripts 和内容 schema 不变 |
| favicon 下载校验          | 7 个文件与用户提供的下载源逐字节一致                                                            |

浏览器测试使用本机 Google Chrome `155.0.8059.40`，通过现有的 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 环境变量指定，没有修改 Playwright 或 CI 配置。首次默认启动因匹配的 Chromium 尚未安装而失败，随后使用已安装 Chrome 完成全量回归。CI 仍按原流程安装锁定版本对应浏览器。

响应式回归覆盖 375、768、1440 px 与深浅色，核心页面截图共 60 张，包含隔离构建中的测试文章。另从正式生产构建保存首页深浅色、归档及文章截图；正式构建只有原有 3 篇文章。截图和报告为本地产物，不加入正式文章与配图目录。

Giscus 官方脚本响应及真实评论 iframe 加载检查通过。该结果只证明本次服务可访问，未执行评论发布或登录操作。GitHub CI、PR 和线上部署尚未执行，仍待后续授权及人工审核。

### 页眉 LOGO 补充调整

按作者要求，页眉 LOGO 改为引用同一份 `/favicon.svg?v=20261022`。保留 Cactus 的响应式位置和尺寸，使用 `object-contain` 保持图像比例；桌面灰度与悬停效果继续沿用。同步修正 Agent 约定、架构和设计规范。

本次补充调整已通过 `npm run check`、`npm run build` 和 `npm run test:built`。复用现有浏览器用例，375、768、1440 px 深浅色布局及桌面、移动端导航共 8 项通过；本地仍使用 Chrome 155，尚未提交、推送或部署。

### 移除 About 页面

按作者要求删除 About 页面，主导航和页脚导航仅保留 `Home / Blog`，搜索继续使用图标。`/about/` 不做重定向，返回 404，Sitemap 不再收录。历史迁移基线保持不变，生产检查单独声明退役页面，并验证页面、导航与 Sitemap 均已移除。同步更新 Agent 约定、架构、设计和测试说明。

本次移除已通过静态与格式检查、45 项单元测试、生产构建及产物检查。正式构建现为 14 个 HTML 页面，RSS 仍为 3 篇文章；实际请求 `/about/` 返回 HTTP 404。375、768、1440 px 深浅色布局与桌面、移动端导航共 8 项通过，本次核心布局截图为 54 张。文章、配图、CI/CD 和历史迁移基线未改动，尚未推送或部署。

### 提交前完整验收

2026 年 10 月 22 日，对最终工作区重新运行完整检查。结果为：`npm ci`、`npm run check`、`npm run lint:names`、`npm run lint:content`、`npm test`、`npm run build`、`npm run test:built`、`npm run test:e2e`、`npm audit` 和 `npm run release:dry-run` 全部通过。单元测试 45 项通过；浏览器测试显式启用真实 Giscus 检查，21 项全部通过，无跳过。依赖审计为 0 个已知漏洞。

本地使用 Node.js `26.7.0` 与 Google Chrome `155.0.8059.40`。浏览器路径通过既有环境变量指定，未修改 CI/CD 或 Playwright 配置。生产构建生成 14 个 HTML 页面，RSS 与 Pagefind 均保留 3 篇文章。33 个受保护文件与实施前哈希一致。

保留当前仅显示作者、年份的简化页脚，并同步 Agent 约定和设计说明。显示日期统一为 UTC 的 `YYYY-MM-DD`；页眉 LOGO 与 favicon 共用资源。About 页面退役属于公开路由的不兼容变更，提交及 PR 使用 `!` 并说明影响，既有文章 URL 不受影响。

以下截图来自最终正式构建，只有原有 3 篇文章，不含回归夹具：

| 视口    | 浅色                                                 | 深色                                                |
| ------- | ---------------------------------------------------- | --------------------------------------------------- |
| 375 px  | [截图](screenshots/cactus-theme/home-375-light.png)  | [截图](screenshots/cactus-theme/home-375-dark.png)  |
| 768 px  | [截图](screenshots/cactus-theme/home-768-light.png)  | [截图](screenshots/cactus-theme/home-768-dark.png)  |
| 1440 px | [截图](screenshots/cactus-theme/home-1440-light.png) | [截图](screenshots/cactus-theme/home-1440-dark.png) |

本节记录本地提交前验收；GitHub CI 以 PR 上的实际检查为准。生产部署和合并仍待人工审核。
