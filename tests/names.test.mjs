import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkNames, validateArticleId, validateNames } from "../scripts/check-names.mjs";

test("blog content names use lowercase English, digits and hyphens with a leading letter", () => {
  assert.deepEqual(
    validateNames(["public/images/markdown-workflow.jpg", "src/content/blog/markdown-101.md"]),
    [],
  );
  for (const name of [
    "中文.jpg",
    "MixedCase.png",
    "00-cover.jpg",
    "a_b.png",
    "a b.png",
    "image.backup.jpg",
  ])
    assert.deepEqual(validateNames([`public/images/${name}`]), [`public/images/${name}`]);
  assert.deepEqual(validateNames(["public/images/Bad/file.jpg", "src/content/blog/a.b/file.md"]), [
    "public/images/Bad",
    "src/content/blog/a.b",
  ]);
});

test("Astro, engineering documentation and special-path test fixtures are out of scope", () => {
  assert.deepEqual(
    validateNames([
      "AGENTS.md",
      "docs/CONTENT.md",
      "src/components/BaseHead.astro",
      "src/pages/404.astro",
      "src/pages/blog/[...slug].astro",
      "tests/fixtures/content/Cafe\u0301.md",
      "tests/fixtures/content/nested/MixedCase.mdx",
    ]),
    [],
  );
});

test("published article slugs cannot bypass the readable URL naming rule", () => {
  for (const id of ["markdown-101", "guides/markdown-workflow"])
    assert.equal(validateArticleId(id), true);
  for (const id of [
    "中文",
    "MixedCase",
    "00-guide",
    "some_name",
    "a//b",
    "../guide",
    "percent%20",
    "guide.name",
  ])
    assert.equal(validateArticleId(id), false, id);
});

test("all Git-managed production content files and published slugs comply", async () => {
  const result = await checkNames(fileURLToPath(new URL("../", import.meta.url)));
  assert.deepEqual(result.problems, [], result.problems.join("\n"));
});
