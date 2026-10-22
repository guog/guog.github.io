import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileRoute, resolveLocalTarget } from '../scripts/check-built.mjs'
import { getPostUrl, getReadingMinutes, getTaxonomyId, normalizePostId } from '../src/utils/blog.ts'

const baseline = JSON.parse(
  await readFile(new URL('./fixtures/legacy-urls.json', import.meta.url), 'utf8'),
)

test('every historic article keeps its exact published trailing-slash URL', () => {
  for (const article of baseline.articles) assert.equal(getPostUrl(article.id), article.url)
})

test('nested, mixed-case, Chinese and special-character IDs are losslessly encoded', () => {
  for (const [id, expected] of [
    ['nested/guide', '/blog/nested/guide/'],
    ['nested/MixedCase', '/blog/nested/MixedCase/'],
    ['中文路径/文章', '/blog/%E4%B8%AD%E6%96%87%E8%B7%AF%E5%BE%84/%E6%96%87%E7%AB%A0/'],
    ['space and name', '/blog/space%20and%20name/'],
    ['Cafe\u0301', '/blog/Caf%C3%A9/'],
  ])
    assert.equal(getPostUrl(id), expected)
})

test('Chinese reading time is positive for empty and Chinese-only articles', () => {
  assert.equal(getReadingMinutes(''), 1)
  assert.ok(getReadingMinutes('中'.repeat(800)) >= 2)
  assert.ok(getReadingMinutes('word '.repeat(600)) >= 3)
})

test('taxonomy anchors distinguish categories and tags', () => {
  assert.notEqual(getTaxonomyId('tag', '技术'), getTaxonomyId('category', '技术'))
  assert.notEqual(getTaxonomyId('tag', 'A B'), getTaxonomyId('tag', 'A-B'))
})

test('built route mapping preserves directory URLs and flat error pages', () => {
  assert.equal(fileRoute('index.html'), '/')
  assert.equal(fileRoute('blog/nested/MixedCase/index.html'), '/blog/nested/MixedCase/')
  assert.equal(fileRoute('404.html'), '/404.html')
})

test('resource resolver checks actual files, encoded Chinese URLs, and missing resources', async () => {
  const dist = await mkdtemp(path.join(os.tmpdir(), 'blog-built-test-'))
  try {
    await mkdir(path.join(dist, 'blog/中文'), { recursive: true })
    const expected = path.join(dist, 'blog/中文/index.html')
    await writeFile(expected, '<h1>中文</h1>')
    assert.equal(
      await resolveLocalTarget(
        dist,
        new URL('https://guog.github.io/blog/%E4%B8%AD%E6%96%87/?x=1#heading'),
      ),
      expected,
    )
    await assert.rejects(
      resolveLocalTarget(dist, new URL('https://guog.github.io/missing/')),
      /Missing local resource/,
    )
    await assert.rejects(
      resolveLocalTarget(dist, new URL('https://guog.github.io/%ZZ/')),
      /Invalid URL encoding/,
    )
  } finally {
    await rm(dist, { recursive: true, force: true })
  }
})

test('IDs normalize to NFC and reject ambiguous or unsafe path syntax', () => {
  assert.equal(normalizePostId('Cafe\u0301'), 'Café')
  for (const id of [
    '',
    '/post',
    'post/',
    'nested//post',
    '.',
    '..',
    'nested/../post',
    '100%ready',
    'hash#value',
    'query?value',
    'back\\slash',
    'control\u0000',
  ])
    assert.throws(() => getPostUrl(id), undefined, id)
})
