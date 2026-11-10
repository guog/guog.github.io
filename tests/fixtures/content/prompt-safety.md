---
title: '安全回归 </textarea><script>window.promptEscaped=false</script>'
description: '提示词特殊字符和静态回退的隔离测试。'
pubDate: '2026-10-14'
slug: '__regression__/prompt-safety'
---

## 安全边界

标题中的特殊字符只能作为文本，不能执行。

### 含 `code`、*强调*与[原有链接](/blog/markdown-101/)的标题

标题格式与已有链接必须保留。

### 含 `code`、*强调*与[原有链接](/blog/markdown-101/)的标题

重复标题仍使用各自独立的锚点。
