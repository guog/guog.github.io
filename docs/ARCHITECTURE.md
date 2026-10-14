# 架构说明

## 范围与主题来源

本站是仅专注 Blog 的中文静态网站，生产地址为 `https://guog.github.io`。使用 Astro 7.3.8、Tailwind CSS 4、TypeScript、Markdown/MDX、Expressive Code 和 Pagefind；依赖的实际版本以 `package-lock.json` 为准。

视觉和组件基础来自 Astro Cactus 8.3.0，固定提交为 [`82eabb6151a8e47838cb7f6d12ea29451926bd3e`](https://github.com/chrismwilliams/astro-theme-cactus/tree/82eabb6151a8e47838cb7f6d12ea29451926bd3e)。MIT 版权与许可保存在 [第三方声明](../THIRD_PARTY_NOTICES.md)。

保留 Cactus 的窄幅基础布局、仙人掌标识、页眉页脚组织、文章列表、Masthead、目录、色彩体系、`data-theme` 和 Expressive Code。以下是有意保留的本地差异：

- 继续使用 `src/content/blog/`、`blog` 集合、`pubDate` 和 `/blog/{slug}/`，不切换为上游 `posts` 模型。
- 维持原博客文章、分类、标签和 Giscus Discussion 映射。
- 全站简体中文，正文使用中文系统无衬线字体；代码保持等宽字体。
- 使用原站较新的 Astro 7.3.8，不为对齐上游 package.json 降级到 7.3.2。
- 不引入 Notes、Webmentions、作品集、演示文章、远程字体、动态 OG 图片或额外前端框架。
- 使用小型原生组件和 CSS 管理博客排版；不整体复制上游插件与依赖。

## 权威配置入口

- `src/site.config.ts`：`siteConfig` 定义身份、站点 URL、语言和 SEO 基础信息；`menuLinks` 定义导航；`giscusConfig` 保留评论参数。
- `src/content.config.ts`：内容加载与 schema。详细字段见 [内容规范](CONTENT.md)。
- `astro.config.mjs`：站点地址读取 `siteConfig.url`；统一末尾斜杠；`prerenderConflictBehavior: "error"` 拒绝预渲染路由冲突；注册 Expressive Code、MDX、Sitemap 和 Tailwind Vite 插件。
- `ec.config.mjs`：代码主题、行号插件和代码样式，供 Markdown、MDX 及 `<Code>` 共用。
- `src/styles/global.css`：Tailwind CSS 4 层、颜色、字体和布局样式。

不要恢复旧 `src/consts.ts` 或新增重复配置。更新配置后同步相关文档与测试。

## 内容到静态页面

```text
src/content/blog/**/*.{md,mdx}
  -> src/content.config.ts：glob 加载与 schema 校验
  -> src/data/blog.ts：过滤 draft、按 pubDate 倒序
  -> src/pages/blog/[...slug].astro：getStaticPaths 与 render()
  -> BlogPost / Base 布局和文章组件
  -> dist/blog/{slug}/index.html
  -> npm postbuild：dist/pagefind/ 搜索索引
```

文章 ID 默认取相对文件路径并去掉扩展名，可用 `slug` 显式覆盖。加载器和 `getPostUrl()` 统一调用 `src/utils/blog.ts` 的 `normalizePostId()`：先执行 Unicode NFC 归一化，再拒绝空白路径段、`.`、`..`、原始 `%`、`?`、`#`、反斜杠和控制字符，保留中文、大小写和嵌套结构。`getPostUrl()` 在 URL 边界逐段编码，统一供列表和 RSS 使用，末尾保留 `/`。

内容校验器拒绝归一化后重复的文章 ID，草稿也参与检查；Astro 同时以错误处理预渲染路径冲突。新增文章不能覆盖另一篇文章或 `/blog/` 归档。原有 3 篇文章的 URL 不变。

`getPublishedPosts()` 是公开内容筛选的唯一入口，只排除 `draft: true`。未来日期不会自动隐藏，定时发布尚未实现。日期相同的文章再按 ID 排序，保持输出稳定。

`src/utils/blog.ts` 同时提供中文与非中文词数结合的阅读时间估算，以及分类、标签锚点 ID。阅读时间是估算值，不是统计承诺。

## 路由与组件职责

- `/`：首页介绍及全部已发布文章的倒序列表。
- `/blog/`：分类归档和标签索引；标签在本页展开相应文章，不新增一套标签页面。
- `/blog/{slug}/`：文章详情、目录、代码和评论。
- `/search/`：Pagefind 中文搜索。
- `/about/`：作者与站点介绍。
- `/rss.xml`：已发布文章的标题、简介、日期、分类和标签。
- `/sitemap-index.xml`、`/sitemap-0.xml`：Sitemap 集成生成的站点地址。
- `/robots.txt`：允许抓取，并指向 Sitemap。
- `/404.html`：中文错误页，带 `noindex`，不进入 Sitemap。

`layouts/Base.astro` 提供文档结构、中文 `lang`、SEO、主题初始化、跳到正文链接和公共导航。`BaseHead.astro` 统一生成 title、description、canonical、Open Graph 和 Twitter 元数据；只有传入 `ogImage` 才输出分享图片，不生成远程 OG 图片。

`layouts/BlogPost.astro` 组织文章，`blog/Masthead.astro` 输出封面、唯一 H1、日期、分类、标签和阅读时间。`blog/PostPreview.astro` 负责文章列表。`blog/TOC.astro` 和 `TOCHeading.astro` 使用 Astro 渲染后的 heading slug，目录只收录 H2～H4，使用可折叠的原生 `details`。

## 主题、代码与搜索

`ThemeProvider.astro` 在文档头部同步初始化 `html[data-theme]`，避免加载时先显示错误主题。默认跟随系统；手动选择保存为 `localStorage.theme` 的 `light` 或 `dark`。选择“自动”会移除该存储值，恢复跟随系统。

`ThemeToggle.astro` 发出 `theme-change` 请求，Provider 应用后发出 `theme-changed`。系统变化、跨标签页存储事件和页面恢复均同步。`data-theme-preference` 只记录选择来源，实际配色只由 `data-theme` 决定；不存在 `html.dark` 并行机制。

Expressive Code 采用 `dracula` 与 `github-light`，通过相同的 `data-theme` 选择器切换。`defaultLocale: 'zh-CN'` 与 `pluginFramesTexts` 统一提供“终端窗口”“复制代码”“已复制”文案。行号默认启用，按块覆盖方式见 [内容规范](CONTENT.md#代码示例)。

`npm run build` 自动触发 `postbuild`，Pagefind 对 `dist/` 生成索引。文章的 `data-pagefind-body` 限定搜索主体，标题、简介、分类和标签提供搜索元数据；评论位于主体外并带忽略标记。搜索页加载本地 `/pagefind/` 资源，样式变量沿用本站 token。开发服务器不生成搜索索引。

## Giscus 与外部服务

评论已配置，参数集中在 `src/site.config.ts`：

- `repo`：`guog/guog.github.io`。
- `repoId`：`R_kgDOVIqxYA`。
- `category`：`General`。
- `categoryId`：`DIC_kwDOVIqxYM4DIZa2`。
- `mapping`：`pathname`；语言为 `zh-CN`。

`Giscus.astro` 加载官方脚本，初始配色与页面一致；收到主题事件后向 `https://giscus.app` 的 iframe 发送主题设置。保持旧路径才能保持原 Discussion 关联。

本地测试可以验证参数、容器和主题消息；真实评论加载仍依赖网络、Giscus App、Discussions 和仓库权限。不能把模拟通过当作第三方服务在线验收。

## 质量与部署边界

`scripts/` 和 `tests/` 负责内容、旧 URL、生产 HTML、链接、代码渲染、中文搜索和浏览器回归。`tests/fixtures/legacy-urls.json` 保存迁移来源提交、文章摘要、哈希、旧地址及评论参数；正文哈希只用于一次性迁移验收。

唯一 CI/CD 入口 `.github/workflows/site.yml` 区分 PR 校验与生产发布：`Validate PR` → `Verify site`；只有 `main` push 才继续 `Deploy Pages` → `Release site`。部署使用已验证的 `dist/`，发布器只处理版本标签与 GitHub Release。

工作流、版本规则、最小权限、失败恢复和待人工设置项见 [贡献指南](CONTRIBUTING.md)。不要通过新增独立部署工作流绕过这些门禁。
