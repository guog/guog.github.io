// @ts-check
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import expressiveCode from 'astro-expressive-code'
import { siteConfig } from './src/site.config.ts'

export default defineConfig({
  site: siteConfig.url,
  trailingSlash: 'always',
  prerenderConflictBehavior: 'error',
  integrations: [expressiveCode(), mdx(), sitemap({ filter: (page) => !page.endsWith('/404/') })],
  vite: { plugins: [tailwind()] },
})
