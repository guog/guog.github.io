# 回归测试

- `npm test`：内容校验器、真实文章元数据、ID/URL 与工程治理单元测试。
- `npm run lint:content`：所有文章的 Frontmatter 和唯一 ID；只检查 Git 比较基线以来新增或修改文章的标题、围栏语言与图片 alt。用 `-- --base <ref>` 指定基线，用 `-- --all` 主动全量检查正文。
- `npm run build && npm run test:built`：先构建正式站点，再验证全部本地链接、图片与锚点、SEO、旧 URL、RSS、Sitemap、Giscus 配置和实际 Pagefind JS/WASM 中文查询。索引测试只读取本地文件，不需要网络或浏览器。
- `npm run check:migration`：本次迁移专用，确认原有 3 篇文章和 favicon 字节完全未变。它不进入常规 CI，不能作为禁止今后正常编辑文章的门禁。
- `npm run test:e2e`：在临时目录复制源码，注入本目录中的测试内容，再完成生产构建、Pagefind 索引、产物检查和浏览器回归。正式 `src/content/blog` 与 `dist` 不会被测试内容污染。
- `node tests/e2e/server.mjs --build-only`：仅运行隔离的测试内容构建及产物检查，不启动预览或浏览器。可用于诊断环境是否支持浏览器前的构建问题。

`fixtures/legacy-urls.json` 记录迁移前提交、文章完整哈希和 Frontmatter、已发布 URL、RSS/Sitemap、favicon 以及 Giscus 映射。

`fixtures/content` 中的 Markdown/MDX 仅用于测试。覆盖行号默认开启、关闭、从 42 开始、共用配置的 `<Code>` 组件、复制内容、中文目录、长代码和表格、草稿排除、显式 slug、嵌套路径、大小写、中文及 Unicode NFC 规范化。`Café.md` 的文件名刻意使用分解形式重音字符，不要将它重命名为组合形式。

浏览器测试默认屏蔽 Giscus 网络请求，并另测模拟 iframe 的主题同步契约。只有显式设置 `CHECK_LIVE_GISCUS=1` 才会检查真实第三方服务；本地契约通过不代表第三方服务当前可用。

CI 使用锁定的 Playwright 版本对应浏览器。若本地已有受信任的 Chromium，可设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指向其可执行文件；这不能绕过系统或沙箱的执行限制。`PLAYWRIGHT_PORT` 可覆盖默认预览端口 4322。

成功的布局用例也会保存截图：375 / 768 / 1440 px，浅色和深色，各覆盖首页、归档、搜索、关于、旧文章和排版测试文章，共 36 张。截图位于 `test-results/`，完整报告位于 `playwright-report/`；失败用例另存 trace。只有实际运行过的浏览器检查才能报告通过。
