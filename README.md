# guog 的博客

中文技术笔记、实践心得与翻译，发布于 <https://guog.github.io>。基于 Astro 7 与 [Astro Cactus 8.3.0](https://github.com/chrismwilliams/astro-theme-cactus/tree/82eabb6151a8e47838cb7f6d12ea29451926bd3e)，保留 `/blog/{slug}/` 文章地址。

- 中文无衬线排版，移动端可读，支持浅色、深色及跟随系统。
- Markdown/MDX、分类与标签、文章目录、默认带行号的 Expressive Code。
- Pagefind 中文搜索、RSS、Sitemap、SEO 和保留原映射的 Giscus 评论。
- PR 质量检查，`main` 验证通过后部署 GitHub Pages，再按需生成 SemVer Release。

## 本地运行

推荐使用 `.nvmrc` 指定的 Node.js 24.19.0；最低要求为 Node.js 24.0.0。使用 npm 和现有锁文件。

```bash
npm ci
npm run dev
```

开发地址默认是 `http://localhost:4321`。搜索索引在构建后生成，应使用生产预览验证：

```bash
npm run build
npm run preview
```

`build` 完成后 npm 自动运行 `postbuild`，无需再次手动生成 Pagefind 索引。

## 写文章与验证

新文章放在 `src/content/blog/`。读取 [内容规范](docs/CONTENT.md)，填写 `title`、`description` 和 `pubDate`，可添加分类、标签与草稿标记。文章正文从 `##` 开始，保留已发布的文件名和 URL。

```bash
npm run check
npm run lint:content
npm run test
npm run build
npm run test:built
npm run test:e2e
```

浏览器测试首次需要 `npx playwright install chromium`。完整命令、测试范围、分支和发布流程见 [贡献指南](docs/CONTRIBUTING.md)。

## 工作流与配置

所有变更都从 `feat/*` 或 `fix/*` 分支发起 PR，提交和 PR 标题使用 Conventional Commits。不要直接修改或推送 `main`。PR 不部署生产；人工审核合并后，由唯一工作流 `.github/workflows/site.yml` 验证、部署和发布。

- `src/site.config.ts`：站点信息、导航与现有 Giscus 参数。
- `src/content.config.ts`：`blog` 内容集合与 frontmatter schema。
- `src/content/blog/`：文章；`src/pages/`：页面与 RSS、robots 输出。
- `src/layouts/`、`src/components/`：公共布局和文章组件。
- `src/styles/global.css`：中文排版和主题 token。
- `astro.config.mjs`：Astro、MDX、Tailwind CSS 和 Sitemap 集成。
- `ec.config.mjs`：Expressive Code 及行号插件配置。
- `scripts/`、`tests/`：内容、URL、浏览器和发布规则检查。

Giscus 已配置为 `guog/guog.github.io` 的 `General` 分类，按 `pathname` 关联评论。更换主题不需要重新配置；外部 Discussions 与 App 权限仍须保持有效。

GitHub 分支保护、Squash merge、Pages 发布源和 Environment 规则须由管理员核实，参见 [待人工设置清单](docs/CONTRIBUTING.md#github-仓库设置待人工核实)。仓库内的配置文件不等于这些设置已经生效。

## 文档导航

- [AGENTS.md](AGENTS.md)：Agent 开工与交付约定。
- [架构说明](docs/ARCHITECTURE.md)：内容流、路由、组件职责和上游差异。
- [设计规范](docs/DESIGN.md)：真实 token、排版和可访问性。
- [内容规范](docs/CONTENT.md)：中文写作、元数据、代码与发布自查。
- [贡献指南](docs/CONTRIBUTING.md)：分支、提交、CI、SemVer 和回滚。
- [第三方声明](THIRD_PARTY_NOTICES.md)：Cactus 来源、版权和 MIT 许可。

站点版本以 `vMAJOR.MINOR.PATCH` 标签与 GitHub Release 为准。`package.json` 保持 `private: true`，其版本字段不是站点发布版本，不向 npm 发布。
