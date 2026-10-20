---
title: 'Markdown：从文档语言到 AI 时代的工程基础'
description: '从基本语法到工程协作，理解 Markdown 如何连接项目知识、研发流程与 AI Agent。'
pubDate: '2026-10-14'
category: '技术'
tags: ["Markdown", "软件工程", "AI"]
---

> 本文迁自 [trainings 仓库](https://github.com/guog/trainings/blob/master/markdown-101/src/markdown-101.md)，保留原文内容与图片，调整为博客在线阅读格式。

*理解为什么一种极简的纯文本格式，能够连接项目知识、协作流程和 AI Agent*

![Markdown 从纯文本成为工程协作载体](/images/markdown-101/markdown-workflow.jpg)

打开一个现代开源项目，常能看见 `README.md`、设计提案、Pull Request 描述、贡献指南以及 `AGENTS.md` 等文件。它们的用途不同，却经常使用同一种表达形式：**Markdown**。这不是因为 Markdown 能完成复杂排版，而是因为工程协作长期需要一种既方便人阅读、又容易由工具处理和版本管理的文本格式。

在人工智能（Artificial Intelligence，AI）编程时代，这个特点被进一步放大：项目约定、需求背景、设计判断和任务说明可以长期留在仓库中，不必只存在于一次对话。由此也出现了更前沿的观点：部分 Markdown 不再只是解释代码的文档，而可能成为持续驱动实现和测试的**上游工程输入**。理解这种变化，需要先分清三个层次：**表达信息、组织协作、约束软件行为**。

## 一、Markdown 为什么诞生：让纯文本本身也值得阅读

Markdown 由 John Gruber 在 2004 年发布，Aaron Swartz 参与了早期设计与反馈。它的出发点不是开发一个复杂的文档软件，而是让人以易读、易写的纯文本进行创作，并能够将其转换为 HTML（HyperText Markup Language，超文本标记语言）。[Markdown 原始发布页](https://daringfireball.net/projects/markdown/)至今仍能帮助我们理解这一设计动机。

这带来了三个特别适合软件工程的特性：

1. **不依赖特定编辑器**：普通文本工具就能打开和修改，长期保存与迁移成本低。
2. **天然适合 Git**：修改标题、增加约束、调整验收标准都能逐行比较，也能通过 Pull Request（PR，拉取请求）评审。
3. **方便工具处理**：检索、转换、抽取章节、生成网页或自动读取都比较容易，人与程序看到的是同一份基本内容。

Markdown 并非单一、完全一致的渲染实现。**CommonMark** 尝试统一基础语法的解析行为；**GFM（GitHub Flavored Markdown，GitHub 风格 Markdown）**在此基础上支持任务清单等协作场景。使用时应了解平台扩展，不能假设所有 Markdown 阅读器都有同样能力。参见 [CommonMark 规范](https://spec.commonmark.org/) 和 [GFM 规范](https://github.github.com/gfm/)。

## 二、只掌握少量语法，就能阅读大多数工程文档

Markdown 的优势在于“够用而简单”。下面先展示源码，再展示人阅读时看到的结果。标题是例外：为避免混淆本文的章节层级，仅展示其源码。

### 标题：通过井号表达层级

~~~markdown
# 一级标题
## 二级标题
### 三级标题
~~~

### 强调、列表与链接

源码：

~~~markdown
请先完成 **权限检查**，再允许导出。

- 澄清需求边界
- 记录验收条件
  - 包括异常情况

阅读 [GitHub 官方 Markdown 指南](https://docs.github.com/zh/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)。
~~~

渲染效果：

请先完成 **权限检查**，再允许导出。

- 澄清需求边界
- 记录验收条件
  - 包括异常情况

阅读 [GitHub 官方 Markdown 指南](https://docs.github.com/zh/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)。

### 引用与行内代码

源码：

~~~markdown
> 设计被接受，不等于功能已经交付。

使用 `git worktree` 可以并行管理本地工作目录。
~~~

渲染效果：

> 设计被接受，不等于功能已经交付。

使用 `git worktree` 可以并行管理本地工作目录。

### 任务清单

源码：

~~~markdown
- [x] 需求已澄清
- [x] 方案已评审
- [ ] 集成测试已通过
~~~

渲染效果（在支持任务清单的阅读器中显示为复选框）：

- [x] 需求已澄清
- [x] 方案已评审
- [ ] 集成测试已通过

### 代码块

源码（下面特意用 `text` 标记外层，展示三个反引号）：

~~~text
```json
{"status":"ready","version":"1.2.0"}
```
~~~

渲染效果：

```json
{"status":"ready","version":"1.2.0"}
```

看懂标题、段落、列表、链接、强调、引用、代码和任务清单，通常就足以阅读绝大多数工程 Markdown。更复杂的格式不必全部记忆，可以随用随查。图片也可以用 `![流程示意](images/markdown-workflow.jpg)` 引用本地资源，这使图文资料能够和代码一起管理。

## 三、在 AI 之前：Markdown 已经贯穿一次软件变更

只把 Markdown 理解为“写 README 的格式”，会低估它在工程协作中的作用。以“为报表增加异步导出”为例，一次变更可能在不同时间产生多个 Markdown 对象。**它们并非五套独立文档，而是同一项工作留下的连续记录。**

### 从 README 到 Issue：先让目标有共同语境

`README.md` 帮助后来者理解项目的作用、环境和最基本的工作入口，例如：

~~~markdown
# 报表服务

提供报表查询与导出能力。

- 开发环境：参见 `docs/development.md`
- 验证方法：参见 `CONTRIBUTING.md`
~~~

当出现“导出大数据量报表超时”的需求时，可以用 GitHub **Issue（议题或工作事项）**记录可验证的目标：

~~~markdown
## 背景
大数据量报表导出可能超时。

## 验收条件
- [ ] 按用户权限导出
- [ ] 支持异步任务与状态查询
- [ ] 失败时可获取明确错误原因
~~~

Issue 的重要性不在于标题是否漂亮，而在于它能被讨论、关联代码变更和追踪处理状态。GitHub 提供 [.md Issue 模板及 YAML Issue 表单的配置说明](https://docs.github.com/zh/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)；后者更适合需要校验必填字段的场景。

### 从 RFC 到 ADR：让方案和决策可以被评审

对于简单功能，Issue 澄清后可以直接实现；但如果报表异步导出会影响任务队列、数据库结构和错误处理，就值得先评审设计。

- **RFC（Request for Comments，征求意见提案）**帮助讨论尚未确定的方案。一个 RFC 应解释问题、目标、可选实现、主要权衡以及需要社区反馈的部分。
- **ADR（Architecture Decision Record，架构决策记录）**则更重视保留已经作出的重要决定，包括背景、备选方案、决策和后果。

例如，ADR 可以记录一项明确选择：

~~~markdown
# 采用异步导出任务队列

## 背景
同步导出容易占用请求处理资源。

## 决策
引入任务队列与状态查询接口。

## 后果
需要处理重试、超时、权限与任务清理。
~~~

当文档与代码都在 Git 仓库中，这类方案可以像代码一样经过 PR 审查。可以阅读真实的 [Rust RFC 仓库](https://github.com/rust-lang/rfcs) 与 [ADR 社区指南](https://adr.github.io/)，但不必要求所有小修改都采用正式提案流程。

### 从 PR 到版本记录：让实现与原始目标相连

实现完成后，PR 的 Markdown 描述应当帮助评审者把代码变更与前面的目标对应起来：

~~~markdown
## 关联工作
Closes #128

## 变更摘要
- 增加异步导出任务
- 增加权限验证与失败状态

## 验证证据
- [x] 单元测试
- [ ] 集成环境验收

## 风险与恢复
旧接口保持兼容；发布时可关闭新入口。
~~~

仓库可以通过 [Pull Request 模板（GitHub 官方中文）](https://docs.github.com/zh/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository) 提示作者填写这些信息。合并后，Release Notes 或 Changelog 又可以沿着 PR 与 Issue 说明版本变化。

**Commit Message（提交信息）要单独看待。**Git 存储的是纯文本提交消息，不要求它是 Markdown 文件。提交正文可以使用列表等人类可读格式，但各终端与平台的渲染并不一致。常见的约定式提交示例是：

~~~text
feat(report): 支持异步导出

- 增加任务状态查询
- 补充权限验证

Refs: #128
~~~

相关约定可参考[约定式提交（Conventional Commits）中文规范](https://www.conventionalcommits.org/zh-hans/v1.0.0/)。至此，**README 提供项目背景，Issue 定义问题，RFC/ADR 记录设计，PR 组织评审，提交和发布记录保留实现历史**；Markdown 将它们连接在同一个可以版本化的工程环境中。

## 四、进入 AI 时代：Markdown 成为可持久化的工作上下文

AI 编程助手需要的不只是当前一句提示，还包括仓库结构、可修改范围、验证方式和团队约定。把这些信息保存在 Markdown 中，具备两个直接收益：**人和 Agent 可以读取同一份约定；约定的变更可以接受 Git 审查，而不必依赖个人聊天记录。**

所谓“Markdown 是 AI 的母语”，是一种强调普及程度与工具兼容性的比喻，而不是说大模型只能理解 Markdown 或这种格式天然最准确。它的优势来自纯文本、清楚的层级、广泛的工具支持以及低成本的版本化。

在现代 Agent 工具生态里，三个名字值得区分：

- **`AGENTS.md`**：面向兼容编码 Agent 的项目级说明，通常包括项目结构、验证命令、不得修改的区域等。参见 [AGENTS.md 开放约定](https://agents.md/)。
- **`CLAUDE.md`**：Claude Code 使用的项目上下文说明文件；与 AGENTS.md 目标相似，但发现规则和支持范围以具体产品为准。参见 [Claude Code 官方说明](https://code.claude.com/docs/en/memory)。
- **`SKILL.md`**：Agent Skills 规范中一项可复用技能的入口，通常包含 YAML frontmatter 和 Markdown 正文，可附带脚本与参考资料；它是“怎样处理某类任务”的说明，不是仓库的通用说明书。参见 [Agent Skills 规范](https://agentskills.io/specification)。

项目级说明可以很简短：

~~~markdown
# 项目约定

- 修改导出接口时同步更新测试。
- 先复用已有服务和依赖。
- 不在仓库中保存密钥。
- PR 必须说明验证结果与风险。
~~~

而一个专门审查 PR 的 Skill 可能采用如下结构：

~~~markdown
---
name: review-export-pr
description: 检查报表导出相关变更和验证证据
---

# 检查要点
1. 阅读关联 Issue 和设计说明。
2. 检查权限、异常路径和自动化测试。
3. 输出需要开发者确认的风险。
~~~

两者区别在于：**项目约定提供持续生效的背景，Skill 提供按需触发的专业工作方法**。真实目录结构可参考 [Anthropic Skills](https://github.com/anthropics/skills) 和 [OpenAI Skills](https://github.com/openai/skills)。使用第三方 Skill 仍要审查其中的脚本、权限和外部连接，不能仅因为采用 Markdown 就认为它安全。

## 五、从文档走向源码：哪些变化是真正新的

过去，Markdown 往往被看作代码旁边的说明材料；在 AI Agent 参与开发时，出现了一种更进一步的实践：**把描述业务意图、边界和验收条件的 Markdown 当作持续维护的工程输入，让实现和测试受它约束。**

2026 年 9 月，htmx 创建者 Carson Gross 在 [《Markdown in /src》](https://htmx.org/essays/markdown-in-src/) 中提出：描述软件意图的 Markdown 可以和产生的代码一起存放在 `src/`，代码与测试应尽可能由持久保存的 Markdown 派生，而不是只依据短暂的提示词对话。这是值得研究的**探索性观点**，并非软件行业已经普遍采用的成熟标准。

对于上面的异步导出，可以想象仓库内存在：

~~~text
src/
  export/
    requirements.md   # 权限、任务状态、失败与重试规则
    service.ts        # 实现
    service.test.ts   # 可执行的验证
~~~

当需求变化时，团队先评审 `requirements.md`，再由开发者或 Agent 修改实现与测试；而 CI 用自动化检查和必要的人类评审判断这些改动是否符合接受标准。这样 Markdown 从“事后解释代码”变成了“影响代码演进的上游依据”。

需要注意三个不能省略的条件：

1. **约束必须能够验证**：一句“性能要好”不能代替量化验收条件、测试或真实的运行数据。
2. **文件与实现必须保持一致**：修改了文档却未更新代码，或绕过文档直接修改行为，都会导致偏离；需要相应检查与审查制度。
3. **格式选择仍应服从需求**：类型严格的接口契约、配置和数据交换可能需要 OpenAPI、JSON Schema、JSON 或 YAML，而不只是自由文本。

因此，讨论“Markdown 正在成为源码”时，更准确的理解是：**一些 Markdown 文件正被提升为有版本、有审查、有验证责任的规范性工程输入**。它并不意味着所有 `.md` 文件都能直接执行，更不意味着可以取消代码和测试。

## 六、边界与结论：一套通用表达，不是万能规范

Markdown 最适合的是需要人理解、讨论和持续修订的内容：项目入口、需求说明、设计决定、PR 描述、知识沉淀、Agent 指令。对于严格结构、类型验证或程序间通信，JSON（JavaScript Object Notation）、YAML、OpenAPI 等格式通常更合适；对于系统行为本身，仍需要可执行代码、自动化测试与运行证据。

它在现代软件工程中的作用经历了一条清晰的发展路径：**先让文档成为可读纯文本，再让文档进入 Git 和协作流程，进而让部分文档成为人与 AI Agent 共同维护的工程约束。** 这种路径比“Markdown 能取代所有格式”的说法更接近实际，也更能指导团队建立可长期维护的知识和研发工作方式。

---

## 参考规范与真实项目

以下资料优先选择原始规范与官方文档。正文示例均为本文编写的精简模板，不冒充项目原始内容。

1. [Markdown — 原始发布说明](https://daringfireball.net/projects/markdown/)：设计动机与基本语法。
2. [CommonMark](https://spec.commonmark.org/)：基础 Markdown 的规范化语法及测试。
3. [GitHub Flavored Markdown](https://github.github.com/gfm/)：GitHub 的 Markdown 扩展规范。
4. [GitHub 官方中文：基础写作和格式语法](https://docs.github.com/zh/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)：常见语法与显示行为。
5. [GitHub 官方中文：README 介绍](https://docs.github.com/zh/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)：项目入口文件的用途。
6. [GitHub 官方中文：配置 Issue 模板](https://docs.github.com/zh/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)：Markdown 模板与 YAML 表单。
7. [GitHub 官方中文：创建 PR 模板](https://docs.github.com/zh/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)：规范变更说明。
8. [Rust RFC 仓库](https://github.com/rust-lang/rfcs)：真实的设计提案与讨论机制。
9. [ADR 社区指南](https://adr.github.io/)：架构决策记录的结构与资源。
10. [Conventional Commits（中文）](https://www.conventionalcommits.org/zh-hans/v1.0.0/)：结构化提交约定。
11. [AGENTS.md](https://agents.md/)：项目级 Agent 说明约定。
12. [Claude Code 项目记忆](https://code.claude.com/docs/en/memory)：`CLAUDE.md` 的官方说明。
13. [Agent Skills Specification](https://agentskills.io/specification)：`SKILL.md` 的格式与入口定义。
14. [Anthropic Skills](https://github.com/anthropics/skills) 与 [OpenAI Skills](https://github.com/openai/skills)：真实技能目录范例。
15. [htmx：《Markdown in /src》](https://htmx.org/essays/markdown-in-src/)：讨论持久化 Markdown 驱动代码与测试的探索性观点。
