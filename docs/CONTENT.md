# 内容规范

## 写作依据

新增或修改的中文文章、中文项目文档遵循阮一峰《中文技术文档的写作规范》。写作和审稿前阅读相关原文：

- [总入口](https://github.com/ruanyf/document-style-guide/)
- [标题](https://github.com/ruanyf/document-style-guide/blob/master/docs/title.md)
- [文本](https://github.com/ruanyf/document-style-guide/blob/master/docs/text.md)
- [段落](https://github.com/ruanyf/document-style-guide/blob/master/docs/paragraph.md)
- [数值](https://github.com/ruanyf/document-style-guide/blob/master/docs/number.md)
- [标点符号](https://github.com/ruanyf/document-style-guide/blob/master/docs/marks.md)
- [文档体系](https://github.com/ruanyf/document-style-guide/blob/master/docs/structure.md)

下面是仓库内的执行约定，不替代原文，也不要求复制其示例。

## 文件与元数据

文章放在 `src/content/blog/`，支持 `.md` 和 `.mdx`。新文件使用小写英文、数字和连字符，例如 `astro-content-guide.md`。普通文章优先 Markdown；确需组件时再使用 MDX，不为文章新增前端框架。

内容 schema 的唯一来源为 `src/content.config.ts`。最小示例：

```yaml
---
title: 'Astro 内容集合的实践'
description: '介绍内容集合的建模方法、验证方式和常见限制。'
pubDate: '2026-10-14'
category: '技术'
tags: ['Astro', '工程实践']
draft: true
---
```

字段约定：

- `title`：必填字符串，也是页面唯一的一级标题。
- `description`：必填字符串，用于文章摘要和 SEO。
- `pubDate`：必填有效日期，使用带引号的 `YYYY-MM-DD`。内容校验不接受其他日期格式。
- `updatedDate`：可选日期；实质更新时填写，不早于 `pubDate`。
- `category`：可选字符串，默认 `技术`；优先复用已有分类。
- `tags`：可选字符串数组，默认空数组；保持同一术语的大小写一致，不重复添加。
- `draft`：可选布尔值，默认 `false`；草稿不进入正式文章列表、路由、RSS、Sitemap 和搜索索引。
- `slug`：可选非空相对路径，显式覆盖文章 ID。不能含前后斜杠、空白路径段、`.`、`..`、原始 `%`、`?`、`#`、反斜杠或控制字符。
- `coverImage`：可选对象；`src` 为 Astro 可解析的本地图片路径，`alt` 为非空说明。用于文章顶部封面。
- `ogImage`：可选图片 URL 或站内根路径，用于分享元数据；不会自动从封面生成。

站点只按 `draft` 过滤，不按当前时间过滤。未来日期的文章也会发布，不能用 `pubDate` 代替草稿或定时发布。日期界面按 UTC 日历日、`YYYY-MM-DD` 格式显示；文章内容仍可使用中文。

可选图片示例（须先创建实际图片文件）：

```yaml
coverImage:
  src: './images/astro-guide.png'
  alt: '内容集合加载、校验与生成页面的流程'
ogImage: '/images/astro-guide-share.png'
```

不要使用上游 Cactus 的 `publishDate` 或 `content/posts/` 模型。不要仅凭添加未知 frontmatter 字段就假定功能已实现。

## URL 与历史内容

文章通过 `/blog/{slug}/` 发布。未设置 `slug` 时，文章 ID 是相对于内容目录的文件路径去掉扩展名，保留大小写、中文和嵌套目录。加载器和 `getPostUrl()` 共用 `src/utils/blog.ts` 的 `normalizePostId()`，先以 Unicode NFC 规范化字符，再校验路径。`getPostUrl()` 对每个路径段编码；不要在 `slug` 中预先写 `%E4...` 等编码串。新增嵌套文件前，检查实际构建的 ID、路由和 canonical。所有站内文章链接采用含末尾斜杠的稳定路径。

所有文章（包括草稿）在归一化后必须具有唯一 ID。相同文件名的 `.md` 与 `.mdx`、重复的显式 `slug`、Unicode 写法不同但 NFC 结果相同的路径都会产生冲突。内容检查拒绝重复 ID，构建拒绝预渲染路由冲突。

已发布的 slug、文件路径和 URL 是兼容契约。禁止为统一命名而重命名旧文件；Giscus 按 `pathname` 关联评论，路径改变也会影响评论。不要手工拼接另一套 `/posts/` 地址。

迁移基线保存在 `tests/fixtures/legacy-urls.json`。其中标记 `retired: true` 的 3 篇示例文章已按作者要求删除，生产检查确认其页面、导航和订阅均不再出现，其余 URL 回归长期执行；`node scripts/check-migration.mjs` 的正文和文件哈希检查只用于迁移验收，不限制之后获得授权的文章修改。旧文只在实际编辑时渐进修订，禁止为通过风格检查批量改写。

## 中文排版与文章结构

- 开头交代问题、读者和适用条件，正文按逻辑推进，结尾说明结论或实践要点。
- Frontmatter 的 `title` 生成 `<h1>`，正文从 `##` 开始。标题不跳级，最多使用四级，避免孤立子标题和上下级同名。
- 一段围绕一个主题，段落间空一行。采用简短、明确的主动句，避免营销语气、双重否定和指代不明。
- 中文与英文、数字之间统一留一个半角空格，例如 `使用 Astro`、`检查 3 篇文章`。数值使用半角数字，技术单位通常写成 `16 GB`、`200 ms`。
- 中文句子使用全角标点，完整英文句子使用英文标点。中文标点与相邻英文、数字之间不加空格。
- 优先用列表表达并列关系。只有二维数据确实更清晰时才使用表格，并检查窄屏滚动。
- 技术结论须说明背景与限制；重要缩写首次出现时按读者需要解释，术语前后一致。
- 引用、翻译和图片须标明原作者、原链接和许可范围，不大段复制受版权保护的内容。

排版工具不得改动代码块、行内代码、URL、路径、配置键、命令或原始日志。

## 代码示例

代码围栏标明语言。Expressive Code 的唯一配置为根目录 `ec.config.mjs`，默认显示行号，支持文件名、行高亮和英文复制按钮。代码框的终端标题、复制提示与复制成功提示使用英文，与主题界面保持一致。复制内容不应含视觉行号。

````markdown
```typescript title="greet.ts" {2}
function greet(name: string): string {
  return `你好，${name}`
}
```

```bash showLineNumbers=false
npm ci
npm run dev
```

```python title="greet.py" startLineNumber=42 {2}
def greet(name: str) -> str:
    return f"你好，{name}"
```
````

`showLineNumbers=false` 只关闭当前块的行号，适用于终端命令。`startLineNumber=42` 只改变显示数字；上例 `{2}` 仍高亮源代码的第 2 行，显示为第 43 行。详见 [行号插件](https://expressive-code.com/plugins/line-numbers/) 与 [行高亮](https://expressive-code.com/key-features/text-markers/)。

示例应能复现；省略必要上下文时明确标注为示意代码。不要为了截图效果把行号写进代码文本。

## 图片、链接与 MDX

图片提供有意义的 `alt`，说明图中对读者有用的信息。公共静态文件放在 `public/`，引用时从站点根路径开始，例如 `/images/example.png`；新增素材时检查文件确实存在，并保留来源。

内部链接优先使用 `/blog/example/` 等稳定路径。标题锚点以 Astro 实际生成的 `id` 为准，尤其要检查中文、重复标题和标点。修改标题时检查指向它的旧锚点。

MDX 中的表达式和导入必须可构建。代码样例中的花括号等语法放进代码围栏，避免被当作 MDX 表达式。不要从文章引入未经审查的远程脚本。

## 自查与发布

1. 先阅读 `AGENTS.md` 与本规范，在 `feat/*` 或 `fix/*` 分支工作。
2. 确认读者、结构、来源和合法 frontmatter；草稿显式写 `draft: true`。
3. 检查标题、段落、中英空格、数值、标点、术语、图片说明和引用。
4. 运行 `npm run lint:content`、`npm run check`、`npm run test`、`npm run build`、`npm run test:built`；UI 或渲染行为有变化时运行 `npm run test:e2e`。
5. 用 `npm run preview` 检查生产输出，特别是中文搜索、目录、代码块、375 px 窄屏和深浅色。
6. 提交使用 `feat(content): ...` 或 `fix(content): ...`，发起 PR。CI 通过、人工审核并合并 `main` 后，由 GitHub Actions 验证和部署。

`lint:content` 对所有文章检查 frontmatter，对比较基线以来新增或改动的文章检查正文结构。工作分支默认与 `main` 的共同祖先比较，`main` 默认与前一提交比较；CI 会提供相应基线。未跟踪的新文章也会检查。可以用 `npm run lint:content -- --base <git-ref>` 或 `CONTENT_BASE_REF` 指定比较基线，或用 `--all` 主动检查全部正文。它不能判断自然语言是否准确，也不会自动改写历史文章。完整命令与发布规则见 [贡献流程](CONTRIBUTING.md)。

## 署名和机器阅读

`contentKind` 默认为 `original`。原创可设置 `author`；未设置时沿用站点作者。译文必须设置 `contentKind: translation` 和 `source`，包含原作 `title`、HTTP/HTTPS `url`、`publishedDate`，以及核实后可填的 `author`。人员记录使用 `name`、可选 `type`（`Person` 或 `Organization`）和公开 `url`；译者使用独立的 `translator` 字段。未知身份省略，页面明确显示未注明，不推断译者是站点作者。原创不能声明译者或译作关系。

原作日期与译文的 `pubDate`、`updatedDate` 各有含义，不互相替换。摘要向人可见，与 SEO 和 Markdown 导出共用 description；仅概括正文已有判断和限制。新增或修改描述不需要批量改写历史正文。

构建为每个公开 HTML 页面生成 Markdown：目录 URL 使用 `index.md`，`/404.html` 使用 `/404.html.md`。代码、表格、脚注、图片说明及章节引用须保真。MDX 经 Astro 求值后导出，不公开 import、JSX 或表达式源码；客户端组件须提供有意义的静态文本，无法表达时停止构建。对话提示词、评论和复制控件不属于正文导出，也不进入 Pagefind 索引。
