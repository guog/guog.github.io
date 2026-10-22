# 贡献与发布流程

本流程适用于文章、勘误、配置、样式、依赖、测试和文档。生产地址为 <https://guog.github.io>，只有 `main` 可以部署正式站点。

## 创建工作分支

先检查工作区和近期历史，不覆盖用户未提交的改动。基于最新 `main` 创建以下分支之一：

- `feat/<short-description>`：新增文章、功能或设计改进。
- `fix/<short-description>`：勘误、回归、构建或依赖漏洞修复。

名称只含小写英文、数字和连字符，正则为 `^(feat|fix)/[a-z0-9]+(?:-[a-z0-9]+)*$`。允许任务编号，例如 `feat/123-astro-guide`。即使只修改文档，也不使用 `docs/*`、`chore/*` 或 `release/*`。

```bash
git status --short --branch
git fetch origin
git switch -c feat/astro-guide origin/main
```

不要在 `main` 上编辑、提交或直接推送，不强制推送，不擅自合并 PR。脏工作区先保留，必要时新建 worktree。

## 本地命令

推荐使用 `.nvmrc` 锁定的 Node.js 24.19.0；最低要求为 `>=24.0.0`。测试直接导入 TypeScript 辅助函数，依赖 Node.js 原生类型剥离能力。包管理器使用 npm。依赖以 `package-lock.json` 锁定，干净安装使用 `npm ci`。不要加入其他包管理器锁文件。

- `npm run dev`：启动开发服务器，默认端口为 `4321`。
- `npm run check`：执行 Astro 类型检查和 Prettier 格式检查，不修改文件。
- `npm run format`：使用 Prettier 统一格式化工程源码、配置和文档，`.astro` 文件由 `prettier-plugin-astro` 处理。
- `npm run format:check`：只检查格式，随 `check` 在本地和 CI 中执行。格式化范围由 `.prettierignore` 管理，排除文章、测试夹具、公共资源、锁文件和生成目录；嵌入代码按 Prettier 支持情况自动格式化。
- `npm run lint:content`：检查所有文章的 frontmatter，并渐进检查新增或修改的正文。
- `npm run test`：执行 `tests/*.test.mjs` 的 Node.js 单元和契约测试。
- `npm run build`：执行 Astro 静态构建，npm 自动接着运行 `postbuild`，生成 `dist/pagefind/` 索引。
- `npm run test:built`：检查已有 `dist/` 的旧 URL、链接、图片、锚点、canonical、RSS 和 Sitemap。
- `npm run test:e2e`：使用 Playwright；在临时目录加入 MD/MDX 测试文章，执行生产构建和预览，不把演示页发布到正式站点。
- `npm run preview`：预览 `dist/`。中文搜索须使用构建后的站点验证。
- `npm run check:migration`：一次性比对迁移前文章哈希；不在长期 CI 中冻结文章内容。
- `npm run validate:pr`：按 GitHub 事件数据校验 PR 分支、标题与 breaking 标记。
- `npm run release:dry-run`：只读分析本地 Git 历史和标签，不创建标签或 Release。

首次运行浏览器测试前安装 Chromium：

```bash
npx playwright install chromium
```

Linux CI 使用 `npx playwright install --with-deps chromium` 安装浏览器及系统依赖。本地缺少系统库时应先解决环境问题，不能将未执行的浏览器测试标为通过。若环境禁止监听预览端口、启动浏览器或访问预览地址，记录具体阻塞，等待 PR CI 的真实浏览器结果；不要删除测试或用 HTML 检查代替。

提交前的完整检查顺序：

```bash
npm ci
npm run check
npm run lint:content
npm run test
npm run build
npm run test:built
npm run test:e2e
```

## 提交与 PR

