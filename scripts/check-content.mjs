#!/usr/bin/env node
/** Validate metadata everywhere, but apply writing rules only to edited content. */
import { execFileSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseFragment } from 'parse5'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { parseDocument } from 'yaml'
import { normalizePostId } from '../src/utils/blog.ts'

const CONTENT_DIRECTORY = 'src/content/blog'
const FIELDS = new Set([
  'title',
  'description',
  'pubDate',
  'updatedDate',
  'category',
  'tags',
  'draft',
  'slug',
  'coverImage',
  'ogImage',
  'contentKind',
  'author',
  'translator',
  'source',
])

export function walk(node, visitor) {
  visitor(node)
  for (const child of node.children ?? node.childNodes ?? []) walk(child, visitor)
}

export function parseArticle(source, filename = 'article.md') {
  const parser = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm)
  if (/\.mdx$/i.test(filename)) parser.use(remarkMdx)
  const tree = parser.parse(source)
  const frontmatter = tree.children[0]
  if (frontmatter?.type !== 'yaml') throw new Error('文章必须以 YAML Frontmatter 开始')
  const document = parseDocument(frontmatter.value, { uniqueKeys: true })
  if (document.errors.length)
    throw new Error(document.errors.map((error) => error.message).join('; '))
  const data = document.toJS()
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Frontmatter 必须是对象')
  return { data, tree }
}

export function validDate(value) {
  if (typeof value !== 'string') return false
  // A calendar date is intentional: ambiguous locale dates and rolling invalid dates are rejected.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function validateMetadata(data) {
  const problems = []
  for (const key of Object.keys(data))
    if (!FIELDS.has(key)) problems.push(`未知 Frontmatter 字段：${key}`)
  for (const key of ['title', 'description']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) problems.push(`${key} 必须是非空字符串`)
  }
  if (!validDate(data.pubDate)) problems.push('pubDate 必须是有效的 YYYY-MM-DD 日期')
  if (data.updatedDate !== undefined) {
    if (!validDate(data.updatedDate)) problems.push('updatedDate 必须是有效的 YYYY-MM-DD 日期')
    else if (validDate(data.pubDate) && data.updatedDate < data.pubDate)
      problems.push('updatedDate 不能早于 pubDate')
  }
  for (const key of ['category', 'ogImage']) {
    if (data[key] !== undefined && (typeof data[key] !== 'string' || !data[key].trim()))
      problems.push(`${key} 必须是非空字符串`)
  }
  if (
    data.coverImage !== undefined &&
    (!data.coverImage ||
      typeof data.coverImage !== 'object' ||
      Array.isArray(data.coverImage) ||
      typeof data.coverImage.src !== 'string' ||
      !data.coverImage.src.trim() ||
      typeof data.coverImage.alt !== 'string' ||
      !data.coverImage.alt.trim())
  )
    problems.push('coverImage 必须包含非空 src 与 alt 字符串')
  if (
    data.tags !== undefined &&
    (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== 'string' || !tag.trim()))
  )
    problems.push('tags 必须是非空字符串数组')
  if (data.draft !== undefined && typeof data.draft !== 'boolean')
    problems.push('draft 必须是布尔值')
  if (data.slug !== undefined) {
    try {
      normalizePostId(data.slug)
    } catch (error) {
      problems.push(`slug 无效：${error.message}`)
    }
  }
  const kind = data.contentKind ?? 'original'
  if (!['original', 'translation'].includes(kind))
    problems.push('contentKind 必须是 original 或 translation')
  const httpURL = (value) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol)
    } catch {
      return false
    }
  }
  const person = (value, field) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      typeof value.name !== 'string' ||
      !value.name.trim() ||
      (value.type !== undefined && !['Person', 'Organization'].includes(value.type)) ||
      (value.url !== undefined && !httpURL(value.url))
    )
      problems.push(`${field} 必须包含真实姓名及有效公开 URL`)
  }
  if (data.author !== undefined) person(data.author, 'author')
  if (data.translator !== undefined) person(data.translator, 'translator')
  if (kind === 'translation' && !data.source) problems.push('译文必须提供 source')
  if (kind === 'original' && (data.source || data.translator))
    problems.push('原创不能声明译文来源或译者')
  if (data.source !== undefined) {
    const source = data.source
    if (
      !source ||
      typeof source !== 'object' ||
      Array.isArray(source) ||
      typeof source.title !== 'string' ||
      !source.title.trim() ||
      !httpURL(source.url) ||
      !validDate(source.publishedDate)
    )
      problems.push('source 必须包含标题、HTTP/HTTPS URL 和有效发布日期')
    if (source?.author !== undefined) person(source.author, 'source.author')
  }
  return problems
}

