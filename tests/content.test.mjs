import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  changedArticles,
  checkContent,
  parseArticle,
  validateArticle,
  validateMetadata,
  validatePostIds,
  validDate,
} from "../scripts/check-content.mjs";

const metadata = { title: "中文技术文章", description: "测试文章简介", pubDate: "2026-10-14" };
const article = (body, extra = "") =>
  `---\ntitle: 中文技术文章\ndescription: 测试文章简介\npubDate: '2026-10-14'\n${extra}---\n\n${body}\n`;

test("metadata accepts legacy fields and the optional schema", () => {
  assert.deepEqual(validateMetadata(metadata), []);
  assert.deepEqual(
    validateMetadata({
      ...metadata,
      updatedDate: "2026-10-15",
      tags: ["Git", "中文"],
      category: "技术",
      draft: true,
      slug: "nested/MixedCase",
      coverImage: { src: "./cover.png", alt: "代码运行结果" },
      ogImage: "/favicon.svg",
    }),
    [],
  );
});

test("all required metadata, unknown keys, and optional field types are validated", () => {
  for (const data of [
    {},
    { ...metadata, title: " " },
    { ...metadata, description: 123 },
    { ...metadata, pubDate: "yesterday" },
    { ...metadata, publishDate: "2026-10-14" },
    { ...metadata, tags: "Git" },
    { ...metadata, tags: [""] },
    { ...metadata, category: "" },
    { ...metadata, draft: "false" },
    { ...metadata, coverImage: "/photo.png" },
    { ...metadata, coverImage: { src: "photo.png", alt: "" } },
    { ...metadata, ogImage: 42 },
    { ...metadata, slug: "../secret" },
    { ...metadata, slug: "/new/" },
  ])
    assert.ok(validateMetadata(data).length, JSON.stringify(data));
});

test("dates reject impossible days and time-dependent locale parsing", () => {
  for (const date of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "10/14/2026",
    "2026-1-1",
    "",
    null,
    0,
  ])
    assert.equal(validDate(date), false, String(date));
  for (const date of ["2024-02-29", "2026-10-14"]) assert.equal(validDate(date), true);
  assert.ok(
    validateMetadata({ ...metadata, updatedDate: "2026-10-13" }).some((problem) =>
      problem.includes("不能早于"),
    ),
  );
});

test("YAML parser handles quoted colons, arrays, and multiline descriptions", () => {
  const source = `---\ntitle: 'Git: 中文'\ndescription: >-\n  多行介绍\n  保持完整\npubDate: '2026-10-14'\ntags:\n  - Git\n  - 中文\n---\n\n## 正文\n`;
  assert.deepEqual(validateArticle(source, "post.md"), []);
  assert.equal(parseArticle(source).data.description, "多行介绍 保持完整");
});

test("malformed or duplicate YAML is rejected instead of silently overwritten", () => {
  assert.ok(validateArticle("No frontmatter\n", "post.md").length);
  assert.ok(validateArticle(article("## 正文", "title: duplicate\n"), "post.md").length);
  assert.ok(validateArticle("---\ntitle: [broken\n---\n", "post.md").length);
});

test("heading rules use the Markdown tree, including Setext headings", () => {
  assert.ok(
    validateArticle(article("# 重复标题"), "post.md").some((problem) => problem.includes("H1")),
  );
  assert.ok(
    validateArticle(article("重复标题\n==="), "post.md").some((problem) => problem.includes("H1")),
  );
  assert.ok(
    validateArticle(article("## 开头\n\n#### 跳级"), "post.md").some((problem) =>
      problem.includes("跳到"),
    ),
  );
  assert.ok(
    validateArticle(article("### 缺少 H2"), "post.md").some((problem) => problem.includes("跳到")),
  );
  assert.deepEqual(
    validateArticle(article("## 开头\n\n### 细节\n\n#### 深入\n\n## 结论"), "post.md"),
    [],
  );
});

test("fences, blockquotes, image references and HTML are parsed structurally", () => {
  assert.ok(
    validateArticle(article("## 标题\n\n```\ncode\n```"), "post.md").some((problem) =>
      problem.includes("语言"),
    ),
  );
  assert.ok(
    validateArticle(article("## 标题\n\n> ![](x.png)"), "post.md").some((problem) =>
      problem.includes("alt"),
    ),
  );
  assert.ok(
    validateArticle(article("## 标题\n\n![][pic]\n\n[pic]: x.png"), "post.md").some((problem) =>
      problem.includes("alt"),
    ),
  );
  assert.ok(
    validateArticle(article('## 标题\n\n<img src="x.png">'), "post.md").some((problem) =>
      problem.includes("alt"),
    ),
  );
  assert.deepEqual(
    validateArticle(
      article(
        "## 标题\n\n```markdown\n# Example heading, not a real H1\n![](not-a-real-image.png)\n```\n\n![运行结果](x.png)",
      ),
      "post.md",
    ),
    [],
  );
});

