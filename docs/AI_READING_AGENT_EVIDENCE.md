# 独立 Agent 阅读验收

2026 年 10 月 28 日，在实现提交 `9eb4832551e184542202b556d13aabf6a9c0558b` 完成生产构建及产物检查后，生成 14 份 Markdown 和 llms.txt 的只读快照。五个独立 Agent 均不继承本次实现会话，不读取 src，不联网。以下是实际读取和实际回复记录，不是预期答案模板。

快照根目录为 `/tmp/blog-ai-agent-evidence/9eb4832551e184542202b556d13aabf6a9c0558b/`。后续证据提交只增补测试和文档；现有文章产物哈希另与最终构建对照。CI 的浏览器证据 artifact 的 `agent-reading-inputs/` 保存 14 份 Markdown、llms.txt、`prompts/` 中的实际提示词和截断材料，并附哈希 manifest，便于独立复核。公开 URL 在本次发现测试中明确映射到快照相对路径，未冒充生产 HTTP 成功。

## 离线原创文章

另一独立 Agent 实际完整读取 `prompt-markdown-101.txt` 和 `blog/markdown-101/index.md`，报告工具输出未截断，读到参考资料和末尾链接；没有读取 src 或外部背景。

实际回复：

> 文章讨论 Markdown 如何从文档格式发展为工程协作与 AI Agent 的持久上下文。作者认为，部分 Markdown 可成为约束实现和测试的工程输入，但必须可验证、与实现保持一致；它不能取代严格契约、代码、测试和运行证据。
>
> 最值得讨论的问题是：当需求 Markdown 与代码行为不一致时，团队应如何确定依据并发现偏离？
>
> 本文为中文原创，作者署名 guog；提示文件与正文标题、署名对应一致。
>
> 已确认第五章存在显式锚点 `五从文档走向源码哪些变化是真正新的`，其中写道：“一些 Markdown 文件正被提升为有版本、有审查、有验证责任的规范性工程输入”。这是作者的结论。[查看第五章](https://guog.github.io/blog/markdown-101/#五从文档走向源码哪些变化是真正新的)。我的理解是，其关键在于建立审查和验证责任，而不只是把需求保存成 .md。

对照判定：主题、原创署名、适用边界和引用与实际正文一致，Markdown 与 HTML 均有该章节 ID。Agent 明确区分作者结论与自己的理解，没有声称验证线上或外部引用。

## 离线完整译文

输入为真实 `prompt-the-ai-native-sdlc-playbook.txt` 和 `blog/the-ai-native-sdlc-playbook/index.md`。Agent 报告首次工具输出截断后，按连续行段读完第 1—1671 行。它未读取外部原作、图片或配置运行环境。

实际回复：

> 文章讨论 AI 加快编码后，瓶颈如何转移到规划、评审、测试和部署。译文所述主张是：用版本化工件串联六阶段，将验证和治理嵌入流程，保留人的关键决策。它面向软件研发团队，须按依赖、风险与现有系统逐步采用，配置示例需自行验证。参见[六阶段的变化](https://guog.github.io/blog/the-ai-native-sdlc-playbook/#ai-nativeai-原生-sdlc-六阶段的变化)。
>
> 你们当前最拖慢交付的环节是什么，能否先为它定义可验证的交接工件？

Agent 的实际验收补充：

> 来源及角色：文件明确标为中文译文；原作者 Louis Claxton，原作为 The AI-native SDLC playbook，来源指向 Anthropic；译者未注明。不能据博客域名认定站主就是译者。以上主张来自所读译文，我未核对外部原作。
>
> 具体结论与真实章节：“SKILL 是一种建议性控制”，强制策略仍需确定性措施。位于“03 构建 Build → SKILL 作为组织知识 → 治理”，对应[治理章节](https://guog.github.io/blog/the-ai-native-sdlc-playbook/#治理-4)。本地 Markdown 确实包含 `<a id="治理-4"></a>`。

对照判定：主题和角色与页头及正文一致，没有猜填译者；实际 Markdown 和 HTML 均有上述两个 ID。“治理-4”正文确有建议性控制与确定性措施的区分。通过本地离线内容忠实度检查，不证明翻译忠实度、产品现状或公网可达。

## 从 llms.txt 发现文章

唯一入口是快照 `llms.txt`。Agent 从 Articles 中选择 `https://guog.github.io/blog/modern-se/index.md`，按约定映射到 `blog/modern-se/index.md`。其首次工具输出中部截断后补读第 130—260 行，覆盖 388 行文章；还沿 Home 链接读取 `index.md`。

实际回答：

> 主题与主要结论：文章以“报表异步导出”需求为贯穿案例，介绍从 Issue、设计、分支与 PR、CI、受控构建、制品、发布到运行反馈的完整交付链。主要结论是：现代化应体现为协作清晰、反馈及时、环境可复现、交付可追溯；工具应连接成能够闭合的证据链，团队可逐步建设这些能力。
>
> 作者角色：文章署名 guog；首页自我表述为“不写代码的程序员”。已读页面没有给出具体职位、公司或专业资历，因此不能进一步认定其正式职务。
>
> 适用边界：文章主要参照 GitHub 与开源社区实践，也说明 GitLab、Azure DevOps 可以承载类似原则。记录深度和验证强度应随复杂度与风险调整，无需一次部署全部工具；Windows 专用工具可通过受控虚拟机或自托管 Runner 复现。工业现场、离线交付、数据库迁移及遥测数据须考虑各自约束。文中产品功能、许可和部署要求仍需按实际版本核实。

第一轮回复给出了结语名称和正式文章 URL，未直接给片段地址。追加询问原创/译文及实际章节 ID 后，Agent 实际执行：

```bash
rg -n 'Written|原创|译|作者|结语|blog-hero|HTML' /tmp/blog-ai-agent-evidence/9eb4832551e184542202b556d13aabf6a9c0558b/blog/modern-se/index.md
sed -n '1,18p;230,246p' /tmp/blog-ai-agent-evidence/9eb4832551e184542202b556d13aabf6a9c0558b/blog/modern-se/index.md
```

实际补充回复：

> 按页面署名，应理解为 guog 撰写的原创文章。依据第 5 行原文 Written by guog；已读 Markdown 没有译者、原作者或译文来源署名。这里是依据页面呈现作判断，并未独立验证原创权属。
>
> 真实章节片段链接：[结语：真正先进的是一条能够闭合的证据链（Markdown）](https://guog.github.io/blog/modern-se/index.md#结语真正先进的是一条能够闭合的证据链)。片段标识直接来自第 230 行，未推测标题转换规则。

Agent 还尝试读取相同路径的 `index.html`，实际得到 `No such file or directory`；它明确报告未核实 HTML 或公网导航，没有假称成功。工程对照检查另确认真实 HTML 中存在相同 ID。

对照判定：发现路径、署名、边界与结语原文一致；初答片段引用不完整，经追加询问后正确提供。该初答不足如实保留，不将它算作首次即完整命中。

## 部分输入回退

独立 Agent 只取得真实译文提示词，以及 `partial-sdlc.md`。后者仅包含生成 Markdown 前 5 行和明确的截断标记；正文未提供。测试约束禁止联网或寻找其他副本。

实际第一轮回复：

> 我目前只读到标题和署名等元信息，正文在此截断；本次网络不可用，无法核实文章讨论的问题、主要结论和适用边界，也不能据标题补全。请上传本篇 Markdown 或粘贴正文，长文可先提供第一节。你最想借这次阅读解决哪个实际研发问题？

Agent 明确列出不能判断完整论点、边界、章节、论据、效果数据和译文准确性。对照判定：正确说明部分输入限制，并提出上传/分章节提供的实际回退；未编造全文摘要。

## 不可读取文件回退

另一个独立 Agent 读取真实 `prompt-markdown-101.txt`，随后实际尝试 `unavailable/article.md`。该文件不存在，读取退出码为 1，错误为 `No such file or directory`。它未联网、未寻找别的副本。

实际第一轮回复：

> 我已读到阅读提示，但未能读取文章正文：提供的本地文章路径不存在。本次无法核实文章讨论的问题、主要结论和适用边界，也无法确认章节链接。请上传《Markdown：从文档语言到 AI 时代的工程基础》的 Markdown 文件或粘贴正文；长文可按章节分次提供。你方便先提供第一章吗？

对照判定：实际工具失败与回复一致，没有把文章名或模型记忆当作已读内容，提供了可操作回退。本例证明本地不可读取材料的处理，不代表已测试某家外部 Agent 的联网权限。

## 输入摘要与边界

- `llms.txt`：789 bytes；SHA-256 `2ef579c58a88cd7ad2d0872d391ca602f0e5f0f3fc4ffbadd05ec9c3573cf030`。
- `index.md`：501 bytes；SHA-256 `61e4962517ccd55add4d2474da61ab7629e034abd0e357c43d028b716af08574`。
- `blog/modern-se/index.md`：40917 bytes；SHA-256 `420f7d010fa4c4ea6950a3d7d8d86f4724a911a95a5621a1a3c16b320e9a33d8`。
- `blog/the-ai-native-sdlc-playbook/index.md`：98552 bytes；SHA-256 `2004116c7dafce520836363cb6e8dc7610b3310830fc34002d3daf24bfbc040f`。
- `prompt-markdown-101.txt`：1163 bytes；SHA-256 `8afcee9b096caff8e120ff944d95048915600222e31cc2373545fca2e6add636`。
- `prompt-the-ai-native-sdlc-playbook.txt`：1316 bytes；SHA-256 `786a4ed6733a95452493405ce7e944723993394f2a1d3bcd88c236abfcbd3a52`。
- `partial-sdlc.md`：297 bytes；SHA-256 `bd48c72fae2836b449943bf10723eb31d801eea28f764082aa873ff43cbed063`。

- `blog/markdown-101/index.md`：17727 bytes；SHA-256 `48a06776c83ff09013d931a1869d5c4cb9588a47e6250262f13895f56e6ef79e`。

这些是实际 Agent 回答与材料对照记录。单元和浏览器测试负责工程契约，本记录负责阅读忠实度及失败行为；两者不能替代。真实 GitHub Pages、外部图片/参考资料和第三方 Agent 的联网能力继续待用户授权上线后验证。
