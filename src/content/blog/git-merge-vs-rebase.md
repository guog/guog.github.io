---
title: 'Git 学习笔记：merge 与 rebase 该怎么选'
description: '团队协作中 merge 和 rebase 的适用场景，以及我常用的工作流。'
pubDate: '2026-10-10'
category: '技术'
tags: ['Git', '版本控制']
---

新手用 Git 时最常纠结的问题之一：`merge` 和 `rebase` 到底该用哪个？结论先行：**没有银弹，看场景**。

## merge：保留完整历史

`git merge` 会产生一个合并提交，完整保留分支的分叉历史。

适用场景：

- 公共分支（`main` / `develop`）合入功能分支时
- 需要保留「谁在什么时候合了什么」的审计信息时

```bash
git checkout main
git merge feature/login
```

## rebase：保持线性历史

`git rebase` 把提交「挪」到目标分支顶端，历史是一条直线，`git log` 非常干净。

适用场景：

- 个人功能分支同步主干最新代码
- 提交 PR 之前整理自己的提交

```bash
git checkout feature/login
git rebase main
```

## 我的工作流

1. 功能分支开发中，用 `rebase` 同步 `main`；
2. 提交 PR 前用 `git rebase -i` 把杂乱的提交 squash 成有意义的单元；
3. PR 合入 `main` 时用 `merge`（或平台的 Squash and merge），保留可追溯的合并点。

## 一条铁律

**已经 push 到公共分支的提交，不要 rebase。** rebase 会改写提交哈希，
会让协作者的本地历史错乱。只在自己的分支上 rebase。
