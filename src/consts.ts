// 站点全局配置

export const SITE_TITLE = 'guog 的博客';
export const SITE_DESCRIPTION = '软件开发者的技术笔记、心得与翻译';
export const AUTHOR = 'guog';
export const GITHUB_URL = 'https://github.com/guog';

// ---------------- giscus 评论配置 ----------------
// 在 https://giscus.app/zh-CN 按向导生成参数后填到下面。
// 前置步骤：
//   1. 博客源码仓库（guog/guog.github.io 源码仓库）开启 Discussions；
//   2. 给该仓库安装 giscus GitHub App；
//   3. 在 giscus.app 选择「通过 Discussion 连接」，按提示选择分类，
//      页面会给出 repo / repoId / category / categoryId，复制到下方。
// 下面留空时，文章页会显示配置提示而不是评论框。
export const GISCUS = {
	repo: 'guog/guog.github.io',
	repoId: 'R_kgDOVIqxYA',
	category: 'General',
	categoryId: 'DIC_kwDOVIqxYM4DIZa2',
	mapping: 'pathname',
	lang: 'zh-CN',
};
