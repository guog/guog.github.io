#!/usr/bin/env node
/** Verify real production artifacts, including every same-origin link and anchor. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { access, readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from 'parse5'
import { articleFiles, parseArticle, walk } from './check-content.mjs'

const SITE = 'https://guog.github.io'
const baseline = JSON.parse(
  await readFile(new URL('../tests/fixtures/legacy-urls.json', import.meta.url), 'utf8'),
)
const attribute = (node, name) => node.attrs?.find((attr) => attr.name === name)?.value
const elements = (tree, predicate) => {
  const found = []
  walk(tree, (node) => {
    if (predicate(node)) found.push(node)
  })
  return found
}
const decodeXML = (text) =>
  text.replace(
    /&(?:amp|lt|gt|quot|apos);|&#(?:x[\da-f]+|\d+);/gi,
    (entity) =>
      ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity] ??
      String.fromCodePoint(
        entity[2] === 'x' ? Number.parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1)),
      ),
  )
const xmlValues = (xml, tag) =>
  [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'g'))].map((match) =>
    decodeXML(match[1]),
  )

async function filesWithin(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await filesWithin(file)))
    else files.push(file)
  }
  return files
}

export function fileRoute(relative) {
  const route = `/${relative.split(path.sep).join('/')}`
  return route.endsWith('/index.html') ? route.slice(0, -10) : route
}

export async function resolveLocalTarget(dist, url) {
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    throw new Error(`Invalid URL encoding: ${url.href}`)
  }
  const target = path.resolve(dist, `.${pathname}`)
  if (target !== path.resolve(dist) && !target.startsWith(`${path.resolve(dist)}${path.sep}`))
    throw new Error(`URL escapes build directory: ${url.href}`)
  for (const candidate of [target, path.join(target, 'index.html')]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate
    } catch {
      /* Try directory index. */
    }
  }
  throw new Error(`Missing local resource: ${url.pathname}`)
}

