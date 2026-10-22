import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { hasBreakingFooter, parseConventionalTitle } from './validate-pr.mjs'

const STABLE_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u
const LEVEL = { none: 0, patch: 1, minor: 2, major: 3 }

export function parseVersion(tag) {
  if (typeof tag !== 'string' || tag.trim() !== tag) return null
  const match = STABLE_TAG.exec(tag)
  return match ? match.slice(1).map(BigInt) : null
}

export function compareVersions(a, b) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) throw new Error('Only stable vMAJOR.MINOR.PATCH tags are release versions.')
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1
  }
  return 0
}

export function commitBump(message) {
  const [title, ...body] = message.replaceAll('\r\n', '\n').split('\n')
  const parsed = parseConventionalTitle(title)
  if (!parsed) return 'none'
  if (parsed.breaking || hasBreakingFooter(body.join('\n'))) return 'major'
  if (parsed.type === 'feat') return 'minor'
  if (parsed.type === 'fix') return 'patch'
  return 'none'
}

export function nextVersion(previous, bump) {
  if (!Object.hasOwn(LEVEL, bump)) throw new Error(`Unknown version increment: ${bump}`)
  if (bump === 'none') return null
  if (!previous) return 'v1.0.0'
  const version = parseVersion(previous)
  if (!version) throw new Error(`Invalid stable version: ${previous}`)
  const [major, minor, patch] = version
  if (bump === 'major') return `v${major + 1n}.0.0`
  if (bump === 'minor') return `v${major}.${minor + 1n}.0`
  return `v${major}.${minor}.${patch + 1n}`
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }).trimEnd()
}

function isAncestor(ref, head, cwd) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', ref, head], { cwd })
  if (result.status !== 0 && result.status !== 1)
    throw new Error(`Cannot inspect ancestry of ${ref}.`)
  return result.status === 0
}

/** Purely local, read-only analysis. fetch-depth: 0 is required in Actions. */
export function planRelease(cwd = process.cwd()) {
  if (git(['rev-parse', '--is-shallow-repository'], cwd) === 'true') {
    throw new Error('Release analysis requires full history and tags (fetch-depth: 0).')
  }
  const sha = git(['rev-parse', 'HEAD'], cwd)
  const tags = git(['tag', '--list'], cwd)
    .split('\n')
    .filter((tag) => parseVersion(tag))
  const reachable = tags.filter((tag) => isAncestor(tag, sha, cwd)).sort(compareVersions)
  const latest = reachable.at(-1) ?? null
  // A completed or partly completed release can be re-run at the exact same SHA.
  const resume = Boolean(latest && git(['rev-parse', `${latest}^{commit}`], cwd) === sha)
  const previous = resume ? (reachable.at(-2) ?? null) : latest
  const range = previous ? `${previous}..${sha}` : sha
  const output = git(['log', '--reverse', '--format=%H%x00%B%x00', range, '--'], cwd)
  const parts = output.split('\0')
  const commits = []
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const commit = { sha: parts[i].trim(), message: parts[i + 1].trimEnd() }
    if (commit.sha) commits.push({ ...commit, bump: commitBump(commit.message) })
  }
  const bump = commits.reduce(
    (highest, commit) => (LEVEL[commit.bump] > LEVEL[highest] ? commit.bump : highest),
    'none',
  )
  const tag = resume ? latest : nextVersion(previous, bump)
  if (tag && !resume && tags.includes(tag))
    throw new Error(`Refusing to overwrite existing tag ${tag}.`)
  if (tag && tags.some((existing) => compareVersions(existing, tag) > 0)) {
    throw new Error(
      'A newer version tag exists outside this history. Refusing an out-of-order release.',
    )
  }
  return {
    sha,
    previous,
    tag,
    bump,
    resume,
    commits,
    ignoredTags: git(['tag', '--list'], cwd)
      .split('\n')
      .filter((tag) => tag && !parseVersion(tag)),
  }
}

