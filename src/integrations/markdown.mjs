/** Build-only adapter: parsing and Markdown serialization belong to unified. */
import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import { getMarkdownPath } from '../utils/markdown.ts'

export function visit(node, fn) {
  fn(node)
  for (const child of node.children ?? []) visit(child, fn)
}
export function findAll(node, predicate) {
  const matches = []
  visit(node, (child) => {
    if (predicate(child)) matches.push(child)
  })
  return matches
}
export const textContent = (node) =>
  node.type === 'text' ? node.value : (node.children ?? []).map(textContent).join('')
const classes = (node) => node.properties?.className ?? []
export const hasClass = (node, name) => classes(node).includes(name)
export const parseHTML = (html) => unified().use(rehypeParse).parse(html)
export function pagePath(relative) {
  // File names are decoded on disk; URL segments are encoded once at the boundary.
  const encoded = relative.split(path.sep).map(encodeURIComponent).join('/')
  if (encoded === 'index.html') return '/'
  return encoded.endsWith('/index.html') ? `/${encoded.slice(0, -10)}` : `/${encoded}`
}
export async function filesWithin(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await filesWithin(filename)))
    else files.push(filename)
  }
  return files.sort()
}

export function codeBlocks(tree) {
  return findAll(tree, (node) => node.tagName === 'pre').map((pre) => {
    const lines = findAll(pre, (node) => hasClass(node, 'ec-line'))
    if (!lines.length)
      return {
        value: textContent(pre).replace(/\n$/, ''),
        lang: String(pre.properties?.dataLanguage ?? ''),
      }
    const values = lines.map((line) => {
      const code = findAll(line, (node) => hasClass(node, 'code'))[0]
      if (!code) throw new Error('Expressive Code line has no code content')
      // Expressive Code represents an empty source line with a standalone newline.
      const value = textContent(code)
      return value === '\n' ? '' : value
    })
    return { value: values.join('\n'), lang: String(pre.properties?.dataLanguage ?? '') }
  })
}

const escapeAttribute = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

export async function convertPage(html, htmlURL) {
  const document = parseHTML(html)
  const title = textContent(
    findAll(document, (node) => node.tagName === 'title')[0] ?? { children: [] },
  )
  const mains = findAll(document, (node) => node.tagName === 'main')
  if (mains.length !== 1) throw new Error(`${htmlURL}: expected exactly one main`)
  const main = structuredClone(mains[0])
  const expectedCode = codeBlocks(main)
  for (const element of findAll(
    main,
    (node) => node.tagName?.includes('-') && node.properties?.dataMarkdownExclude === undefined,
  )) {
    if (!textContent(element).trim())
      throw new Error(`${htmlURL}: custom element ${element.tagName} needs a static text fallback`)
  }
  // Preserve every real in-content anchor, including category/tag anchors on list items.
  const clean = (node) => {
    if (!node.children) return
    node.children = (node.children ?? []).flatMap((child) => {
      if (
        ['script', 'style', 'noscript', 'button', 'svg'].includes(child.tagName) ||
        child.properties?.dataMarkdownExclude !== undefined ||
        hasClass(child, 'giscus')
      )
        return []
      clean(child)
      for (const key of ['href', 'src']) {
        if (typeof child.properties?.[key] === 'string') {
          const value = child.properties[key]
          child.properties[key] = new URL(value, htmlURL).href
        }
      }
      if (child.properties?.id) {
        const anchor = {
          type: 'element',
          tagName: 'markdown-anchor',
          properties: { id: child.properties.id },
          children: [],
        }
        return [anchor, child]
      }
      return [child]
    })
  }
  clean(main)
  let codeIndex = 0
  const processor = unified()
    .use(rehypeRemark, {
      handlers: {
        pre() {
          const code = expectedCode[codeIndex++]
          if (!code) throw new Error('Code block count changed during content selection')
          return { type: 'code', lang: code.lang || null, meta: null, value: code.value }
        },
        'markdown-anchor'(_state, node) {
          return { type: 'html', value: `<a id="${escapeAttribute(node.properties.id)}"></a>` }
        },
      },
    })
    .use(remarkGfm)
    .use(remarkStringify, { fences: true, bullet: '-', listItemIndent: 'one' })
  const root = { type: 'root', children: main.children }
  const markdownTree = processor.runSync(root)
  // Homepage intentionally has no HTML H1; provide a document title in its text representation.
  if (!findAll(markdownTree, (node) => node.type === 'heading' && node.depth === 1).length)
    markdownTree.children.unshift({
      type: 'heading',
      depth: 1,
      children: [{ type: 'text', value: title }],
    })
  const markdown = processor.stringify(markdownTree)
  if (codeIndex !== expectedCode.length) throw new Error('Some code blocks were not converted')
  return {
    title,
    markdown: `${markdown}\n[HTML](${htmlURL}) · [llms.txt](${new URL('/llms.txt', htmlURL).href})\n`,
    code: expectedCode,
  }
}

export async function exportMarkdown(directory, site) {
  if (!site) throw new Error('Markdown export requires Astro site')
  const files = await filesWithin(directory)
  const htmlFiles = files.filter((file) => file.endsWith('.html'))
  const pages = []
  const targets = new Set()
  for (const file of htmlFiles) {
    const route = pagePath(path.relative(directory, file))
    const markdownPath = getMarkdownPath(route)
    const target = path.join(directory, decodeURIComponent(markdownPath))
    if (targets.has(target)) throw new Error(`Markdown path collision: ${markdownPath}`)
    targets.add(target)
    try {
      await access(target)
      throw new Error(`Markdown would overwrite an existing resource: ${markdownPath}`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const html = await readFile(file, 'utf8')
    const result = await convertPage(html, new URL(route, site).href)
    await writeFile(target, result.markdown)
    pages.push({
      route,
      markdownPath,
      title: result.title,
      noindex: /<meta\s+name="robots"\s+content="noindex"/.test(html),
    })
  }
  const entries = (selection) =>
    unified()
      .use(remarkStringify, { bullet: '-' })
      .stringify({
        type: 'root',
        children: [
          {
            type: 'list',
            ordered: false,
            spread: false,
            children: selection.map((page) => ({
              type: 'listItem',
              spread: false,
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'link',
                      url: new URL(page.markdownPath, site).href,
                      children: [{ type: 'text', value: page.title }],
                    },
                  ],
                },
              ],
            })),
          },
        ],
      })
      .trimEnd()
  const navigation = pages.filter((page) =>
    ['/', '/blog/', '/tags/', '/search/'].includes(page.route),
  )
  // Keep discovery curated: the archive links to the complete, current article collection.
  const articles = pages
    .filter((page) => page.route.startsWith('/blog/') && page.route !== '/blog/' && !page.noindex)
    .slice(0, 20)
  await writeFile(
    path.join(directory, 'llms.txt'),
    `# guog\n\n> guog 的中文技术博客，讨论软件工程、研发协作与 AI。\n\n页面提供同次构建的 Markdown。HTML 链接用于正式引用；文章索引列出全部公开文章。\n\n## Navigation\n\n${entries(navigation)}\n\n## Articles\n\n${entries(articles)}\n`,
  )
  return pages
}

export default function markdownIntegration() {
  let site
  return {
    name: 'guog-markdown',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site
      },
      'astro:build:done': async ({ dir, logger }) => {
        const pages = await exportMarkdown(fileURLToPath(dir), site)
        logger.info(
          `Markdown: ${pages.length}/${pages.length} HTML pages, including search and 404; llms.txt generated.`,
        )
      },
    },
  }
}
