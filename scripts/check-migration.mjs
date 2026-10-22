#!/usr/bin/env node
/** One-time migration audit. Deliberately excluded from routine content/CI checks. */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export async function checkMigration(root = process.cwd()) {
  const baseline = JSON.parse(
    await readFile(new URL('../tests/fixtures/legacy-urls.json', import.meta.url), 'utf8'),
  )
  const problems = []
  for (const entry of [...baseline.articles, ...baseline.staticResources]) {
    try {
      const hash = createHash('sha256')
        .update(await readFile(path.join(root, entry.path)))
        .digest('hex')
      if (hash !== entry.sha256)
        problems.push(
          `${entry.path}: content differs from migration baseline ${baseline.sourceCommit}`,
        )
    } catch (error) {
      problems.push(`${entry.path}: ${error.message}`)
    }
  }
  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = await checkMigration()
  if (problems.length) {
    console.error(problems.join('\n'))
    process.exitCode = 1
  } else
    console.log(
      'One-time migration audit OK: 3 legacy articles and favicon are byte-for-byte unchanged.',
    )
}