test("MDX stays parseable and validates JSX image alt without editing code", () => {
  const source = article(
    'import { Code } from "astro-expressive-code/components";\n\n## 示例\n\n<Code code={"const value = 42;"} lang="js" />\n\n<img src="/x.png" alt="运行结果" />',
  );
  assert.deepEqual(validateArticle(source, "post.mdx"), []);
  assert.ok(
    validateArticle(article('## 示例\n\n<img src="/x.png" />'), "post.mdx").some((problem) =>
      problem.includes("alt"),
    ),
  );
  assert.ok(
    validateArticle(article("## 示例\n\n<Broken>"), "post.mdx").some((problem) =>
      problem.includes("解析"),
    ),
  );
});

test("legacy prose is not frozen or bulk-linted by metadata-only mode", () => {
  const source = article("# Historical heading\n\n```\nhistorical fence\n```");
  assert.deepEqual(validateArticle(source, "old.md", { structure: false }), []);
  assert.ok(validateArticle(source, "old.md", { structure: true }).length >= 2);
  assert.ok(
    validateArticle(source.replace("pubDate:", "publishDate:"), "old.md", { structure: false })
      .length,
  );
});

test("all real articles retain valid metadata without enforcing migration hashes", async () => {
  const result = await checkContent();
  assert.deepEqual(result.problems, []);
});

test("changed-file selection includes branch edits and untracked articles, excludes untouched history", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blog-content-test-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  try {
    await mkdir(path.join(root, "src/content/blog"), { recursive: true });
    await writeFile(path.join(root, "src/content/blog/old.md"), article("# Legacy H1"));
    git("init", "-b", "main");
    git("add", ".");
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "feat: fixture baseline",
    );
    git("checkout", "-b", "feat/check-content");
    await writeFile(path.join(root, "src/content/blog/new.md"), article("## New heading"));
    const ownBase = git("rev-parse", "main").toString().trim();
    const result = changedArticles(root, ownBase);
    assert.equal(result.files.has("src/content/blog/new.md"), true);
    assert.equal(result.files.has("src/content/blog/old.md"), false);
    assert.deepEqual((await checkContent({ root, base: ownBase })).problems, []);
    await writeFile(path.join(root, "src/content/blog/old.md"), article("# Edited H1"));
    assert.ok(
      (await checkContent({ root, base: ownBase })).problems.some((problem) =>
        problem.includes("H1"),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("migration fixture is evidence, not a routine article hash lock", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("./fixtures/legacy-urls.json", import.meta.url), "utf8"),
  );
  assert.equal(fixture.articles.length, 3);
  assert.equal(fixture.sourceCommit, "6a5d72102b114787f9135c9e6aad50ab08176f30");
  for (const post of fixture.articles) {
    assert.match(post.sha256, /^[a-f\d]{64}$/);
    assert.match(post.bodySha256, /^[a-f\d]{64}$/);
    assert.ok(post.frontmatter.title);
    assert.ok(post.url.startsWith("/blog/"));
  }
});

test("normalized article IDs detect MD/MDX, explicit slug and Unicode collisions", () => {
  for (const entries of [
    [
      { id: "same", filename: "same.md" },
      { id: "same", filename: "same.mdx" },
    ],
    [
      { id: "chosen", filename: "first.md" },
      { id: "chosen", filename: "second.md" },
    ],
    [
      { id: "Cafe\u0301", filename: "decomposed.md" },
      { id: "Café", filename: "composed.md" },
    ],
  ])
    assert.ok(validatePostIds(entries).some((problem) => problem.includes("重复")));
  assert.ok(
    validatePostIds([{ id: "nested/../bad", filename: "bad.md" }]).some((problem) =>
      problem.includes("无效"),
    ),
  );
  assert.deepEqual(
    validatePostIds([
      { id: "MixedCase", filename: "MixedCase.md" },
      { id: "mixedcase", filename: "mixedcase.md" },
    ]),
    [],
  );
});

test("fence language validation works inside blockquotes and list items", () => {
  for (const body of ["> ```\n> example\n> ```", "- ```\n  example\n  ```"])
    assert.ok(
      validateArticle(article(`## 嵌套代码\n\n${body}`), "post.md").some((problem) =>
        problem.includes("语言"),
      ),
    );
});
