/** Site identity and existing Giscus mapping are defined only here. */
export const siteConfig = {
  url: 'https://guog.github.io',
  title: 'guog 的博客',
  description: '软件开发者的技术笔记、心得与翻译',
  author: 'guog',
  github: 'https://github.com/guog',
  lang: 'zh-CN',
  ogLocale: 'zh_CN',
}

export const menuLinks = [
  { path: '/', title: '首页' },
  { path: '/blog/', title: '归档' },
  { path: '/search/', title: '搜索' },
  { path: '/about/', title: '关于' },
]

export const giscusConfig = {
  repo: 'guog/guog.github.io',
  repoId: 'R_kgDOVIqxYA',
  category: 'General',
  categoryId: 'DIC_kwDOVIqxYM4DIZa2',
  mapping: 'pathname',
  lang: 'zh-CN',
}
