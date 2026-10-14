import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  assertPublishContext,
  commitBump,
  compareVersions,
  githubApi,
  nextVersion,
  parseVersion,
  planRelease,
  publishRelease,
  releaseNotes,
} from "../scripts/release.mjs";
import {
  BRANCH_PATTERN,
  parseConventionalTitle,
  validatePullRequest,
} from "../scripts/validate-pr.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha = "a".repeat(40);
const commit = { sha, message: "feat(blog): add Chinese article search", bump: "minor" };
const plan = {
  sha,
  previous: null,
  tag: "v1.0.0",
  bump: "minor",
  resume: false,
  commits: [commit],
};
const context = {
  GITHUB_ACTIONS: "true",
  GITHUB_EVENT_NAME: "push",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: sha,
  DEPLOYED_SHA: sha,
  DEPLOYMENT_RESULT: "success",
  GITHUB_REPOSITORY: "guog/guog.github.io",
  GITHUB_TOKEN: "test-token-not-a-credential",
};

function repository(t) {
  const cwd = mkdtempSync(path.join(tmpdir(), "blog-release-test-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "--initial-branch=main");
  git("config", "user.name", "Release Test");
  git("config", "user.email", "release-test@example.invalid");
  const addCommit = (message) =>
    git("-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", message);
  return { cwd, git, addCommit };
}

function fakeApi({
  tag = null,
  release = null,
  main = sha,
  previousRelease = null,
  failRelease = false,
} = {}) {
  const calls = [];
  let tagSha = tag;
  const api = async (method, route, body) => {
    calls.push({ method, route, body });
    if (route === "/git/ref/heads/main") return { object: { type: "commit", sha: main } };
    if (route.startsWith("/git/ref/tags/"))
      return tagSha ? { object: { type: "commit", sha: tagSha } } : null;
    if (method === "GET" && route === "/releases/tags/v1.0.0") return release;
    if (method === "GET" && route.startsWith("/releases/tags/")) return previousRelease;
    if (method === "POST" && route === "/git/refs") {
      assert.equal(tagSha, null, "must not create an existing tag");
      tagSha = body.sha;
      return { object: { type: "commit", sha: tagSha } };
    }
    if (method === "POST" && route === "/releases") {
      if (failRelease) throw new Error("Simulated API failure after create-only tag creation");
      return { html_url: "https://github.com/guog/guog.github.io/releases/tag/v1.0.0" };
    }
    throw new Error(`Unexpected API request: ${method} ${route}`);
  };
  return { api, calls };
}

test("only lowercase feat/fix kebab-case branches are accepted", () => {
  for (const branch of ["feat/astro-cactus-ai-ready", "fix/123-typo", "feat/1"])
    assert.ok(BRANCH_PATTERN.test(branch));
  for (const branch of [
    "main",
    "docs/readme",
    "chore/deps",
    "feat/",
    "fix/Foo",
    "feat/a_b",
    "feat/a--b",
    "feat/a/extra",
    "feat/中文",
    "fix/-x",
    "fix/x-",
  ]) {
    assert.equal(BRANCH_PATTERN.test(branch), false, branch);
  }
});

test("PR target, title and breaking footer are validated", () => {
  const pr = { head: "feat/search", base: "main", title: "feat(search): 增加中文搜索" };
  assert.deepEqual(validatePullRequest(pr), []);
  assert.equal(validatePullRequest({ ...pr, base: "release" }).length, 1);
  assert.equal(validatePullRequest({ ...pr, title: "feat!: change the content schema" }).length, 1);
  assert.equal(
    validatePullRequest({ ...pr, body: "BREAKING CHANGE: renamed the schema" }).length,
    1,
  );
  assert.deepEqual(
    validatePullRequest({
      ...pr,
      title: "feat!: change the content schema",
      body: "Migration required.\n\nBREAKING CHANGE: renamed the schema",
    }),
    [],
  );
});

test("Conventional titles reject empty, vague, multiline and invalid formats", () => {
  for (const title of [
    "fix(content): correct the Astro command",
    "ci(actions): verify before deploying",
    "docs: explain local checks",
    "feat(blog)!: change schema",
  ]) {
    assert.ok(parseConventionalTitle(title), title);
  }
  for (const title of [
    "Update README",
    "FEAT: add search",
    "feat: ",
    "feat:add search",
    "feat: update",
    "fix: fix stuff",
    "chore: misc",
    "feeat: add search",
    "feat(): add search",
    "feat: add search\nfix: bypass policy",
  ]) {
    assert.equal(parseConventionalTitle(title), null, title);
  }
});

test("release increments exactly follow repository Conventional Commit policy", () => {
  for (const [message, bump] of [
    ["feat(content): add a Chinese Astro guide", "minor"],
    ["fix(content): correct a broken command", "patch"],
    ["feat!: change schema", "major"],
    ["docs: explain schema migration\n\nBREAKING CHANGE: old metadata is unsupported", "major"],
    ["fix: migrate schema\n\nBREAKING-CHANGE: old metadata is unsupported", "major"],
    ["fix: explain a breaking change without a formal marker", "patch"],
    ["feat: add search\n\nBREAKING CHANGE:", "minor"],
    ["Initial commit", "none"],
  ])
    assert.equal(commitBump(message), bump, message);
  for (const type of ["docs", "ci", "chore", "refactor", "test", "build", "perf", "revert"]) {
    assert.equal(commitBump(`${type}: maintain the site`), "none", type);
  }
});

test("stable tags have strict SemVer and numeric ordering", () => {
  for (const tag of ["v0.0.0", "v1.2.3", "v999999999999999999999.0.0"])
    assert.ok(parseVersion(tag));
  for (const tag of [
    "1.2.3",
    "v01.2.3",
    "v1.02.3",
    "v1.2.03",
    "v1.2",
    "v1.2.3-beta",
    "v1.2.3+build",
    "v1.2.3\n",
  ])
    assert.equal(parseVersion(tag), null);
  assert.equal(compareVersions("v1.10.0", "v1.9.9"), 1);
  assert.equal(compareVersions("v2.0.0", "v10.0.0"), -1);
  assert.equal(compareVersions("v1.2.3", "v1.2.3"), 0);
  assert.throws(() => compareVersions("v01.0.0", "v1.0.0"));
});

test("first stable release is v1.0.0; maintenance alone produces no version", () => {
  assert.equal(nextVersion(null, "minor"), "v1.0.0");
  assert.equal(nextVersion(null, "patch"), "v1.0.0");
  assert.equal(nextVersion(null, "none"), null);
  assert.equal(nextVersion("v2.3.4", "patch"), "v2.3.5");
  assert.equal(nextVersion("v2.3.4", "minor"), "v2.4.0");
  assert.equal(nextVersion("v0.3.4", "major"), "v1.0.0");
  assert.equal(nextVersion("v2.3.4", "major"), "v3.0.0");
  assert.throws(() => nextVersion("v1.0.0", "unknown"));
  assert.throws(() => nextVersion("v1.0.0", "constructor"));
});

test("dry-run reads real squash messages without changing the repository", (t) => {
  const repo = repository(t);
  repo.addCommit("Initial commit");
  assert.equal(planRelease(repo.cwd).tag, null);
  repo.addCommit("feat(theme): migrate the blog to Cactus (#42)\n\nPreserve every published URL.");
  const before = repo.git("status", "--porcelain=v1");
  const result = planRelease(repo.cwd);
  assert.equal(result.tag, "v1.0.0");
  assert.equal(result.bump, "minor");
  assert.equal(result.commits.length, 2);
  assert.equal(
    result.commits.at(-1).message.split("\n")[0],
    "feat(theme): migrate the blog to Cactus (#42)",
  );
  assert.equal(repo.git("tag", "--list"), "");
  assert.equal(repo.git("status", "--porcelain=v1"), before);
  repo.git("tag", "v1.0.0");
  repo.addCommit("fix(content): correct a command (#43)");
  assert.equal(planRelease(repo.cwd).tag, "v1.0.1");
  repo.addCommit("feat(search): add Chinese matching (#44)");
  assert.equal(planRelease(repo.cwd).tag, "v1.1.0");
  repo.addCommit(
    "refactor!: replace the metadata contract (#45)\n\nBREAKING CHANGE: migrate the fields.",
  );
  assert.equal(planRelease(repo.cwd).tag, "v2.0.0");
});

test("maintenance can deploy without release, and exact-SHA release retries are idempotent", (t) => {
  const repo = repository(t);
  repo.addCommit("feat: create the blog");
  repo.git("tag", "v1.0.0");
  const existing = planRelease(repo.cwd);
  assert.equal(existing.tag, "v1.0.0");
  assert.equal(existing.resume, true);
  repo.addCommit("ci: increase test timeout");
  assert.equal(planRelease(repo.cwd).tag, null);
  repo.addCommit("fix: repair the search page");
  repo.git("tag", "v1.0.1");
  const resumed = planRelease(repo.cwd);
  assert.equal(resumed.tag, "v1.0.1");
  assert.equal(resumed.previous, "v1.0.0");
  assert.equal(resumed.commits.length, 2);
});

test("unreachable newer tags and shallow checkouts fail closed", (t) => {
  const repo = repository(t);
  repo.addCommit("feat: create the blog");
  repo.git("checkout", "--orphan", "unrelated");
  repo.addCommit("feat: another history");
  repo.git("tag", "v9.0.0");
  repo.git("checkout", "main");
  assert.throws(() => planRelease(repo.cwd), /out-of-order/);
  writeFileSync(path.join(repo.cwd, ".git", "shallow"), `${repo.git("rev-parse", "HEAD")}\n`);
  assert.throws(() => planRelease(repo.cwd), /full history/);
});

test("publishing requires a successful deployment of the exact main push SHA", () => {
  assert.doesNotThrow(() => assertPublishContext(plan, context));
  for (const changed of [
    { GITHUB_ACTIONS: "false" },
    { GITHUB_EVENT_NAME: "pull_request" },
    { GITHUB_REF: "refs/heads/feat/site" },
    { DEPLOYMENT_RESULT: "failure" },
    { DEPLOYED_SHA: "b".repeat(40) },
    { GITHUB_SHA: "b".repeat(40) },
    { GITHUB_REPOSITORY: "../unexpected" },
    { GITHUB_TOKEN: "" },
  ])
    assert.throws(() => assertPublishContext(plan, { ...context, ...changed }));
});

test("publishing creates only an exact-SHA tag and a GitHub Release", async () => {
  const { api, calls } = fakeApi();
  const result = await publishRelease(plan, context, api);
  assert.equal(result.status, "released");
  const writes = calls.filter((call) => call.method !== "GET");
  assert.deepEqual(
    writes.map(({ method, route }) => ({ method, route })),
    [
      { method: "POST", route: "/git/refs" },
      { method: "POST", route: "/releases" },
    ],
  );
  assert.deepEqual(writes[0].body, { ref: "refs/tags/v1.0.0", sha });
  assert.equal(writes[1].body.target_commitish, sha);
  assert.equal(writes[1].body.draft, false);
  assert.equal(writes[1].body.prerelease, false);
  assert.match(writes[1].body.body, /成功部署/);
});

test("existing tags are never moved; completed releases are never rewritten", async () => {
  const conflict = fakeApi({ tag: "b".repeat(40) });
  await assert.rejects(publishRelease(plan, context, conflict.api), /another commit/);
  assert.ok(conflict.calls.every((call) => call.method === "GET"));
  const existing = fakeApi({
    tag: sha,
    release: {
      html_url: "https://github.com/guog/guog.github.io/releases/tag/v1.0.0",
      draft: false,
      prerelease: false,
    },
  });
  assert.equal((await publishRelease(plan, context, existing.api)).status, "already-released");
  assert.ok(existing.calls.every((call) => call.method === "GET"));
});

test("a partial release can be recovered without rewriting its tag", async () => {
  const recovery = fakeApi({ tag: sha });
  assert.equal((await publishRelease(plan, context, recovery.api)).status, "released");
  assert.deepEqual(
    recovery.calls.filter((call) => call.method !== "GET").map((call) => call.route),
    ["/releases"],
  );
  const failed = fakeApi({ failRelease: true });
  await assert.rejects(publishRelease(plan, context, failed.api), /Simulated API failure/);
  assert.equal(
    failed.calls.filter((call) => call.route === "/releases" && call.method === "POST").length,
    1,
  );
  assert.ok(failed.calls.every((call) => ["GET", "POST"].includes(call.method)));
});

test("a draft, missing previous release or superseded deployment fails safely", async () => {
  const draft = fakeApi({ tag: sha, release: { draft: true } });
  await assert.rejects(publishRelease(plan, context, draft.api), /manual inspection/);
  const previous = fakeApi();
  await assert.rejects(
    publishRelease({ ...plan, previous: "v0.9.0" }, context, previous.api),
    /no published stable Release/,
  );
  assert.ok(previous.calls.every((call) => call.method === "GET"));
  const stale = fakeApi({ main: "b".repeat(40) });
  assert.equal((await publishRelease(plan, context, stale.api)).status, "superseded");
  assert.ok(stale.calls.every((call) => call.method === "GET"));
  const none = fakeApi();
  assert.equal(
    (await publishRelease({ ...plan, tag: null }, context, none.api)).status,
    "no-release",
  );
  assert.equal(none.calls.length, 0);
});

test("GitHub API client pins the official host, rejects redirects, and never retries writes", async () => {
  const calls = [];
  const api = githubApi(context, async (url, options) => {
    calls.push({ url, options });
    return { ok: false, status: 422 };
  });
  await assert.rejects(
    api("POST", "/git/refs", { ref: "refs/tags/v1.0.0", sha }),
    /inspect the run/,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.github.com/repos/guog/guog.github.io/git/refs");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.headers["X-GitHub-Api-Version"], "2026-03-10");
});

test("release notes quote commit titles as data", () => {
  const notes = releaseNotes(
    {
      ...plan,
      commits: [{ ...commit, message: "feat: add [unsafe](https://example.com) <script>" }],
    },
    context.GITHUB_REPOSITORY,
  );
  assert.ok(notes.includes("\\[unsafe\\]"));
  assert.ok(notes.includes("\\<script\\>"));
  assert.match(notes, new RegExp(sha));
});

test("one workflow enforces the same PR and main checks before deploy and release", () => {
  assert.deepEqual(
    readdirSync(path.join(root, ".github/workflows")).filter((name) => /\.ya?ml$/u.test(name)),
    ["site.yml"],
  );
  const workflow = parse(readFileSync(path.join(root, ".github/workflows/site.yml"), "utf8"));
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.deepEqual(workflow.on.pull_request.branches, ["main"]);
  assert.deepEqual(workflow.on.push.branches, ["main"]);
  assert.ok(workflow.on.pull_request.types.includes("edited"));
  assert.equal(workflow.on.pull_request["paths-ignore"], undefined);
  assert.equal(workflow.on.push["paths-ignore"], undefined);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  const jobs = workflow.jobs;
  assert.equal(jobs["validate-pr"].name, "Validate PR");
  assert.equal(jobs.verify.name, "Verify site");
  assert.equal(jobs.verify.needs, "validate-pr");
  assert.match(
    jobs.verify.env.CONTENT_BASE_REF,
    /github.event.pull_request.base.sha \|\| github.event.before/u,
  );
  const commands = jobs.verify.steps.map((step) => step.run).filter(Boolean);
  for (const command of [
    "npm ci",
    "npm run check",
    "npm run lint:content",
    "npm run test",
    "npm run build",
    "npm run test:built",
    "npm run test:e2e",
    "npm run release:dry-run",
  ])
    assert.ok(commands.includes(command), command);
  assert.ok(commands.indexOf("npm run build") < commands.indexOf("npm run test:built"));
  assert.ok(commands.indexOf("npm run test:built") < commands.indexOf("npm run test:e2e"));
  assert.equal(jobs.deploy.needs, "verify");
  assert.deepEqual(jobs.release.needs, ["verify", "deploy"]);
  assert.match(jobs.deploy.if, /github.event_name == 'push'.*github.ref == 'refs\/heads\/main'/u);
  assert.match(jobs.release.if, /needs.deploy.outputs.deployed == 'true'/u);
  assert.equal(jobs.deploy.environment.name, "github-pages");
  assert.deepEqual(jobs.deploy.permissions, {
    contents: "read",
    pages: "write",
    "id-token": "write",
  });
  assert.deepEqual(jobs.release.permissions, { contents: "write" });
  assert.match(workflow.concurrency.group, /production/u);
  assert.equal(
    workflow.concurrency["cancel-in-progress"],
    `\${{ github.event_name == 'pull_request' }}`,
  );
  assert.match(jobs.deploy.steps[0].run, /object.sha === process.env.GITHUB_SHA/u);
});

test("all actions are pinned official actions; write-token jobs never run build dependencies", () => {
  const { jobs } = parse(readFileSync(path.join(root, ".github/workflows/site.yml"), "utf8"));
  for (const job of Object.values(jobs)) {
    for (const step of job.steps) {
      if (step.uses) assert.match(step.uses, /^actions\/[a-z-]+@[0-9a-f]{40}$/u);
      if (step.uses?.startsWith("actions/checkout@"))
        assert.equal(step.with["persist-credentials"], false);
      if (step.run) assert.doesNotMatch(step.run, /\$\{\{.*(?:title|body|head\.ref)/u);
    }
  }
  for (const job of [jobs.deploy, jobs.release]) {
    for (const step of job.steps) {
      if (step.run) assert.doesNotMatch(step.run, /\bnpm\b|\bnpx\b/u);
    }
  }
  const checkout = jobs.release.steps.find((step) => step.uses?.startsWith("actions/checkout@"));
  assert.equal(checkout.with["fetch-depth"], 0);
  assert.equal(checkout.with.ref, `\${{ github.sha }}`);
  assert.ok(jobs.release.steps.some((step) => step.run === "node scripts/release.mjs --publish"));
  const upload = jobs.verify.steps.find((step) =>
    step.uses?.startsWith("actions/upload-pages-artifact@"),
  );
  assert.match(upload.if, /github.event_name == 'push'.*github.ref == 'refs\/heads\/main'/u);
  assert.equal(upload.with.path, "./dist");
  const evidence = jobs.verify.steps.find((step) =>
    step.uses?.startsWith("actions/upload-artifact@"),
  );
  assert.equal(evidence.if, "always()");
  assert.match(evidence.with.path, /test-results\//u);
  assert.match(evidence.with.path, /playwright-report\//u);
});
