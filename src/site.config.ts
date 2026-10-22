/** Site identity and existing Giscus mapping are defined only here. */
export const siteConfig = {
  url: 'https://guog.github.io',
  title: 'guog',
  description: '不写代码的程序员',
  author: 'guog',
  github: 'https://github.com/guog',
  lang: 'zh-CN',
  ogLocale: 'zh_CN',
}

export const menuLinks = [
  { path: '/', title: 'Home' },
  { path: '/blog/', title: 'Blog' },
]

export const giscusConfig = {
  repo: 'guog/guog.github.io',
  repoId: 'R_kgDOVIqxYA',
  category: 'General',
  categoryId: 'DIC_kwDOVIqxYM4DIZa2',
  mapping: 'pathname',
  lang: 'zh-CN',
}
