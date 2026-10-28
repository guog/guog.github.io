import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import test from 'node:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { convertPage, exportMarkdown, findAll, pagePath } from '../src/integrations/markdown.mjs'
import { getMarkdownPath } from '../src/utils/markdown.ts'
import { readingPrompt } from '../src/utils/reading.ts'
import { preserveCodeBlock, createMarkdownCodeBlock } from '../src/integrations/preserve-code.mjs'
import { validateMetadata } from '../scripts/check-content.mjs'
const parseMD = (md) => unified().use(remarkParse).use(remarkGfm).parse(md)
const page = (body) =>
  `<html><head><title>Example</title></head><body><main>${body}</main></body></html>`

test('v2 paths cover home, directories, nested/slash-bearing tags, pagination and error file', () => {
  for (const [file, url, md] of [
    ['index.html', '/', '/index.md'],
    ['blog/index.html', '/blog/', '/blog/index.md'],
    ['blog/page/2/index.html', '/blog/page/2/', '/blog/page/2/index.md'],
    ['tags/CI/CD/index.html', '/tags/CI/CD/', '/tags/CI/CD/index.md'],
    [
      'tags/软件工程/index.html',
      '/tags/%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B/',
      '/tags/%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B/index.md',
    ],
    ['404.html', '/404.html', '/404.html.md'],
  ]) {
    assert.equal(pagePath(file), url)
    assert.equal(getMarkdownPath(url), md)
  }
})

test('independent EC golden preserves whitespace, tabs, entities, numbers and nested fences', async () => {
  // Expected output is hand-written, independent of the exporter and its line extractor.
  const expected =
    '42 starts here  \n\tif (a < b && c > 1) {\n\n\n  console.log("```", "&");\n}\n\n'
  const escape = (value) =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const lines = expected
    .split('\n')
    .map(
      (value, index) =>
        `<div class="ec-line"><div class="gutter"><span class="ln">${index + 42}</span></div><div class="code"><span>${escape(value || '\n')}</span></div></div>`,
    )
    .join('')
  const html = page(
    `<h1>Golden</h1><div class="expressive-code"><pre data-language="typescript"><code>${lines}</code></pre><div class="copy"><button>Copy</button></div></div>`,
  )
  const { markdown } = await convertPage(html, 'https://guog.github.io/blog/example/')
  const codes = findAll(parseMD(markdown), (node) => node.type === 'code')
  assert.deepEqual(
    codes.map(({ lang, value }) => ({ lang, value })),
    [{ lang: 'typescript', value: expected }],
  )
  assert.match(markdown, /````typescript/)
})

test('content includes taxonomy aside, links, anchors, GFM tables/footnotes, and excludes UI', async () => {
  const html = page(
    '<h1>Index</h1><aside><h2 id="tags">Tags</h2><a href="/tags/CI/CD/">CI/CD</a></aside><p id="category-技术">分类</p><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table><p><img src="/favicon.svg" alt="图"/></p><section data-markdown-exclude>PrivatePromptSentinel</section><section class="comments" data-markdown-exclude>Comments</section>',
  )
  const { markdown } = await convertPage(html, 'https://guog.github.io/blog/')
  assert.match(markdown, /CI\/CD/)
  assert.match(markdown, /https:\/\/guog.github.io\/tags\/CI\/CD\//)
  assert.match(markdown, /<a id="category-技术"><\/a>/)
  assert.equal(findAll(parseMD(markdown), (node) => node.type === 'table').length, 1)
  assert.match(markdown, /!\[图\]\(https:\/\/guog.github.io\/favicon.svg\)/)
  assert.doesNotMatch(markdown, /PrivatePromptSentinel|Comments/)
})

test('enumerates all real pages, rejects resource collisions, and omits 404 from curated llms', async () => {
  const dist = await mkdtemp(path.join(os.tmpdir(), 'blog-md-test-'))
  try {
    for (const file of ['index.html', 'search/index.html', '404.html', 'blog/page/2/index.html']) {
      await mkdir(path.dirname(path.join(dist, file)), { recursive: true })
      await writeFile(path.join(dist, file), page('<h1>Content</h1>'))
    }
    const pages = await exportMarkdown(dist, 'https://guog.github.io')
    assert.equal(pages.length, 4)
    assert.match(await readFile(path.join(dist, '404.html.md'), 'utf8'), /Content/)
    assert.doesNotMatch(await readFile(path.join(dist, 'llms.txt'), 'utf8'), /404/)
    await assert.rejects(exportMarkdown(dist, 'https://guog.github.io'), /overwrite/)
  } finally {
    await rm(dist, { recursive: true, force: true })
  }
})

test('prompt quotes current page and verified attribution without inventing an unknown translator', () => {
  const data = {
    title: '中文 </textarea>',
    description: '测试',
    pubDate: new Date('2026-09-04'),
    contentKind: 'translation',
    source: {
      title: 'Original',
      url: 'https://example.com/original',
      publishedDate: new Date('2026-08-21'),
      author: { name: 'Verified Name' },
    },
  }
  const prompt = readingPrompt('nested/post', data)
  assert.match(prompt, /原作者：Verified Name；译者：未注明/)
  assert.match(prompt, /https:\/\/guog.github.io\/blog\/nested\/post\/index.md/)
  assert.match(prompt, /只能|只读到部分内容/)
})

test('translation validation rejects missing source, unsafe URLs, impossible dates and contradictory roles', () => {
  const base = {
    title: '译文',
    description: '简介',
    pubDate: '2026-09-04',
    contentKind: 'translation',
  }
  const source = { title: 'Original', url: 'https://example.com', publishedDate: '2026-08-21' }
  assert.deepEqual(validateMetadata({ ...base, source }), [])
  for (const data of [
    base,
    { ...base, source: { ...source, url: 'javascript:alert(1)' } },
    { ...base, source: { ...source, publishedDate: '2026-02-30' } },
    { ...base, source, translator: { name: '' } },
    { ...base, contentKind: 'original', source },
  ])
    assert.ok(validateMetadata(data).length)
})

test('Expressive Code public adapter retains the literal source, removing only the HAST framing newline', () => {
  const original = '\n\t42  \n\n\n'
  assert.equal(preserveCodeBlock({ code: original, language: 'typescript' }).code, original)
  assert.equal(
    createMarkdownCodeBlock({ input: { code: original + '\n', language: 'typescript' } }).code,
    original,
  )
})

test('a client-only custom component without a static fallback fails instead of silently vanishing', async () => {
  await assert.rejects(
    convertPage(page('<h1>Page</h1><my-chart></my-chart>'), 'https://guog.github.io/'),
    /static text fallback/,
  )
})
