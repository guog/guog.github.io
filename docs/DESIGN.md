# 设计规范

## 目标与实现入口

沿用 Astro Cactus 的内容优先、窄幅布局、少量强调色和虚线分隔。中文可读性优先，不改成卡片墙，不增加无必要的装饰动画。

设计实现以 `src/styles/global.css` 为准，页面外框在 `src/layouts/Base.astro`，代码样式在 `ec.config.mjs`。本文件记录当前值；修改时同步源码、文档和浏览器回归。

## 字体、字号与宽度

- `--font-sans`：`-apple-system`、`BlinkMacSystemFont`、`Segoe UI`、`PingFang SC`、`Hiragino Sans GB`、`Microsoft YaHei`、`Noto Sans SC`、`sans-serif`。使用系统回退，不下载整套中文字体。
- `--font-mono`：`ui-monospace`、`SFMono-Regular`、`Menlo`、`Monaco`、`Consolas`、`Noto Sans Mono CJK SC`、`monospace`。用于代码、预格式文本和键盘标识。
- 正文 `17px`、行高 `1.85`；视口宽度不超过 `639px` 时为 `16px`。
- H1 使用 `clamp(1.75rem, 4vw, 2rem)`，H2 为 `1.35rem`，H3 为 `1.15rem`；标题行高为 `1.45`。首页引言有独立的响应式字号。
- `Base.astro` 使用 Tailwind `max-w-3xl`，外框最大 `48rem`。水平内边距为 `1.25rem`，`sm` 起为 `2rem`；默认根字号下，宽屏正文可用宽度约 `704px`。
- 正文允许长链接换行，图片最大宽度为容器宽度。代码块和表格局部滚动，不能撑宽整页。

不要把正文改为等宽字体，不在单个页面硬编码另一组全站字体或宽度。

## 颜色 token

以下值按“浅色；深色”列出，均为源码中的 `oklch()` 参数：

- `--color-global-bg`：`98.48% 0 0`；`23.64% 0.0045 248`。
- `--color-global-text`：`26.99% 0.0096 235.05`；`83.54% 0 264`。
- `--color-muted`：`44.6% 0.03 256.802`；`70.7% 0.022 261.325`。
- `--color-link`：`49% 0.0431 185.69`；`70.44% 0.1133 349`。
- `--color-accent`：`55.27% 0.195 19.06`；`70.91% 0.1415 163.7`。
- `--color-accent-2`：`18.15% 0 0`；`94.66% 0 0`。
- `--color-quote`：`55.27% 0.195 19.06`；`94.8% 0.106 136.49`。

背景、正文、次要文字、强调元素和引用统一引用 token。浅色默认在 `@theme` 定义，深色在 `html[data-theme='dark']` 覆盖。分隔线由 `--color-muted` 与透明色混合，不引入独立硬编码灰色体系。

Pagefind 的 `--pagefind-ui-primary`、`--pagefind-ui-text`、`--pagefind-ui-background`、`--pagefind-ui-border` 等变量直接映射本站颜色。调整颜色后同时检查正文、搜索、代码和评论区域的对比度，不仅检查首页。

## 间距与内容样式

源码直接使用 `rem` 间距，没有额外的 `--space-*` token。

- 正文段落上下间距 `1rem`；H2 的上、下间距分别为 `2.4rem`、`1rem`。
- 列表左缩进 `1.5rem`，列表项上下间距 `0.35rem`，嵌套列表上下间距 `0.5rem`。
- 引用使用 `2px` 左边线、`1.2rem` 左内边距和次要文字色。
- 行内代码使用 `0.88em` 字号、细虚线边框和轻量内边距。
- 文章列表以虚线分隔，保留日期、分类、摘要和标签。避免为每篇文章增加大色块或阴影。
- 目录在正文前，使用原生可折叠 `details` 和 H2～H4 嵌套列表；手机端仍在文档流内，不悬浮遮挡正文。
- 表格为局部横向滚动容器。内容编排仍优先使用列表；不要靠缩小整页字号容纳表格。

## 代码与主题

`ec.config.mjs` 配置的代码字号为 `0.875rem`、行高 `1.75rem`、水平内边距 `1rem`、圆角 `4px`，取消框架阴影。默认行号、文件名和复制功能由 Expressive Code 管理；`defaultLocale` 为 `zh-CN`，通过 `pluginFramesTexts` 提供中文终端标题和复制提示，不叠加另一套高亮器。

代码块采用浅色 `github-light` 与深色 `dracula`，选择器为 `[data-theme='light']` 和 `[data-theme='dark']`。允许代码自身横向滚动，复制文本必须保留原始代码且不包含视觉行号。

主题由 `ThemeProvider.astro` 统一应用。所有组件读取 `data-theme`，不要通过添加 `html.dark`、另设存储键或单独跟随媒体查询形成第二套状态。

## 可访问性与验收

- 保留跳到正文链接、语义标题、`nav` 标签、按钮名称和可见焦点。
- `:focus-visible` 为 `2px` 强调色描边，偏移 `5px`。不得仅靠颜色表达当前导航或选择状态。
- 主题切换使用有可访问名称的按钮；深色开关同步 `aria-checked`，“自动”按钮同步 `aria-pressed`。
- 图片提供有效 `alt`。表格、代码、目录和长链接在窄屏可操作。
- 只有 `prefers-reduced-motion: no-preference` 时启用平滑滚动；不要为减少动画的用户强制添加过渡。
- UI 变更至少在 `375px`、`768px`、`1440px` 检查首页、归档、中文长文和搜索，并覆盖浅色、深色及键盘操作。
- 检查主题切换、刷新、页面导航、返回和恢复系统主题。整页不能出现意外水平溢出，代码与表格的局部滚动除外。

浏览器测试命令和生产预览要求见 [贡献指南](CONTRIBUTING.md#本地命令)。自动化不能替代人工阅读与视觉检查。
