/** Exercise the built Pagefind JS/WASM with local files, independently of a browser or network. */
import assert from "node:assert/strict";
import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Resolve macOS /var -> /private/var before checking file URL containment.
const dist = await realpath(path.resolve(process.argv[2] ?? "dist"));
// This script runs in its own process so the minimal browser globals never leak into other tests.
globalThis.document = {
  currentScript: null,
  querySelector: () => ({ getAttribute: () => "zh-CN" }),
};
globalThis.fetch = async (input) => {
  const url = new URL(String(input), pathToFileURL(`${dist}/`));
  assert.equal(url.protocol, "file:", "Pagefind offline test must never make network requests");
  const filename = fileURLToPath(url);
  assert.ok(
    filename.startsWith(`${dist}${path.sep}`),
    "Pagefind fetch escaped the build directory",
  );
  return new Response(await readFile(filename), {
    headers: {
      "content-type":
        filename.endsWith(".wasm") || filename.includes("wasm.")
          ? "application/wasm"
          : "application/octet-stream",
    },
  });
};
const pagefind = await import(pathToFileURL(path.join(dist, "pagefind/pagefind.js")));
await pagefind.options({ baseUrl: "/" });
try {
  const query = async (term) =>
    Promise.all((await pagefind.search(term)).results.map((result) => result.data()));
  const writing = await query("工程");
  assert.ok(
    writing.some((result) => result.url === "/blog/modern-se/"),
    "Chinese 工程 query did not return the software engineering article",
  );
  const allResults = [...writing];
  for (const [term, expected] of [
    ["Markdown", "/blog/markdown-101/"],
    ["SDLC", "/blog/the-ai-native-sdlc-playbook/"],
  ]) {
    const results = await query(term);
    assert.ok(
      results.some((result) => result.url === expected),
      `Search omitted ${expected}`,
    );
    allResults.push(...results);
  }
  for (const term of ["为什么我决定开始写博客", "merge", "简单即是美"]) {
    for (const result of await query(term))
      assert.ok(
        !/\/blog\/(?:why-write-blog|git-merge-vs-rebase|translated-simplicity)\//.test(result.url),
      );
  }
  const hasFixtures = await access(path.join(dist, "blog/__regression__/中文路径/index.html")).then(
    () => true,
    (error) => {
      if (error.code === "ENOENT") return false;
      throw error;
    },
  );
  if (hasFixtures) {
    for (const [term, expected] of [
      ["中文路径", "/blog/__regression__/%E4%B8%AD%E6%96%87%E8%B7%AF%E5%BE%84/"],
      ["Unicode", "/blog/__regression__/Caf%C3%A9/"],
      ["显式", "/blog/__regression__/Custom/%E6%98%BE%E5%BC%8F%E8%B7%AF%E5%BE%84/"],
    ]) {
      const results = await query(term);
      assert.ok(
        results.some(
          (result) => new URL(result.url, "https://guog.github.io").pathname === expected,
        ),
        `Search ${term} omitted canonical fixture URL ${expected}`,
      );
      allResults.push(...results);
    }
  }
  // A quoted phrase avoids Pagefind matching the real article term "Draft PR".
  assert.equal(
    (await query('"DraftInvisibleSentinel"')).length,
    0,
    "Draft content leaked into Pagefind",
  );
  for (const result of allResults) {
    const url = new URL(result.url, "https://guog.github.io");
    assert.equal(url.origin, "https://guog.github.io");
    await access(path.join(dist, decodeURIComponent(url.pathname), "index.html"));
  }
  console.log(
    "Pagefind JS/WASM OK: Chinese queries return existing canonical article URLs; draft sentinel is absent.",
  );
} finally {
  await pagefind.destroy();
}