提交主题和 PR 标题使用 [Conventional Commits 1.0.0](https://www.conventionalcommits.org/zh-hans/v1.0.0/)：

```text
<type>(<scope>)!: <description>
```

`scope` 和 `!` 可省略。类型和范围使用小写，常用 `feat`、`fix`、`docs`、`refactor`、`test`、`ci`、`build`、`chore`、`perf`；范围可用 `content`、`theme`、`search`、`config`、`deps`。描述可用中文或英文，必须明确具体变化，避免 `update`、`misc`。

不兼容变更在 PR 标题中使用 `!`，并在 PR 正文保留非空的 `BREAKING CHANGE: ...` 说明。这是仓库的额外门禁，用于避免 squash 时丢失 breaking 信息；不能用“重大改版”代替不兼容说明。旧文章 URL 原则上不可破坏。

PR 目标为 `main`，默认先创建草稿。描述写清目的、范围、检查结果、风险及人工待办；UI 改动附深浅色和移动端截图。`Validate PR` 与 `Verify site` 都须通过，解决合并冲突后再经人工审核。CI 成功不等于获得自动合并授权。

本地可显式提供 PR 信息进行预检查：

```bash
PR_HEAD_REF=feat/astro-guide PR_BASE_REF=main \
PR_TITLE="feat(content): add astro guide" npm run validate:pr
```

只使用 squash merge，将 PR 标题用于 squash commit。合并前再次核对标题和 breaking 正文，避免 GitHub 默认消息改变版本推断。

## 常见任务

### 新文章与勘误

1. 新文章创建 `feat/astro-guide`，在 `src/content/blog/` 添加文件，按 [内容规范](CONTENT.md) 完成 frontmatter、引用和正文。
2. 勘误创建 `fix/astro-guide-command`，只修改必要内容；保留旧 slug 和 URL，实质更新时填写 `updatedDate`。
3. 运行完整检查和生产预览，分别提交 `feat(content): add astro guide` 或 `fix(content): correct deployment command`。
4. 发起 PR；合并后由 `main` 工作流验证和部署，不从工作分支发布。

### Astro 配置与依赖

1. 配置改进使用 `feat/astro-config`，配置故障使用 `fix/astro-config`。先阅读 [架构说明](ARCHITECTURE.md)，确认唯一配置入口。
2. 只修改相关配置，并补充能够验证行为的测试。运行完整检查；提交可使用 `feat(config): ...`、`fix(config): ...` 或与影响匹配的维护类型。
3. 依赖修复创建 `fix/update-astro`。使用 npm 更新明确的包，同时提交 `package.json` 和 `package-lock.json`；阅读升级说明和 Node.js 要求。
4. 用 `npm ci` 重新安装后执行完整检查，再提交 `fix(deps): ...` 或 `build(deps): ...` 并发起 PR。不要为更新依赖引入第二套锁文件。

### 主题与 favicon

主题更新须同时同步 `AGENTS.md`、架构、设计、内容规范和测试说明。以固定的 Cactus 提交核对布局，保留英文界面、中文文章、现有 URL 与 Giscus 配置。不得复制上游的格式化、lint 或 CI/CD 配置。

favicon 文件放在 `public/` 根目录，由 `BaseHead.astro` 声明一次。当前缓存参数为 `?v=20261022`。更新后检查 PNG 尺寸、SVG/ICO 格式、manifest 引用和所有页面的声明唯一性。历史迁移基线保持原样，新图标不执行旧图标字节一致性验收。

UI 验收同时覆盖移动菜单、搜索弹窗、独立搜索页、标签页、目录、主题持久化、代码和评论。截图必须来自本次生产构建，不复用旧截图作为本次证据。

## 版本与发布

站点遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)。`vMAJOR.MINOR.PATCH` Git 标签和 GitHub Release 是唯一发布版本来源；`package.json` 的 `version` 只是私有项目元信息。它与上游 Astro Cactus 8.3.0、Astro 框架版本各自独立。

唯一发布器为 `scripts/release.mjs`，不使用 semantic-release，不发布 npm 包，不提交 `dist/`，不向 `main` 写入版本提交。

- 无稳定版本标签时，第一个包含 `feat`、`fix` 或 breaking 的版本发布为 `v1.0.0`。
- 有稳定版本后，`feat` 升 minor，`fix` 升 patch。
- `!`、`BREAKING CHANGE:` 或 `BREAKING-CHANGE:` 升 major，优先级最高。
- 其他类型默认不发布新版本，但合并到 `main` 后仍正常验证和部署。
- 同一范围包含多个提交时，选择最高升级级别。不得覆盖、移动或删除既有标签。

