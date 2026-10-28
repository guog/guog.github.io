import { articleFiles, parseArticle } from '../../scripts/check-content.mjs'
import { readingPrompt } from '../../src/utils/reading.ts'
import { createHash } from 'node:crypto'
import { filesWithin } from '../../src/integrations/markdown.mjs'
/** Build fixtures in isolation; never write test posts or test output into the real site. */
import { spawn, spawnSync } from 'node:child_process'
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkBuilt } from '../../scripts/check-built.mjs'
import { checkFixtureArtifacts } from './check-fixtures.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const temporary = await mkdtemp(path.join(os.tmpdir(), 'blog-e2e-production-'))
let preview
let cleaning = false
async function cleanup(code = 0) {
  if (cleaning) return
  cleaning = true
  if (preview?.pid) {
    preview.kill('SIGTERM')
    await new Promise((resolve) => {
      preview.once('exit', resolve)
      setTimeout(resolve, 2000)
    })
  }
  await rm(temporary, { recursive: true, force: true })
  process.exit(code)
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    void cleanup()
  })
try {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (
      (entry.isDirectory() && ['src', 'public'].includes(entry.name)) ||
      (entry.isFile() &&
        /^(?:package(?:-lock)?\.json|astro\.config\.[cm]?[jt]s|ec\.config\.[cm]?[jt]s|tsconfig\.json)$/.test(
          entry.name,
        ))
    ) {
      await cp(path.join(root, entry.name), path.join(temporary, entry.name), { recursive: true })
    }
  }
  await symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir')
  await cp(
    path.join(root, 'tests/fixtures/content'),
    path.join(temporary, 'src/content/blog/__regression__'),
    { recursive: true },
  )
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }
  // Exercise a real add/delete cycle through Astro, including a future pagination route.
  const lifecyclePage = path.join(temporary, 'src/pages/blog/page/2.astro')
  await mkdir(path.dirname(lifecyclePage), { recursive: true })
  await writeFile(
    lifecyclePage,
    `---\nimport Base from '../../../layouts/Base.astro'\n---\n<Base title="Temporary pagination"><h1>Page 2</h1><a href="/blog/">Archive</a></Base>`,
  )
  const firstBuild = spawnSync('npm', ['run', 'build'], { cwd: temporary, env, stdio: 'inherit' })
  if (firstBuild.status !== 0) throw new Error(`Lifecycle add build failed (${firstBuild.status})`)
  await access(path.join(temporary, 'dist/blog/page/2/index.md'))
  await rm(lifecyclePage)
  const build = spawnSync('npm', ['run', 'build'], { cwd: temporary, env, stdio: 'inherit' })
  if (build.status !== 0) throw new Error(`Fixture production build failed (${build.status})`)
  for (const resource of ['dist/blog/page/2/index.html', 'dist/blog/page/2/index.md']) {
    try {
      await access(path.join(temporary, resource))
      throw new Error(`Deleted page left stale output: ${resource}`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  console.log(
    'Lifecycle verified: added pagination received Markdown; deletion removed HTML and Markdown on rebuild.',
  )
  const checked = await checkBuilt({ root: temporary })
  if (checked.errors.length)
    throw new Error(`Fixture artifact regression failed:\n${checked.errors.join('\n')}`)
  await checkFixtureArtifacts(path.join(temporary, 'dist'))
  console.log(
    `Fixture build verified: ${checked.pages} pages; all local links, feeds and draft exclusions checked.`,
  )
  const snapshotOutput = path.join(root, 'test-results/agent-reading-inputs')
  let snapshotDist = path.join(root, 'dist')
  try {
    await access(snapshotDist)
  } catch {
    snapshotDist = path.join(temporary, 'dist')
  }
  const snapshotFiles = {}
  for (const filename of await filesWithin(snapshotDist)) {
    if (!filename.endsWith('.md') && path.basename(filename) !== 'llms.txt') continue
    const relative = path.relative(snapshotDist, filename)
    const target = path.join(snapshotOutput, relative)
    await mkdir(path.dirname(target), { recursive: true })
    await cp(filename, target)
    snapshotFiles[relative] = createHash('sha256')
      .update(await readFile(filename))
      .digest('hex')
  }
  for (const filename of await articleFiles(path.join(root, 'src/content/blog'))) {
    const { data } = parseArticle(await readFile(filename, 'utf8'), filename)
    if (data.draft) continue
    const id =
      data.slug ??
      path
        .relative(path.join(root, 'src/content/blog'), filename)
        .replace(/\.mdx?$/, '')
        .split(path.sep)
        .join('/')
    const record = {
      ...data,
      contentKind: data.contentKind ?? 'original',
      pubDate: new Date(data.pubDate),
      ...(data.updatedDate ? { updatedDate: new Date(data.updatedDate) } : {}),
      ...(data.source
        ? { source: { ...data.source, publishedDate: new Date(data.source.publishedDate) } }
        : {}),
    }
    const relative = `prompts/${id}.txt`
    const target = path.join(snapshotOutput, relative)
    await mkdir(path.dirname(target), { recursive: true })
    const prompt = readingPrompt(id, record)
    await writeFile(target, prompt)
    snapshotFiles[relative] = createHash('sha256').update(prompt).digest('hex')
  }
  const partial =
    (await readFile(path.join(snapshotDist, 'blog/the-ai-native-sdlc-playbook/index.md'), 'utf8'))
      .split('\n')
      .slice(0, 5)
      .join('\n') + '\n\n[材料在此截断；正文未提供]\n'
  await writeFile(path.join(snapshotOutput, 'partial-sdlc.md'), partial)
  snapshotFiles['partial-sdlc.md'] = createHash('sha256').update(partial).digest('hex')
  await writeFile(
    path.join(snapshotOutput, 'manifest.json'),
    JSON.stringify(
      {
        source:
          snapshotDist === path.join(root, 'dist') ? 'production-build' : 'isolated-fixture-build',
        workflowSHA: process.env.GITHUB_SHA ?? null,
        files: snapshotFiles,
      },
      null,
      2,
    ),
  )
  if (process.argv.includes('--build-only')) await cleanup(0)
  preview = spawn(
    path.join(root, 'node_modules/.bin/astro'),
    [
      'preview',
      '--ignore-lock',
      '--host',
      '127.0.0.1',
      '--port',
      process.env.PLAYWRIGHT_PORT ?? '4322',
    ],
    { cwd: temporary, env, stdio: 'inherit' },
  )
  preview.once('exit', (code) => {
    if (!cleaning) void cleanup(code ?? 1)
  })
} catch (error) {
  console.error(error)
  await cleanup(1)
}
