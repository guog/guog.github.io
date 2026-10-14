# guog 的博客

基于 [Astro](https://astro.build/) 的个人博客，简洁实用、中文为主，
部署在 GitHub Pages：https://guog.github.io

## 功能

- 中文内容，`zh-CN`，系统字体栈，阅读宽度适中
- 深色模式：跟随系统默认，可手动切换，`localStorage` 记忆选择
- 站内搜索：[pagefind](https://pagefind.app/)（支持中文），构建时自动生成索引
- RSS：`/rss.xml`
- Sitemap：`@astrojs/sitemap` 自动生成
- SEO：canonical、description、Open Graph、Twitter 卡片
- 评论：giscus 预留位（默认未启用，按下方步骤配置）
- 移动端友好，无花哨动画

## 本地运行

需要 Node.js >= 22。

```sh
npm install
npm run dev      # 本地预览，默认 http://localhost:4321
```

注意：站内搜索的索引只在构建后生成，`dev` 模式下搜索页会提示先构建。

```sh
npm run build    # 构建 + 自动生成 pagefind 搜索索引（postbuild）
npm run preview  # 预览构建产物
```

## 写文章

在 `src/content/blog/` 下新建 Markdown 文件，frontmatter 示例：

```md
---
title: '文章标题'
description: '一句话简介'
pubDate: '2026-10-20'
category: '技术'        # 分类：技术 / 随笔 / 翻译 …
tags: ['Astro', '笔记'] # 标签
---

正文用 Markdown 写……
```

首页按时间倒序列出全部文章，`/blog` 是按分类分组的归档页。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，命名为 `guog.github.io`（用户站点仓库名必须与用户名一致）；
2. 把本目录代码 push 到该仓库的 `main` 分支；
3. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**；
4. push 后 `.github/workflows/deploy.yml` 会自动构建并部署到 https://guog.github.io。

`site` 已配置为 `https://guog.github.io`（见 `astro.config.mjs`）。

## 启用评论（giscus）

评论默认是占位状态。启用步骤：

1. 在博客源码仓库开启 **Discussions**（Settings → General → Features）；
2. 给该仓库安装 [giscus App](https://github.com/apps/giscus)；
3. 打开 https://giscus.app/zh-CN ，按向导选择：
   - 仓库：填源码仓库，如 `guog/guog.github.io`
   - 页面 ↔ discussion 映射关系：选择 `pathname`
   - Discussion 分类：选择一个分类（如 Announcements），勾选「只在启用时显示」
   - 主题：任意（本站会自动跟随深浅色）
4. 把页面生成的四个参数填到 `src/consts.ts` 的 `GISCUS` 对象里：

```ts
export const GISCUS = {
  repo: 'guog/guog.github.io', // 仓库名
  repoId: 'R_kgDOGxxxx',       // 仓库 ID（giscus 页面给出）
  category: 'Announcements',   // Discussion 分类名
  categoryId: 'DIC_kwDOGxxxx', // 分类 ID（giscus 页面给出）
  mapping: 'pathname',
  lang: 'zh-CN',
};
```

5. 重新构建部署，文章页底部即出现评论框。读者用 GitHub 账号登录即可评论。

## 目录结构

```
src/
  components/   # BaseHead（SEO+深色初始化）、Header（含主题切换）、Footer、Giscus、FormattedDate
  content/blog/ # Markdown 文章（技术 / 随笔 / 翻译）
  layouts/      # BlogPost 文章页布局
  pages/        # index（首页文章列表）、blog（归档）、search（站内搜索）、about、rss.xml.js
  styles/       # global.css（浅色/深色变量、排版）
.github/workflows/deploy.yml  # GitHub Pages 自动部署
```