首次发布前检查完整历史和标签：

```bash
git fetch origin --tags
git tag --list 'v*'
npm run release:dry-run
```

Dry-run 只证明本地版本推断，不能证明 GitHub Token 权限或正式部署成功。实际发布只在 `main` 对应提交通过验证且 Pages 部署成功后进行。脚本只识别稳定的 `vMAJOR.MINOR.PATCH` 标签；先前稳定标签必须有已发布的对应 Release，异常历史需要先审计。

同一 SHA 已创建标签但缺少 Release 时，发布器可补建 Release，不移动标签。遇到指向其他提交的同名标签会停止。若 `main` 已前进，旧工作流重跑会跳过部署与发布，避免旧版本覆盖新站点。

## CI 与故障处理

唯一工作流是 `.github/workflows/site.yml`：

```text
PR -> Validate PR -> Verify site
main push -> Verify site -> Deploy Pages -> Release site
```

PR 不部署生产。`main` 再次执行相同验证；部署和 Release 依赖前序成功结果。所有文件改动均触发流程，没有跳过 Markdown 的路径过滤。普通检查只有 `contents: read`；Pages 作业增加 `pages: write`、`id-token: write`；仅 Release 作业获得 `contents: write`。同一生产流程使用并发控制。

`Verify site` 为 PR 使用目标分支 SHA、为 `main` push 使用前一 SHA，显式传入 `CONTENT_BASE_REF`，避免 detached checkout 漏掉改文。浏览器报告和截图通过 `browser-evidence-<run_id>-<run_attempt>` artifact 保留 14 天；验证后的生产产物保留 30 天。上传报告的步骤不能替代测试成功，失败或尚未执行的浏览器检查仍须如实说明。

- PR 检查失败：在原工作分支修复并重跑，不合并。
- `main` 验证失败：后续部署停止，在新的 `fix/*` 分支修复。
- 部署成功但线上异常：基于稳定版本准备 revert 或恢复性 PR，完成同样检查后合并；不使用强制推送回退历史。
- Release 失败：站点可能已经部署。保留该提交、部署和发布日志，先检查远程标签及 Release 状态，再修复或重跑；不得移动已创建的标签。
- 回滚之后也应检查线上页面、中文搜索、RSS 和评论映射。不能用本地构建成功代替线上验收。

## GitHub 仓库设置：待人工核实

下面是需要仓库管理员在 GitHub 完成并验证的清单。提交工作流文件不会自动启用这些设置；未实际核实时不得宣称已生效。

- [ ] Settings → Pages → Build and deployment → Source 选择 `GitHub Actions`。
- [ ] 为 `main` 设置 Branch Protection 或 Ruleset：必须 PR，要求 `Validate PR` 与 `Verify site`，合并前分支须更新，禁止强制推送和删除，限制绕过。
- [ ] 设置允许的合并方式：只开启 Squash merge；默认 squash 消息选择 PR 标题和描述，保留 breaking 正文。可启用自动删除已合并分支。
- [ ] 对 `github-pages` Environment 设置部署分支规则，仅允许 `main`。
- [ ] 确认 Actions 被允许运行，仓库和组织策略允许 Release 作业请求 `contents: write`；不要把所有作业扩大为写权限，不修改 Secrets 来绕过策略。
- [ ] 条件允许时要求至少 1 名审批者。作者不能审批自己的 PR；单人仓库须明确安排可行的人工审查方式，不能虚构审批。
- [ ] 验证 required checks 的实际名称，检查一次 PR 和合并后的 `main` 流程，确认生产只从 `main` 部署。
- [ ] Giscus 的 Discussions、App 安装和 `General` 分类保持可用；保留现有仓库及分类 ID，不重新生成评论映射。

严格分支策略与 Dependabot 默认分支名不兼容。在更新流程能生成合规的 `fix/*` PR 前，不启用冲突的默认配置。

参考：[Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[保护分支](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[Squash 配置](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests)。
