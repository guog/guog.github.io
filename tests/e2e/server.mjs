/** Build fixtures in isolation; never write test posts or test output into the real site. */
import { spawn, spawnSync } from 'node:child_process'
import { access, cp, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
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
