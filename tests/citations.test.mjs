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

test('full section identity rejects shared-prefix swaps and explicit aliases preserve renamed ancestor context', () => {
  const prefix = '相同的章节内容前缀。'.repeat(20)
  const baseline = body(
    `<h2 id="parent">父标题</h2><h3 id="first">相同标题</h3><p>${prefix}第一节结尾</p><h3 id="second">相同标题</h3><p>${prefix}第二节结尾</p>`,
  )
  const expected = headingSections(baseline)
  assert.equal(expected[1].following, expected[2].following)
  assert.notEqual(expected[1].contentHash, expected[2].contentHash)
  const swapped = body(
    `<h2 id="parent">父标题</h2><h3 id="second">相同标题</h3><p>${prefix}第一节结尾</p><h3 id="first">相同标题</h3><p>${prefix}第二节结尾</p>`,
  )
  assert.throws(() => assertLegacyHeadings(swapped, expected), /Legacy/)
  const renamed = body(
    `<p><a id="parent"></a></p><h2 id="new-parent">父标题改名</h2><h3 id="first">相同标题</h3><p>${prefix}第一节结尾</p><h3 id="second">相同标题</h3><p>${prefix}第二节结尾</p>`,
  )
  assert.doesNotThrow(() => assertLegacyHeadings(renamed, expected))
})

test('a heading with the same body cannot steal an ID from another depth or ancestor', () => {
  const baseline = body(
    '<h2 id="需求和设计">需求和设计</h2><h3 id="变化-1">变化</h3><p>相同正文。</p>',
  )
  const expected = headingSections(baseline)
  assert.equal(expected[0].following, expected[1].following)
  assert.throws(
    () =>
      assertLegacyHeadings(
        body('<h2 id="变化-1">需求和设计</h2><h3 id="需求和设计">变化</h3><p>相同正文。</p>'),
        expected,
      ),
    /Legacy/,
  )
})

test('section identity ignores generated styles, controls and visual code gutters', () => {
  const original = body(
    '<h2 id="code">代码</h2><div><style>.old{color:red}</style><pre data-language="js"><code><div class="ec-line"><span class="ln">1</span><div class="code">const answer = 42;</div></div></code></pre><button>Copy</button></div>',
  )
  const changed = body(
    '<h2 id="code">代码</h2><div><style>.new{color:blue}</style><pre data-language="js"><code><div class="ec-line"><span class="ln">42</span><div class="code">const answer = 42;</div></div></code></pre><button>New copy control</button></div>',
  )
  assert.doesNotThrow(() => assertLegacyHeadings(changed, headingSections(original)))
})
