/** One ID policy shared with the content loader and all public URL producers. */
export function normalizePostId(id: string): string {
  const normalized = id.normalize("NFC");
  const invalidCharacter = [...normalized].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 || "%?#\\".includes(character);
  });
  if (
    invalidCharacter ||
    normalized.split("/").some((part) => !part.trim() || part === "." || part === "..")
  ) {
    throw new Error(`Invalid article ID: ${JSON.stringify(id)}`);
  }
  return normalized;
}

/** Preserve case/nesting; encode Unicode at the public URL boundary. */
export function getPostUrl(id: string): string {
  return `/blog/${normalizePostId(id).split("/").map(encodeURIComponent).join("/")}/`;
}

export function getReadingMinutes(body = ""): number {
  const chineseCharacters = body.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = body.replace(/[\u3400-\u9fff]/g, " ").match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(chineseCharacters / 400 + words / 200));
}

export function getTaxonomyId(kind: "tag" | "category", value: string): string {
  return `${kind}-${value}`;
}
