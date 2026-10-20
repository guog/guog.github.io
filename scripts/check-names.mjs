#!/usr/bin/env node
/** Validate public blog content names, leaving Astro and engineering files out of scope. */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizePostId } from "../src/utils/blog.ts";
import { parseArticle } from "./check-content.mjs";

export const contentRoots = ["src/content/blog/", "public/images/"];
const segmentPattern = /^[a-z][a-z0-9-]*$/;

export function validateNames(files) {
  const problems = new Set();
  for (const file of files) {
    const root = contentRoots.find((prefix) => file.startsWith(prefix));
    if (!root) continue;
    const segments = file.slice(root.length).split("/");
    for (const [index, name] of segments.entries()) {
      const pattern =
        index === segments.length - 1 ? /^[a-z][a-z0-9-]*(?:\.[a-z0-9]+)?$/ : segmentPattern;
      if (!pattern.test(name)) problems.add(root + segments.slice(0, index + 1).join("/"));
    }
  }
  return [...problems].sort();
}

export function validateArticleId(id) {
  try {
    return normalizePostId(id)
      .split("/")
      .every((segment) => segmentPattern.test(segment));
  } catch {
    return false;
  }
}

export async function checkNames(root = process.cwd()) {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const problems = validateNames(files);
  for (const file of files.filter(
    (file) => file.startsWith(contentRoots[0]) && /\.mdx?$/.test(file),
  )) {
    const { data } = parseArticle(await readFile(path.join(root, file), "utf8"), file);
    const id = data.slug ?? file.slice(contentRoots[0].length).replace(/\.mdx?$/, "");
    if (!validateArticleId(id))
      problems.push(`${file}: published slug must use lowercase English names (${id})`);
  }
  return {
    problems,
    files: files.filter((file) => contentRoots.some((root) => file.startsWith(root))).length,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkNames();
  if (result.problems.length) {
    console.error(`Noncompliant blog content paths:\n${result.problems.join("\n")}`);
    process.exitCode = 1;
  } else
    console.log(
      `Naming OK: ${result.files} tracked content files, their directories and article slugs.`,
    );
}
