# 架构说明

## 主题与保留边界

本站是 guog 的中文技术博客，生产地址为 `https://guog.github.io`。使用 Astro 7.3.8、Tailwind CSS 4、TypeScript、Markdown/MDX、Expressive Code 和 Pagefind。npm 依赖的实际版本以锁文件为准。

视觉、布局和交互严格对齐 Astro Cactus 8.3.0，固定提交为 [`728f1f4eeb80208398649261d7635f311cafa011`](https://github.com/chrismwilliams/astro-theme-cactus/tree/728f1f4eeb80208398649261d7635f311cafa011)。版权和许可见 [第三方声明](../THIRD_PARTY_NOTICES.md)。

采用上游等宽字体、窄幅页面、站点标识、导航、页脚、紧凑列表、文章 Masthead、响应式目录和搜索弹窗。界面为英文，文章和个人介绍为中文，HTML 语言仍为 `zh-CN`。不引入 Notes、Webmentions、演示内容、远程字体、动态 OG 图片或额外前端框架。

保留原站的 `blog` 集合、`pubDate`、文章地址、分类与标签元数据及 Giscus 映射。继续使用较新的 Astro 7.3.8，不复制上游的包管理器、检查或部署配置。新增依赖仅为 `@pagefind/component-ui` 与 `@tailwindcss/typography`。页脚按当前定制仅显示作者与年份，不重复主导航。

## 权威配置入口

- `src/site.config.ts`：站点身份、SEO、`Home / Blog` 导航和现有 Giscus 参数。
- `src/content.config.ts`：内容加载与 schema，继续使用 `src/content/blog/`。
- `astro.config.mjs`：静态构建、末尾斜杠、路由冲突检查、Expressive Code、MDX、Sitemap 和 Tailwind 集成。
- `ec.config.mjs`：代码配色、行号、英文控件与代码样式；Markdown、MDX 和 `<Code>` 共用。
- `src/styles/global.css`：Cactus token、Typography 插件和必要的可访问性、宽度约束；搜索组件样式位于 `src/styles/blocks/search.css`。
- `src/components/BaseHead.astro`：统一 SEO 和 favicon 声明。`public/` 根目录保存 7 个生成器文件，不另建图标生成流程。

Prettier 仍是唯一格式化工具。保留现有格式配置、排除范围和编辑器设置；`astro check` 负责类型检查。不要恢复重复的站点配置或加入另一套主题状态。

## 内容与 URL

文章从 `src/content/blog/` 加载，经 schema 校验、`getPublishedPosts()` 排序与过滤，再由 `/blog/{slug}/` 渲染。生产构建后，Pagefind 只索引带 `data-pagefind-body` 的文章；评论带忽略标记，不进入索引。

`getPublishedPosts()` 只排除 `draft: true`。未来日期不会自动隐藏；相同日期按 ID 排序。首页显示最新 10 篇，当前正式内容共 3 篇。年份归档使用 UTC 年份，日期界面按 UTC 日历日、`YYYY-MM-DD` 格式显示。

文章 ID 和链接继续共用 `normalizePostId()` 与 `getPostUrl()`。执行 NFC 归一化，拒绝空路径段、`.`、`..`、原始 `%`、`?`、`#`、反斜杠和控制字符。所有文章包括草稿均须具有唯一 ID，构建同时拒绝路由冲突。旧文章、图片、slug、canonical 和评论路径不因主题变化改写。

标签链接统一使用 `getTagUrl()`，逐段编码。标签详情使用 catch-all 路由，支持中文和 `CI/CD` 等含斜杠标签。标签与分类元数据、RSS 和搜索筛选继续保留。旧分类锚点定位到该分类首篇文章，旧标签锚点定位到 Tags 侧栏中对应链接。

## 路由与组件

- `/`：作者简介、GitHub 链接和最新文章列表。
- `/blog/`：按年份分组的全部文章与 Tags 侧栏。
- `/blog/{slug}/`：文章、目录、代码、评论和返回顶部按钮。
- `/tags/`、`/tags/{tag}/`：标签索引、计数和对应文章列表。
- `/search/`：独立 Pagefind 搜索页；各页页眉另有搜索弹窗。
- `/rss.xml`、Sitemap 和 `/robots.txt`：保留现有生成方式。
- `/404.html`：英文错误页，带 `noindex`，不进入 Sitemap。

About 页面已按作者要求移除，`/about/` 返回 404；页眉、页脚和 Sitemap 不再包含该入口。历史迁移基线保留原记录，生产检查单独声明已退役页面。

`Base.astro` 提供 HTML 结构、主题初始化、跳到正文链接、页眉和页脚。`BaseHead.astro` 生成唯一的页面元数据与 canonical；只有提供 `ogImage` 时输出分享图片。

文章布局的目录使用原生 `details`，收录 H2～H4。`lg` 起在正文右侧固定，窄屏在正文前。Masthead 展示标题、日期、阅读时间、更新日期和标签；简介与分类仍提供给 SEO 或搜索。阅读时间继续使用现有中英文估算函数。

## 主题、代码与搜索

`ThemeProvider.astro` 在头部同步初始化 `html[data-theme]`。默认跟随系统，手动选择保存到 `localStorage.theme`。存储不可用时仍可切换；跨标签页与页面恢复继续同步。界面只显示一个深浅色按钮，不显示旧“自动”按钮。

按钮发出 `theme-change`，Provider 应用主题后发出 `theme-changed`。代码和 Giscus 共用此状态，不使用 `html.dark`。代码继续采用 `github-light` 与 `dracula`，默认开启行号，保留高亮、复制和按块配置能力。控件语言改为英文。

搜索弹窗使用上游 `@pagefind/component-ui`，空闲时加载；仅生产预览具有完整索引。组件显式设置英文界面，索引仍为中文。独立搜索页继续使用现有 Default UI。两者读取同一套本地 `/pagefind/` 索引。

## favicon 与评论

favicon 来源为本次指定的 RealFaviconGenerator 资源包，安装在 `public/` 根目录。`BaseHead.astro` 每页各输出一次 PNG、SVG、ICO、Apple Touch Icon、应用标题和 manifest 声明，资源参数为 `?v=20261022`。manifest 保留生成器的名称、白色主题与背景色、`standalone` 模式和 192、512 px 图标。页眉 LOGO 也引用 `/favicon.svg?v=20261022`，与浏览器图标共用资源；保留上游布局和响应式尺寸，并使用 `object-contain` 保持图像比例。

Giscus 参数保持不变：仓库 `guog/guog.github.io`，仓库 ID `R_kgDOVIqxYA`，分类 `General`，分类 ID `DIC_kwDOVIqxYM4DIZa2`，映射 `pathname`，语言 `zh-CN`。评论标题为英文，第三方评论界面仍为中文。

本地回归通过参数和模拟 iframe 检查主题消息。真实评论依赖外部网络、Discussions 和 App 权限，须另行验收。

## 验证与部署

保留工程检查命令和唯一工作流 `.github/workflows/site.yml`。PR 只验证；人工审核合并后，`main` 再次验证，成功才部署 Pages 和按需发布 Release。权限、版本和回滚规则见 [贡献指南](CONTRIBUTING.md)。

生产检查覆盖本地链接、图片、锚点、favicon 声明及文件、manifest、canonical、RSS、Sitemap 和中文搜索。浏览器检查覆盖布局、菜单、搜索弹窗、标签、目录、代码与主题。历史迁移基线和审计脚本保持原样；新 favicon 已授权替换，不要求与历史图标哈希一致。

Expressive Code 和 Typography 的 `postcss-selector-parser` 精确覆盖为 `7.1.6`，修复 [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)。该解析器用于构建。升级依赖后应重新核对覆盖是否仍必要，不使用强制降级解决告警。
