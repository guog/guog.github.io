# 第三方声明

## Astro Cactus

本项目的布局和视觉基础改编自 [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus)：

- 上游版本：8.3.0。
- 固定提交：[728f1f4eeb80208398649261d7635f311cafa011](https://github.com/chrismwilliams/astro-theme-cactus/tree/728f1f4eeb80208398649261d7635f311cafa011)。
- 作者：Chris Williams。
- 来源许可：[上游 MIT License](https://github.com/chrismwilliams/astro-theme-cactus/blob/728f1f4eeb80208398649261d7635f311cafa011/LICENSE)。

适配涉及基础布局、文章布局、导航和页脚组织、文章列表与目录、`data-theme` 主题机制、Tailwind CSS 4 结构及 Cactus 色彩体系。本项目还原上游等宽排版与布局，保留中文文章、原博客内容模型和 `/blog/` 路由。未引入 Notes、演示文章或 Webmentions。实现差异见 [架构说明](docs/ARCHITECTURE.md)。

以下保留上游许可全文。该许可针对上游软件及其衍生部分；它不代表原有博客文章、第三方引用或图片被重新授予 MIT 许可。

```text
MIT License

Copyright (c) 2022 Chris Williams

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Starlight 目录辅助函数

`src/utils/generateToc.ts` 沿用 Cactus 中的目录生成逻辑。该文件注明参考 [Starlight 的 generateToC.ts](https://github.com/withastro/starlight/blob/main/packages/starlight/utils/generateToC.ts)。保留此来源说明及 [Starlight MIT License](https://github.com/withastro/starlight/blob/main/LICENSE) 中的版权归属：

```text
Copyright (c) 2023 [Astro contributors](https://github.com/withastro/starlight/graphs/contributors)
```

该部分同样适用上文完整列出的 MIT 许可条款。

## 依赖与文章素材

npm 依赖保留各自许可证，以锁定版本对应包中的许可文件为准。文章引用、翻译和图片应在相应文章中标明原作者、来源和适用许可。本声明不替代这些权利说明。

## favicon 资源

本次 favicon 由用户通过 [RealFaviconGenerator](https://realfavicongenerator.net/) 生成，并授权安装。来源目录为 `https://realfavicongenerator.net/files/a38aee4e-bdbd-4956-8282-fa2143757230/`。

`public/` 根目录保留下载的 SVG、96 px PNG、ICO、180 px Apple Touch Icon、192/512 px manifest 图标和 `site.webmanifest`。安装不改变原始图像或 manifest 内容。此来源说明不重新授予底图或品牌标识的许可。
