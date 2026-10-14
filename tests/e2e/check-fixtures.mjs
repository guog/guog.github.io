import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "parse5";
import { walk } from "../../scripts/check-content.mjs";

const attribute = (node, name) => node.attrs?.find((attr) => attr.name === name)?.value;
const hasClass = (node, name) => attribute(node, "class")?.split(/\s+/).includes(name);
const find = (root, predicate) => {
  const result = [];
  walk(root, (node) => {
    if (predicate(node)) result.push(node);
  });
  return result;
};
const text = (root) =>
  find(root, (node) => node.nodeName === "#text")
    .map((node) => node.value)
    .join("");

export async function checkFixtureArtifacts(dist) {
  const document = parse(
    await readFile(path.join(dist, "blog/__regression__/nested/MixedCase/index.html"), "utf8"),
  );
  assert.equal(
    text(find(document, (node) => attribute(node, "data-testid") === "mdx-proof")[0]),
    "MDX 运算结果：42",
  );
  const blocks = find(document, (node) => hasClass(node, "expressive-code"));
  const titled = (title) => {
    const block = blocks.find((node) =>
      find(node, (child) => hasClass(child, "title")).some((child) => text(child) === title),
    );
    assert.ok(block, `Missing Expressive Code block ${title}`);
    return block;
  };
  const numbers = (title) => find(titled(title), (node) => hasClass(node, "ln")).map(text);
  assert.deepEqual(numbers("example.ts"), ["1", "2", "3"]);
  assert.deepEqual(numbers("commands.sh"), []);
  assert.deepEqual(numbers("offset.py"), ["42", "43"]);
  assert.deepEqual(numbers("component.ts"), ["1", "2"]);
  assert.equal(find(titled("example.ts"), (node) => hasClass(node, "highlight")).length, 1);
  const copied = (title) =>
    attribute(
      find(
        titled(title),
        (node) => node.tagName === "button" && attribute(node, "data-code") !== undefined,
      )[0],
      "data-code",
    ).replaceAll("\x7f", "\n");
  assert.equal(
    copied("example.ts"),
    `function greet(name: string): string {\n  return \`你好，\${name}\`;\n}`,
  );
  assert.equal(copied("offset.py"), 'def greet(name: str) -> str:\n    return f"你好，{name}"');
  assert.equal(find(document, (node) => node.tagName === "table").length, 1);
  assert.ok(
    find(document, (node) => node.tagName === "nav" && attribute(node, "aria-label") === "文章目录")
      .length,
  );
  console.log(
    "Fixture render OK: MDX, default/disabled/offset/shared Code line numbers, line highlight, copy payload, table and Chinese TOC.",
  );
}
