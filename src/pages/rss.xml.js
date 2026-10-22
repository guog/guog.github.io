import rss from '@astrojs/rss'
import { getPublishedPosts } from '../data/blog'
import { siteConfig } from '../site.config'
import { getPostUrl } from '../utils/blog'
export async function GET() {
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: siteConfig.url,
    customData: '<language>zh-CN</language>',
    items: (await getPublishedPosts()).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: getPostUrl(post.id),
      categories: [post.data.category, ...post.data.tags],
    })),
  })
}