export function validateStructure(tree, source) {
  const problems = []
  const lines = source.split(/\r?\n/)
  let previousDepth = 1
  const report = (node, message) =>
    problems.push(`第 ${node.position?.start.line ?? '?'} 行：${message}`)
  walk(tree, (node) => {
    if (node.type === 'heading') {
      if (node.depth === 1) report(node, '正文不能使用 H1，文章标题来自 Frontmatter')
      if (node.depth > previousDepth + 1)
        report(node, `标题层级从 H${previousDepth} 跳到 H${node.depth}`)
      if (node.depth > 4) report(node, '标题最多使用 H4')
      previousDepth = node.depth
    }
    if (
      node.type === 'code' &&
      /^\s*(?:`{3,}|~{3,})/.test(
        lines[(node.position?.start.line ?? 1) - 1].slice((node.position?.start.column ?? 1) - 1),
      ) &&
      !node.lang?.trim()
    )
      report(node, '代码围栏必须标注语言')
    if ((node.type === 'image' || node.type === 'imageReference') && !node.alt?.trim())
      report(node, '图片必须提供非空 alt 文本')
    if (node.type === 'html') {
      walk(parseFragment(node.value), (element) => {
        if (
          element.tagName === 'img' &&
          !element.attrs?.find((attr) => attr.name === 'alt')?.value.trim()
        )
          report(node, 'HTML 图片必须提供非空 alt 文本')
      })
    }
    if (
      (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
      ['img', 'Image', 'Picture'].includes(node.name)
    ) {
      const alt = node.attributes.find(
        (attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'alt',
      )
      if (!alt || alt.value === null || (typeof alt.value === 'string' && !alt.value.trim()))
        report(node, 'MDX 图片必须提供 alt 文本')
    }
  })
  return problems
}

export function validateArticle(source, filename, { structure = true } = {}) {
  try {
    const { data, tree } = parseArticle(source, filename)
    return [...validateMetadata(data), ...(structure ? validateStructure(tree, source) : [])]
  } catch (error) {
    return [`无法解析 Markdown/MDX 或 Frontmatter：${error.message}`]
  }
}

export async function articleFiles(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await articleFiles(filename)))
    else if (/\.mdx?$/.test(entry.name)) result.push(filename)
  }
  return result.sort()
}

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

export function changedArticles(root, requestedBase) {
  let base = requestedBase || process.env.CONTENT_BASE_REF
  if (base && /^0+$/.test(base)) base = git(root, ['hash-object', '-t', 'tree', '/dev/null'])
  if (!base) {
    const branch = git(root, ['branch', '--show-current'])
    if (branch === 'main') {
      try {
        base = git(root, ['rev-parse', 'HEAD^'])
      } catch {
        base = git(root, ['hash-object', '-t', 'tree', '/dev/null'])
      }
    } else {
      for (const candidate of ['origin/main', 'main']) {
        try {
          base = git(root, ['merge-base', 'HEAD', candidate])
          break
        } catch {
          /* Try the next local main reference. */
        }
      }
      if (!base) throw new Error('找不到 main 比较基线；请使用 --base <ref> 或 --all')
    }
  }
  // Diff the working tree against the base: includes staged, unstaged, and branch commits.
  const tracked = git(root, [
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    '-z',
    base,
    '--',
    CONTENT_DIRECTORY,
  ])
  const untracked = git(root, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
    '--',
    CONTENT_DIRECTORY,
  ])
  return { base, files: new Set(`${tracked}\0${untracked}`.split('\0').filter(Boolean)) }
}

export function validatePostIds(entries) {
  const problems = []
  const seen = new Map()
  for (const { id, filename } of entries) {
    try {
      const normalized = normalizePostId(id)
      if (seen.has(normalized))
        problems.push(`${filename}: 文章 ID 重复（${normalized}），与 ${seen.get(normalized)} 冲突`)
      else seen.set(normalized, filename)
    } catch (error) {
      problems.push(`${filename}: 文章 ID 无效：${error.message}`)
    }
  }
  return problems
}

export async function checkContent({ root = process.cwd(), all = false, base } = {}) {
  const files = await articleFiles(path.join(root, CONTENT_DIRECTORY))
  const changes = all
    ? { base: 'all', files: new Set(files.map((file) => path.relative(root, file))) }
    : changedArticles(root, base)
  const problems = []
  const ids = []
  for (const file of files) {
    const relative = path.relative(root, file)
    const source = await readFile(file, 'utf8')
    try {
      const { data } = parseArticle(source, file)
      const filenameId = path
        .relative(path.join(root, CONTENT_DIRECTORY), file)
        .replace(/\.mdx?$/, '')
        .split(path.sep)
        .join('/')
      ids.push({ id: data.slug ?? filenameId, filename: relative })
    } catch {
      /* The detailed parser error is reported below. */
    }
    for (const problem of validateArticle(source, file, {
      structure: changes.files.has(relative),
    }))
      problems.push(`${relative}: ${problem}`)
  }
  problems.push(...validatePostIds(ids))
  return {
    problems,
    articles: files.length,
    structureChecked: files.filter((file) => changes.files.has(path.relative(root, file))).length,
    base: changes.base,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2)
    const baseIndex = args.indexOf('--base')
    if (baseIndex !== -1 && !args[baseIndex + 1]) throw new Error('--base 需要 Git 引用')
    const result = await checkContent({
      all: args.includes('--all'),
      base: baseIndex === -1 ? undefined : args[baseIndex + 1],
    })
    if (result.problems.length) {
      console.error(result.problems.join('\n'))
      process.exitCode = 1
    } else
      console.log(
        `Content OK: ${result.articles} metadata records; ${result.structureChecked} new/changed article bodies (${result.base}).`,
      )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