export async function checkBuilt({ root = process.cwd(), dist = path.join(root, 'dist') } = {}) {
  const errors = []
  const check = async (label, fn) => {
    try {
      await fn()
    } catch (error) {
      errors.push(`${label}: ${error.message}`)
    }
  }
  await access(dist)
  const files = await filesWithin(dist)
  const htmlFiles = files.filter((filename) => filename.endsWith('.html'))
  assert.ok(htmlFiles.length, 'No built HTML found; run npm run build first')
  const documents = new Map()
  for (const filename of htmlFiles) documents.set(filename, parse(await readFile(filename, 'utf8')))
  const documentAt = async (url) => {
    const filename = await resolveLocalTarget(dist, new URL(url, SITE))
    const document = documents.get(filename)
    assert.ok(document, `${url} is not an HTML page`)
    return document
  }

  for (const route of [
    ...baseline.pages,
    ...baseline.articles.filter((post) => !post.retired).map((post) => post.url),
    ...baseline.staticResources.map((resource) => resource.url),
  ]) {
    await check(`Legacy URL ${route}`, () => resolveLocalTarget(dist, new URL(route, SITE)))
  }
  for (const [filename, document] of documents) {
    const route = fileRoute(path.relative(dist, filename))
    const pageURL = new URL(route, SITE)
    await check(`${route} language`, () =>
      assert.equal(
        attribute(elements(document, (node) => node.tagName === 'html')[0], 'lang'),
        'zh-CN',
      ),
    )
    await check(`${route} title`, () =>
      assert.equal(elements(document, (node) => node.tagName === 'title').length, 1),
    )
    await check(`${route} H1`, () =>
      assert.equal(elements(document, (node) => node.tagName === 'h1').length, 1),
    )
    await check(`${route} canonical`, () => {
      const canonicals = elements(
        document,
        (node) => node.tagName === 'link' && attribute(node, 'rel') === 'canonical',
      )
      assert.equal(canonicals.length, 1, 'Expected one canonical link')
      const canonical = new URL(attribute(canonicals[0], 'href'))
      assert.equal(canonical.origin, SITE)
      assert.equal(decodeURI(canonical.pathname), decodeURI(pageURL.pathname))
    })
    await check(`${route} metadata`, () => {
      const meta = (key, value) =>
        elements(document, (node) => node.tagName === 'meta' && attribute(node, key) === value)
      assert.ok(attribute(meta('name', 'description')[0], 'content')?.trim(), 'Missing description')
      assert.equal(attribute(meta('property', 'og:locale')[0], 'content'), 'zh_CN')
      assert.ok(attribute(meta('name', 'twitter:card')[0], 'content'), 'Missing Twitter card')
    })
    const ids = elements(document, (node) => attribute(node, 'id') !== undefined).map((node) =>
      attribute(node, 'id'),
    )
    await check(`${route} unique anchors`, () =>
      assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs'),
    )
    const links = elements(document, (node) =>
      ['a', 'img', 'source', 'script', 'link', 'video', 'audio'].includes(node.tagName),
    )
    for (const node of links) {
      const references = [
        attribute(node, 'href'),
        attribute(node, 'src'),
        attribute(node, 'poster'),
      ].filter(Boolean)
      // URL tokens inside srcset; data URLs are skipped as complete inline resources.
      const srcset = attribute(node, 'srcset')
      if (srcset && !srcset.startsWith('data:'))
        references.push(...srcset.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]))
      for (const reference of references) {
        let url
        try {
          url = new URL(reference, pageURL)
        } catch {
          errors.push(`${route}: Invalid URL ${reference}`)
          continue
        }
        if (url.origin !== SITE || !['https:', 'http:'].includes(url.protocol)) continue
        await check(`${route} → ${reference}`, async () => {
          const target = await resolveLocalTarget(dist, url)
          if (url.hash && node.tagName === 'a' && documents.has(target)) {
            const anchor = decodeURIComponent(url.hash.slice(1))
            assert.ok(
              elements(
                documents.get(target),
                (element) =>
                  attribute(element, 'id') === anchor ||
                  (element.tagName === 'a' && attribute(element, 'name') === anchor),
              ).length,
              `Missing anchor #${anchor}`,
            )
          }
        })
      }
      if (node.tagName === 'img')
        await check(`${route} image alt`, () =>
          assert.ok(attribute(node, 'alt')?.trim(), 'Image has no meaningful alt'),
        )
    }
    await check(`${route} no obsolete theme demos`, async () => {
      const text = await readFile(filename, 'utf8')
      assert.doesNotMatch(
        text,
        /astro-cactus\.chrismwilliams\.com|astro-theme-cactus\.netlify\.app|href=["']\/notes\//,
      )
    })
  }

  const rss = await readFile(path.join(dist, 'rss.xml'), 'utf8')
  const sitemapFiles = files.filter((filename) => /(?:^|\/)sitemap.*\.xml$/.test(filename))
  const sitemap = (
    await Promise.all(sitemapFiles.map((filename) => readFile(filename, 'utf8')))
  ).join('\n')
  const sitemapURLs = xmlValues(sitemap, 'loc')
  const rssItems = xmlValues(rss, 'item')
  const rssURLs = rssItems.flatMap((item) => xmlValues(item, 'link'))
  for (const url of [...sitemapURLs, ...rssURLs])
    await check(`Feed URL ${url}`, async () => {
      const parsed = new URL(url)
      assert.equal(parsed.origin, SITE)
      await resolveLocalTarget(dist, parsed)
    })
  for (const post of baseline.articles) {
    if (post.retired) {
      await check(`Retired sample ${post.url}`, async () => {
        await assert.rejects(
          resolveLocalTarget(dist, new URL(post.url, SITE)),
          /Missing local resource/,
        )
        assert.ok(!rssURLs.includes(`${SITE}${post.url}`), 'Retired sample leaked into RSS')
        assert.ok(!sitemapURLs.includes(`${SITE}${post.url}`), 'Retired sample leaked into sitemap')
        for (const document of documents.values())
          assert.equal(
            elements(
              document,
              (node) => node.tagName === 'a' && attribute(node, 'href') === post.url,
            ).length,
            0,
            'Retired sample leaked into navigation',
          )
      })
      continue
    }
    const url = `${SITE}${post.url}`
    await check(`Legacy RSS ${post.url}`, () => assert.ok(rssURLs.includes(url)))
    await check(`Legacy sitemap ${post.url}`, () => assert.ok(sitemapURLs.includes(url)))
    await check(`Legacy Giscus ${post.url}`, async () => {
      const document = await documentAt(post.url)
      assert.ok(
        elements(document, (node) => attribute(node, 'class')?.split(/\s+/).includes('giscus'))
          .length,
        'Missing Giscus container',
      )
      // Configuration can live in HTML attributes or a small inline loader. Runtime attrs are tested in Playwright.
      const html = await readFile(await resolveLocalTarget(dist, new URL(post.url, SITE)), 'utf8')
      for (const value of Object.values(baseline.giscus))
        assert.ok(html.includes(value), `Missing Giscus value ${value}`)
    })
  }
  const { getPostUrl } = await import(pathToFileURL(path.join(root, 'src/utils/blog.ts')).href)
  for (const file of await articleFiles(path.join(root, 'src/content/blog'))) {
    const { data } = parseArticle(await readFile(file, 'utf8'), file)
    const id =
      data.slug ||
      path
        .relative(path.join(root, 'src/content/blog'), file)
        .replace(/\.mdx?$/, '')
        .split(path.sep)
        .join('/')
    const route = getPostUrl(id)
    const absolute = `${SITE}${route}`
    if (data.draft) {
      await check(`Draft excluded ${route}`, async () => {
        assert.ok(!rssURLs.includes(absolute), 'Draft leaked into RSS')
        assert.ok(!sitemapURLs.includes(absolute), 'Draft leaked into sitemap')
        await assert.rejects(
          resolveLocalTarget(dist, new URL(route, SITE)),
          /Missing local resource/,
        )
        for (const document of documents.values())
          assert.ok(
            !elements(document, (node) => node.tagName === 'a' && attribute(node, 'href') === route)
              .length,
            'Draft leaked into navigation',
          )
      })
    } else {
      await check(`Published article ${route}`, async () => {
        await documentAt(route)
        const html = await readFile(await resolveLocalTarget(dist, new URL(route, SITE)), 'utf8')
        for (const value of Object.values(baseline.giscus))
          assert.ok(html.includes(value), `Missing Giscus value ${value}`)
        assert.ok(rssURLs.includes(absolute), 'Missing from RSS')
        assert.ok(sitemapURLs.includes(absolute), 'Missing from sitemap')
        const item = rssItems.find((entry) => xmlValues(entry, 'link').includes(absolute))
        assert.equal(xmlValues(item, 'title')[0], data.title)
        assert.equal(
          new Date(xmlValues(item, 'pubDate')[0]).toISOString().slice(0, 10),
          data.pubDate,
        )
        for (const category of [data.category ?? '技术', ...(data.tags ?? [])])
          assert.ok(
            xmlValues(item, 'category').includes(category),
            `RSS omits category/tag ${category}`,
          )
      })
    }
  }
  await check('Pagefind production index', async () => {
    await access(path.join(dist, 'pagefind/pagefind.js'))
    const entry = JSON.parse(
      await readFile(path.join(dist, 'pagefind/pagefind-entry.json'), 'utf8'),
    )
    assert.ok(
      Object.keys(entry.languages ?? {}).some((language) => /^zh(?:-|$)/i.test(language)),
      'Missing Chinese Pagefind language index',
    )
  })
  await check('Pagefind Chinese runtime query', () => {
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL('../tests/e2e/check-search.mjs', import.meta.url)), dist],
      { encoding: 'utf8', stdio: 'pipe' },
    )
  })
  await check('Robots sitemap declaration', async () =>
    assert.ok(
      (await readFile(path.join(dist, 'robots.txt'), 'utf8')).includes(`${SITE}/sitemap-index.xml`),
    ),
  )
  return {
    errors,
    pages: htmlFiles.length,
    links: rssURLs.length,
    sitemapURLs: sitemapURLs.length,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const index = process.argv.indexOf('--dist')
    const result = await checkBuilt({
      dist: index === -1 ? undefined : path.resolve(process.argv[index + 1]),
    })
    if (result.errors.length) {
      console.error(result.errors.join('\n'))
      process.exitCode = 1
    } else
      console.log(
        `Built site OK: ${result.pages} pages, ${result.links} RSS articles, ${result.sitemapURLs} sitemap locations; legacy URLs and local resources resolve.`,
      )
  } catch (error) {
    console.error(error.stack)
    process.exitCode = 1
  }
}
