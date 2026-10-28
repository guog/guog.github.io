/** Cross-check the independent HTML/source/Markdown outputs of the production build. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import {
  filesWithin,
  parseHTML,
  findAll,
  codeBlocks,
  pagePath,
  textContent,
} from '../src/integrations/markdown.mjs'
import { getMarkdownPath } from '../src/utils/markdown.ts'
import { assertLegacyHeadings } from '../src/utils/headings.mjs'
import { articleStructuredData } from '../src/utils/reading.ts'
import { getPostUrl } from '../src/utils/blog.ts'
import { articleFiles, parseArticle } from './check-content.mjs'
const SITE = 'https://guog.github.io'
const parseMarkdown = (value) => unified().use(remarkParse).use(remarkGfm).parse(value)
export async function checkAIBuilt({ root = process.cwd(), dist = path.join(root, 'dist') } = {}) {
  const files = await filesWithin(dist)
  const htmlFiles = files.filter((file) => file.endsWith('.html'))
  const markdownFiles = new Set(files.filter((file) => file.endsWith('.md')))
  const pages = []
  for (const file of htmlFiles) {
    const route = pagePath(path.relative(dist, file))
    const expected = new URL(getMarkdownPath(route), SITE).href
    const tree = parseHTML(await readFile(file, 'utf8'))
    const links = findAll(tree, (node) => node.tagName === 'link')
    assert.equal(
      links.filter(
        (node) =>
          node.properties.rel?.includes('alternate') && node.properties.type === 'text/markdown',
      ).length,
      1,
      `${route}: one Markdown alternate`,
    )
    assert.ok(
      links.some(
        (node) =>
          node.properties.rel?.includes('alternate') &&
          node.properties.type === 'text/markdown' &&
          node.properties.href === expected,
      ),
      `${route}: incorrect Markdown URL`,
    )
    assert.equal(
      links.filter(
        (node) =>
          node.properties.rel?.includes('describedby') &&
          node.properties.href === `${SITE}/llms.txt`,
      ).length,
      1,
      `${route}: describedby`,
    )
    const mdFile = path.join(dist, decodeURIComponent(new URL(expected).pathname))
    assert.ok(markdownFiles.delete(mdFile), `${route}: missing or duplicate Markdown`)
    const markdown = await readFile(mdFile, 'utf8')
    assert.doesNotMatch(
      markdown,
      /<!doctype html|<html\b|复制阅读提示词|请和我一起阅读《|Enable JavaScript to view Giscus/,
    )
    const mdTree = parseMarkdown(markdown)
    const codes = findAll(mdTree, (node) => node.type === 'code').map(({ value, lang }) => ({
      value,
      lang: lang ?? '',
    }))
    const article = findAll(tree, (node) => node.properties?.dataArticleBody !== undefined)[0]
    if (article) {
      assert.deepEqual(codes, codeBlocks(article), `${route}: rendered code fidelity`)
      for (const heading of findAll(article, (node) => /^h[2-4]$/.test(node.tagName ?? '')))
        assert.ok(
          markdown.includes(`<a id="${heading.properties.id}"></a>`),
          `${route}: lost heading anchor`,
        )
    }
    const main = findAll(tree, (node) => node.tagName === 'main')[0]
    assert.equal(
      findAll(mdTree, (node) => node.type === 'table').length,
      findAll(main, (node) => node.tagName === 'table').length,
      `${route}: tables`,
    )
    assert.equal(
      findAll(mdTree, (node) => node.type === 'image').length,
      findAll(main, (node) => node.tagName === 'img').length,
      `${route}: images`,
    )
    pages.push({ route, markdownURL: expected, codeBlocks: codes.length })
  }
  assert.equal(markdownFiles.size, 0, `Orphan Markdown: ${[...markdownFiles].join(', ')}`)
  const llms = await readFile(path.join(dist, 'llms.txt'), 'utf8')
  const llmsTree = parseMarkdown(llms)
  assert.equal(llmsTree.children[0].type, 'heading')
  assert.equal(llmsTree.children[0].depth, 1)
  assert.equal(llmsTree.children[1].type, 'blockquote')
  for (const link of findAll(llmsTree, (node) => node.type === 'link')) {
    assert.ok(
      pages.some((page) => page.markdownURL === link.url),
      `llms.txt links to unknown page ${link.url}`,
    )
    assert.ok(!link.url.includes('/404.'), '404 must not be curated')
  }
  for (const route of ['/', '/blog/', '/tags/', '/search/'])
    assert.ok(
      llms.includes(new URL(getMarkdownPath(route), SITE).href),
      `llms navigation missing ${route}`,
    )
  for (const file of await articleFiles(path.join(root, 'src/content/blog'))) {
    const { data, tree } = parseArticle(await readFile(file, 'utf8'), file)
    const id =
      data.slug ??
      path
        .relative(path.join(root, 'src/content/blog'), file)
        .replace(/\.mdx?$/, '')
        .split(path.sep)
        .join('/')
    const route = getPostUrl(id)
    if (data.draft) {
      assert.ok(!pages.some((page) => page.route === route), `Draft export leaked: ${route}`)
      continue
    }
    const htmlTree = parseHTML(
      await readFile(path.join(dist, decodeURIComponent(route), 'index.html'), 'utf8'),
    )
    const structured = findAll(
      htmlTree,
      (node) => node.tagName === 'script' && node.properties?.type === 'application/ld+json',
    )
    assert.equal(structured.length, 1, `${route}: one BlogPosting`)
    const record = {
      ...data,
      contentKind: data.contentKind ?? 'original',
      pubDate: new Date(data.pubDate),
      ...(data.updatedDate ? { updatedDate: new Date(data.updatedDate) } : {}),
      ...(data.source
        ? { source: { ...data.source, publishedDate: new Date(data.source.publishedDate) } }
        : {}),
    }
    assert.deepEqual(
      JSON.parse(textContent(structured[0])),
      articleStructuredData(id, record),
      `${route}: structured metadata differs from the source record`,
    )
    const attribution = textContent(
      findAll(htmlTree, (node) => node.properties?.dataAttribution !== undefined)[0],
    )
    const json = JSON.parse(textContent(structured[0]))
    if (json.author)
      assert.ok(
        attribution.includes(json.author.name),
        `${route}: author differs from visible text`,
      )
    if (json.translator)
      assert.ok(
        attribution.includes(json.translator.name),
        `${route}: translator differs from visible text`,
      )
    const legacy = JSON.parse(
      await readFile(new URL('../tests/fixtures/legacy-headings.json', import.meta.url), 'utf8'),
    )
    if (legacy[route])
      assertLegacyHeadings(
        findAll(htmlTree, (node) => node.properties?.dataArticleBody !== undefined)[0],
        legacy[route],
      )
    const markdown = await readFile(
      path.join(dist, decodeURIComponent(getMarkdownPath(route))),
      'utf8',
    )
    const exported = findAll(parseMarkdown(markdown), (node) => node.type === 'code')
    const original = findAll(tree, (node) => node.type === 'code')
    // Source Markdown is an independent oracle; MDX Code components add rendered blocks.
    for (const code of original)
      assert.ok(
        exported.some(
          (candidate) => candidate.value === code.value && candidate.lang === code.lang,
        ),
        `${route}: source code changed (${code.lang}): ${code.value.slice(0, 60)}`,
      )
    assert.ok(markdown.includes(data.description), `${route}: missing visible summary`)
    if (data.contentKind === 'translation') {
      assert.ok(
        markdown.includes(data.source.title) && markdown.includes(data.source.url),
        `${route}: source lost`,
      )
      if (data.source.author) assert.ok(markdown.includes(data.source.author.name))
      if (!data.translator) assert.ok(markdown.includes('Translated by not specified'))
    }
  }
  return pages
}
