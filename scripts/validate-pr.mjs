import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const BRANCH_PATTERN = /^(feat|fix)\/[a-z0-9]+(?:-[a-z0-9]+)*$/
export const COMMIT_TYPES = new Set([
  'feat',
  'fix',
  'docs',
  'refactor',
  'test',
  'ci',
  'build',
  'chore',
  'perf',
  'revert',
])

/** Repository convention: a one-line lowercase type/scope and a useful description. */
export function parseConventionalTitle(title) {
  if (typeof title !== 'string') return null
  // Reject line breaks and control characters before parsing a user-controlled title.
  if (
    [...title].some(
      (character) => character.codePointAt(0) < 32 || character.codePointAt(0) === 127,
    )
  )
    return null
  const match =
    /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9]+(?:[./-][a-z0-9]+)*)\))?(?<breaking>!)?: (?<description>\S(?:.*\S)?)$/u.exec(
      title,
    )
  if (!match || !COMMIT_TYPES.has(match.groups.type)) return null
  if (/^(update|misc|fix stuff)[.!。]?$/iu.test(match.groups.description)) return null
  return { ...match.groups, breaking: Boolean(match.groups.breaking) }
}

export function hasBreakingFooter(body = '') {
  return /(?:^|\n)BREAKING(?: CHANGE|-CHANGE):[ \t]+\S/u.test(body)
}

export function validatePullRequest({ head, base, title, body = '' }) {
  const errors = []
  if (base !== 'main') errors.push('The target branch must be main.')
  if (!BRANCH_PATTERN.test(head ?? '')) {
    errors.push(
      'Use feat/<lowercase-kebab-case> or fix/<lowercase-kebab-case> as the source branch.',
    )
  }
  const parsed = parseConventionalTitle(title)
  if (!parsed) {
    errors.push(
      'Use a Conventional Commit PR title, for example feat(content): add an Astro guide.',
    )
  } else {
    // Preserve the signal even if a maintainer chooses a title-only squash message.
    if (hasBreakingFooter(body) && !parsed.breaking) {
      errors.push('A BREAKING CHANGE footer also requires ! in the PR title.')
    }
    if (parsed.breaking && !hasBreakingFooter(body)) {
      errors.push('Explain the breaking change in the PR body with BREAKING CHANGE: <details>.')
    }
  }
  return errors
}

export function main(env = process.env) {
  const event = env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
    : null
  const pr = event?.pull_request
  if (event && !pr) throw new Error('The event must contain a pull_request.')
  const errors = validatePullRequest(
    pr
      ? {
          head: pr.head?.ref,
          base: pr.base?.ref,
          title: pr.title,
          body: pr.body ?? '',
        }
      : {
          head: env.PR_HEAD_REF,
          base: env.PR_BASE_REF,
          title: env.PR_TITLE,
          body: env.PR_BODY ?? '',
        },
  )
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('PR branch, target, title, and breaking-change signal are valid.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
