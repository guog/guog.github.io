import assert from 'node:assert/strict'
import test from 'node:test'
import { articleStructuredData, safeJSON } from '../src/utils/reading.ts'
import { assertLegacyHeadings, headingSections } from '../src/utils/headings.mjs'
import { parseHTML, findAll } from '../src/integrations/markdown.mjs'
const body = (html) =>
  findAll(parseHTML(`<main>${html}</main>`), (node) => node.tagName === 'main')[0]
const original = {
  title: '标题',
  description: '简介',
  pubDate: new Date('2026-09-04'),
  contentKind: 'original',
}

test('BlogPosting records verified roles and dates without fabricating an update or translator', () => {
  const json = articleStructuredData('nested/post', original)
  assert.equal(json.author.name, 'guog')
  assert.equal(json.url, 'https://guog.github.io/blog/nested/post/')
  assert.equal(json.mainEntityOfPage, json.url)
  assert.equal(json.dateModified, undefined)
  assert.equal(json.translator, undefined)
  assert.equal(json.translationOfWork, undefined)
  const translated = articleStructuredData('translation', {
    ...original,
    contentKind: 'translation',
    updatedDate: new Date('2026-09-15'),
    source: {
      title: 'Original',
      url: 'https://example.com/original',
      publishedDate: new Date('2026-08-21'),
      author: { name: 'Verified Author' },
    },
  })
  assert.equal(translated.author.name, 'Verified Author')
  assert.equal(translated.translator, undefined)
  assert.equal(translated.translationOfWork.datePublished, '2026-08-21T00:00:00.000Z')
  assert.equal(translated.datePublished, '2026-09-04T00:00:00.000Z')
  assert.equal(translated.dateModified, '2026-09-15T00:00:00.000Z')
  const unknown = articleStructuredData('unknown', {
    ...original,
    contentKind: 'translation',
    source: {
      title: 'Original',
      url: 'https://example.com',
      publishedDate: new Date('2026-08-21'),
    },
    translator: { name: 'Verified Translator' },
  })
  assert.equal(unknown.author, undefined)
  assert.equal(unknown.translator.name, 'Verified Translator')
})

test('structured JSON cannot break out of a script element', () => {
  const title = '</script><script>alert("x")</script>'
  const serialized = safeJSON(articleStructuredData('test', { ...original, title }))
  assert.ok(!serialized.includes('<'))
  assert.equal(JSON.parse(serialized).headline, title)
  const tree = parseHTML(
    `<script type="application/ld+json">${serialized}</script><main><h1>Safe</h1></main>`,
  )
  assert.equal(findAll(tree, (node) => node.tagName === 'script').length, 1)
})

test('legacy links survive a renamed heading with an explicit alias and reject duplicate/reordered identities', () => {
  const baseline = body(
    '<h2 id="first">治理</h2><p>第一阶段的治理要求。</p><h2 id="second">治理</h2><p>第二阶段的治理要求。</p>',
  )
  const expected = headingSections(baseline)
  assert.doesNotThrow(() => assertLegacyHeadings(baseline, expected))
  assert.doesNotThrow(() =>
    assertLegacyHeadings(
      body(
        '<a id="first"></a><h2 id="renamed">新标题</h2><p>第一阶段的治理要求。</p><h2 id="second">治理</h2><p>第二阶段的治理要求。</p>',
      ),
      expected,
    ),
  )
  for (const html of [
    '<h2 id="first">治理</h2><p>第二阶段的治理要求。</p><h2 id="second">治理</h2><p>第一阶段的治理要求。</p>',
    '<h2 id="first">治理</h2><p>第一阶段的治理要求。</p><h2 id="first">治理</h2><p>第二阶段的治理要求。</p>',
    '<h2 id="renamed">治理</h2><p>第一阶段的治理要求。</p><h2 id="second">治理</h2><p>第二阶段的治理要求。</p>',
  ])
    assert.throws(() => assertLegacyHeadings(body(html), expected), /Legacy/)
})
