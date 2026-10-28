# AI 阅读改造验收记录

任务：BLOG-AI-20261027-01。范围依据为 [PR #8 的修订 v3](https://github.com/guog/guog.github.io/pull/8)。计划 PR 保持独立；首期实现第 1—4 项，第 5 项另用增强 PR 审阅。所有分支均等待用户明确指令后才可合并，未部署。

## 首期结果

2026 年 10 月 28 日，Node.js 24.19.0、Astro 7.3.8 下完成本地验证。测试对应实现提交和 GitHub CI SHA 在实现 PR 描述中记录。

- `npm ci --cache /tmp/blog-ai-npm-cache`：成功安装锁定依赖，执行正常安装脚本。
- `npm run check`：Astro 无错误，Prettier 通过；原有两份 skill 文件仅作格式修复并独立提交。
- `npm run lint:content`：3 篇元数据通过，1 篇修改文章的正文结构通过。
- `npm test`：53 项通过。包含独立代码金样本、路由映射、碰撞拒绝、来源校验及客户端组件静态回退检查。
- `npm run build`、`npm run test:built`：14 个 HTML 页面与 14 个 Markdown 一一对应；首页、文章索引、3 篇文章、标签索引及详情、搜索和 `/404.html.md` 全部覆盖。源码代码块、渲染代码和 Markdown 逐块对照通过，表格与图片数量一致；RSS、Sitemap、旧 URL、评论配置和中文 Pagefind 查询通过。
- 完整 Playwright：26 项通过；真实 Giscus 外部服务检查按既有条件跳过。随后新增的 Pagefind 提示词排除检查单独运行通过。浏览器检查包含 375/768/1440 px、深浅色、全部 Sitemap 页面与 404 的 Markdown HTTP 状态和 MIME、剪贴板异步完成/拒绝/不可用、无 JS、特殊字符、MDX 求值及原样代码复制。
- `npm run release:dry-run`：只读分析通过，不创建标签或 Release。

本地锁定 Chromium 下载被网络策略以 Domain forbidden 拒绝；使用环境已有 `/usr/bin/chromium` 完成浏览器检查，没有改锁文件或减弱测试。GitHub CI 保持原有锁定浏览器安装步骤，实际结果另记于 PR。

截图由既有浏览器用例生成在 `test-results/`，包含真实生产预览的首页、归档、标签、搜索和文章页。GitHub Actions 将报告、截图和失败 trace 保存为 `browser-evidence-<run_id>-<run_attempt>` artifact；以 PR Checks 链接和对应 SHA 取证，不以旧截图代替新验证。

## 选型与内容核实

采用 unified / rehype / remark 工具链，HTML 解析、转树、围栏、转义、表格与脚注由成熟库负责。本地代码只处理构建枚举、v2 路径、标准发现入口及主题内容选择。新增依赖版本与许可证见锁文件及第三方声明；未使用自定义 manifest 或并行转换引擎。

试验确认 Expressive Code 默认会裁剪行尾空格和首尾空行。适配通过公开接口保留源代码，并对 Markdown/MDX 和 Code 组件分别测试；金样本由人工指定，包含 Tab、有效数字、连续和末尾空行、行尾空格、实体符号和嵌套反引号。

原作页面于本次核实明确署名 Louis Claxton、日期 2026-08-21；译文保留 2026-09-04 发布、2026-09-15 更新。译者缺少可靠记录，页面显示 `Translated by not specified`，提示词写“译者：未注明”，不推断为 guog。

## 发布后验证

以下项目须待用户授权合并及部署后检查，当前未声称完成：实际 GitHub Pages 的状态与 MIME、Markdown 和 llms.txt 可访问性、错误路径真实 404、head 发现链接及真实 Giscus 可用性。外部 Agent 能否联网和具体回答取决于其权限；静态接口验收不能证明搜索收录或排名变化。

## 第 5 项增强

本地 `check`、57 项单元测试、生产构建及产物检查通过。完整 Playwright 为 30 项通过、1 项真实 Giscus 服务检查按既有条件跳过。新增断言覆盖 JSON-LD 的真实角色与三种日期、脚本结束标记转义、章节链接复制和失败回退。

从原始 d5a9084 的独立构建取出 140 个章节 ID 与各章节内容摘要，未从新实现反向生成预期。产物检查验证每个旧 ID 唯一且仍指向相同章节内容；另用改名保留别名、重复 ID、重复标题重排和丢失 ID 样例证明检查能拒绝错误。合法正文编辑若改变摘要，也须人工审阅引用位置，再明确更新相应基线，不能批量重录来消除失败。

隔离浏览器构建还执行真实生命周期试验：临时加入 `/blog/page/2/`，首次构建确认其 Markdown 存在；删除源码后再次构建，确认 HTML 和 Markdown 均消失。测试页面仅写入临时目录，不进入生产或 Git 提交。

Schema.org 词汇按官方定义核对，JSON-LD 的 URL、角色、日期和可见来源逐字段验证。尝试访问外部 Schema Markup Validator 时，执行器直接请求遇到 DNS EAI_AGAIN，经代理请求返回 HTTP 403；未实际向其提交验证，不声称外部验证器通过。后续可在该服务可访问的环境粘贴 JSON-LD 复核；缺少未知译者不作为造假补字段的理由。

首期远程 [Site #40631096524](https://github.com/guog/guog.github.io/actions/runs/40631096524) 全部校验通过，使用锁定 Chromium；部署、发布均跳过。对应 artifact 为 `browser-evidence-40631096524-1`。增强 PR 的最终 SHA、CI 和截图以其 PR Checks 为准。

## 独立审阅后的保真修复

正文 SVG 不再无差别删除。只有明确声明 `aria-hidden=true` 或 `role=none/presentation` 的装饰图标被排除；有信息的 SVG 使用 title/aria-label/aria-labelledby、desc/aria-describedby 及可见 text 生成静态文字。缺少完整描述、引用缺失或歧义均使构建失败，避免只保留图名却丢失图示含义。MDX 的“交付闭环”金样本独立写明标题、关系描述和标签，并由生产预览检查实际图示与导出文本。

章节基线仍来自 d5a9084 的独立构建，补充层级、祖先 ID 链和完整章节文字的 SHA-256。正常 ID 还必须匹配原标题；明确的空别名锚点才允许标题变更，并核对祖先别名映射。真实“需求和设计/变化-1”和“把 Claude Code 的计划模式(plan)作为默认开端/变化-2”交换 ID 的负例接入生产产物检查，不能仅靠相同前 100 字通过。另检查长公共前缀、父级合法改名及段落包装的别名。

修复后单元测试为 62 项通过；测试域名正则和文件扩展名中的点改为字面点。完整构建、浏览器和真实 Agent 阅读证据随本次修复更新，不使用单元测试替代 Agent 回答。
