# 回归测试

- `npm test`：内容校验器、真实文章元数据、ID/URL 与工程治理单元测试。
- `npm run lint:content`：所有文章的 Frontmatter 和唯一 ID；只检查 Git 比较基线以来新增或修改文章的标题、围栏语言与图片 alt。用 `-- --base <ref>` 指定基线，用 `-- --all` 主动全量检查正文。
- `npm run build && npm run test:built`：先构建正式站点，再验证全部本地链接、图片与锚点、SEO、旧 URL、RSS、Sitemap、Giscus 配置和实际 Pagefind JS/WASM 中文查询。索引测试只读取本地文件，不需要网络或浏览器。
- `npm run check:migration`：本次迁移专用，确认原有 3 篇文章和 favicon 字节完全未变。它不进入常规 CI，不能作为禁止今后正常编辑文章的门禁。
- `npm run test:e2e`：在临时目录复制源码，注入本目录中的测试内容，再完成生产构建、Pagefind 索引、产物检查和浏览器回归。正式 `src/content/blog` 与 `dist` 不会被测试内容污染。
- `node tests/e2e/server.mjs --build-only`：仅运行隔离的测试内容构建及产物检查，不启动预览或浏览器。可用于诊断环境是否支持浏览器前的构建问题。

3 篇示例文章经作者授权删除后，基线中的 `retired: true` 标记要求生产检查验证其页面、导航、RSS、Sitemap 和搜索均已移除。一次性迁移哈希检查只适用于删除前的历史版本。

`fixtures/legacy-urls.json` 记录迁移前提交、文章完整哈希和 Frontmatter、已发布 URL、RSS/Sitemap、favicon 以及 Giscus 映射。

`fixtures/content` 中的 Markdown/MDX 仅用于测试。覆盖行号默认开启、关闭、从 42 开始、共用配置的 `<Code>` 组件、复制内容、中文标题的目录、长代码和表格、草稿排除、显式 slug、嵌套路径、大小写、中文及 Unicode NFC 规范化。`Café.md` 的文件名刻意使用分解形式重音字符，不要将它重命名为组合形式。

浏览器测试默认屏蔽 Giscus 网络请求，并另测模拟 iframe 的主题同步契约。只有显式设置 `CHECK_LIVE_GISCUS=1` 才会检查真实第三方服务；本地契约通过不代表第三方服务当前可用。

CI 使用锁定的 Playwright 版本对应浏览器。若本地已有受信任的 Chromium，可设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指向其可执行文件；这不能绕过系统或沙箱的执行限制。`PLAYWRIGHT_PORT` 可覆盖默认预览端口 4322。

成功的布局用例也会保存截图：375 / 768 / 1440 px，浅色和深色，各覆盖首页、归档、搜索、标签、3 篇正式文章和排版测试文章。截图数量由当前核心页面清单决定。截图位于 `test-results/`，完整报告位于 `playwright-report/`；失败用例另存 trace。只有实际运行过的浏览器检查才能报告通过。

## Cactus 与 favicon 回归

浏览器回归还覆盖英文导航、移动菜单开关与 Escape、搜索弹窗及焦点恢复、中文检索、年份归档、中文和 `CI/CD` 标签、宽屏固定目录、窄屏目录和返回顶部。保留 URL、草稿排除、复制与 Giscus 主题同步检查，按新界面更新定位断言。

首页按当前紧凑布局检查：无 H1，显示配置中的简介、`More...` 归档入口与最多 10 篇文章。其他页面仍须具有唯一且可见的 H1。浏览器同时核对文字站名及其首页链接，保留英文导航、移动菜单与搜索检查。

生产检查核对每页 favicon 声明的唯一性、版本参数、应用标题、PNG 尺寸、SVG/ICO 签名，以及 manifest 的图标文件。所有检查使用本地产物，不依赖下载服务。

历史 `check:migration` 针对首次迁移前的内容和旧 favicon。本次授权替换 favicon，不修改该基线，也不将该历史审计当作本次回归通过条件。3 篇现有文章和 17 张配图另按本次实施前的清单与哈希验证。

About 页面已退役。生产检查须验证 `/about/` 不再生成且 Sitemap 无该地址；历史基线中的页面记录保留，避免改写旧验收证据。

## AI 阅读与章节引用

`tests/markdown.test.mjs` 使用人工指定的代码金样本核对空白、Tab、实体与围栏；`check-ai-built.mjs` 另将每篇源代码与生成 Markdown 比较。`tests/e2e/ai-reading.spec.ts` 对实际 Sitemap 页面和 404 检查 HTTP/MIME、发现关系、对话入口与回退，并验证提示词不进入 Pagefind。

`tests/citations.test.mjs` 与 `tests/e2e/citations.spec.ts` 检查 JSON-LD、安全转义和章节复制。`legacy-headings.json` 来自 d5a9084 的独立构建，保存原文章 140 个章节的 ID 和内容摘要；正文合法编辑可能触发摘要差异，必须人工核对旧链接仍指向原章节后，再解释并更新对应记录，不能一键重录全部基线。隔离构建中新增再删除一个分页页面，验证 Markdown 随实际路由生成和清理。