function markdownText(text) {
  return text.replace(/[\\`*_{}[\]<>#]/gu, '\\$&').replace(/\r?\n/gu, ' ')
}

export function releaseNotes(plan, repository) {
  const lines = [
    `本版本对应已通过验证并成功部署到 GitHub Pages 的提交 ${plan.sha}。`,
    '',
    '## 变更',
    '',
    ...plan.commits.map(
      (commit) =>
        `- ${markdownText(commit.message.split('\n')[0])} ([${commit.sha.slice(0, 7)}](https://github.com/${repository}/commit/${commit.sha}))`,
    ),
  ]
  if (plan.previous)
    lines.push(
      '',
      `[完整差异](https://github.com/${repository}/compare/${plan.previous}...${plan.tag})`,
    )
  lines.push('', '站点版本以 Git 标签及此 Release 为准；不发布 npm 包，也不向 main 写入版本文件。')
  return lines.join('\n')
}

export function assertPublishContext(plan, env) {
  if (
    env.GITHUB_ACTIONS !== 'true' ||
    env.GITHUB_EVENT_NAME !== 'push' ||
    env.GITHUB_REF !== 'refs/heads/main'
  ) {
    throw new Error('Publishing is restricted to the main push workflow.')
  }
  if (
    env.DEPLOYMENT_RESULT !== 'success' ||
    env.DEPLOYED_SHA !== plan.sha ||
    env.GITHUB_SHA !== plan.sha
  ) {
    throw new Error(
      'The exact release commit must have passed verification and Pages deployment in this workflow.',
    )
  }
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(env.GITHUB_REPOSITORY ?? '')
  ) {
    throw new Error('A valid GITHUB_REPOSITORY is required.')
  }
  if (!env.GITHUB_TOKEN)
    throw new Error('The release job requires its own contents: write GITHUB_TOKEN.')
}

/** Requests only the official GitHub API; credentials are never given to build scripts. */
export function githubApi(env, fetchImpl = fetch) {
  return async (method, path, body, allowMissing = false) => {
    const response = await fetchImpl(
      `https://api.github.com/repos/${env.GITHUB_REPOSITORY}${path}`,
      {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2026-03-10',
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      },
    )
    if (allowMissing && response.status === 404) return null
    if (!response.ok) {
      // No blind POST retry: a timed-out creation may already have succeeded.
      throw new Error(
        `GitHub ${method} ${path} returned ${response.status}; inspect the run and existing tag/Release before retrying.`,
      )
    }
    return response.json()
  }
}

async function tagCommit(api, tag) {
  const ref = await api('GET', `/git/ref/tags/${encodeURIComponent(tag)}`, undefined, true)
  if (!ref) return null
  let object = ref.object
  for (let depth = 0; object.type === 'tag' && depth < 10; depth++) {
    object = (await api('GET', `/git/tags/${object.sha}`)).object
  }
  if (object.type !== 'commit') throw new Error(`Tag ${tag} does not resolve to a commit.`)
  return object.sha
}

export async function publishRelease(plan, env = process.env, api = githubApi(env)) {
  assertPublishContext(plan, env)
  if (!plan.tag)
    return {
      status: 'no-release',
      reason: 'No feat, fix, or breaking change since the last version.',
    }
  const main = await api('GET', '/git/ref/heads/main')
  if (main.object.sha !== plan.sha) {
    return {
      status: 'superseded',
      reason: 'main advanced; the next verified deployment will include these commits.',
    }
  }
  // Tag creation is create-only. Never PATCH/DELETE a ref or write to main.
  let existingSha = await tagCommit(api, plan.tag)
  if (existingSha && existingSha !== plan.sha)
    throw new Error(`Existing tag ${plan.tag} points to another commit. Nothing was changed.`)
  const existingRelease = await api('GET', `/releases/tags/${plan.tag}`, undefined, true)
  if (existingRelease) {
    if (!existingSha || existingRelease.draft || existingRelease.prerelease) {
      throw new Error(`Existing Release ${plan.tag} needs manual inspection. Nothing was changed.`)
    }
    return { status: 'already-released', tag: plan.tag, url: existingRelease.html_url }
  }
  if (plan.previous) {
    const previousRelease = await api('GET', `/releases/tags/${plan.previous}`, undefined, true)
    if (!previousRelease || previousRelease.draft || previousRelease.prerelease) {
      throw new Error(
        `Previous tag ${plan.previous} has no published stable Release. Recover or explicitly audit that release before advancing; do not move the tag.`,
      )
    }
  }
  if (!existingSha) {
    await api('POST', '/git/refs', { ref: `refs/tags/${plan.tag}`, sha: plan.sha })
    existingSha = await tagCommit(api, plan.tag)
    if (existingSha !== plan.sha)
      throw new Error('Created tag could not be verified; release creation stopped.')
  }
  const release = await api('POST', '/releases', {
    tag_name: plan.tag,
    target_commitish: plan.sha,
    name: plan.tag,
    body: releaseNotes(plan, env.GITHUB_REPOSITORY),
    draft: false,
    prerelease: false,
    make_latest: 'true',
  })
  return { status: 'released', tag: plan.tag, sha: plan.sha, url: release.html_url }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  if (args.length > 1 || (args.length === 1 && !['--dry-run', '--publish'].includes(args[0]))) {
    throw new Error('Usage: node scripts/release.mjs [--dry-run | --publish]')
  }
  const plan = planRelease()
  const summary = {
    mode: args[0] === '--publish' ? 'publish' : 'dry-run',
    ...plan,
    commits: plan.commits.map(({ sha, message, bump }) => ({
      sha,
      title: message.split('\n')[0],
      bump,
    })),
  }
  if (args[0] === '--publish') summary.result = await publishRelease(plan, env)
  else
    summary.notice =
      'Read-only local analysis. No network, tags, releases, npm publishing, or repository settings changed. Token permissions are not tested.'
  console.log(JSON.stringify(summary, null, 2))
  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `\n### Release ${summary.mode}\n\n- Commit: ${plan.sha}\n- Version: ${plan.tag ?? 'none'}\n- Increment: ${plan.bump}\n- Result: ${summary.result?.status ?? 'read-only analysis'}\n`,
    )
  }
  return summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
